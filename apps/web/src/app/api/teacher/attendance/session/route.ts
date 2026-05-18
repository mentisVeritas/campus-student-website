import { AttendanceStatus, NotificationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { assertTeacherClassAccess, assertTeacherSubjectAccess, ForbiddenError } from "@/lib/teacher-access";

const postSchema = z.object({
  scheduleItemId: z.string().min(1),
  date: z.string(),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.nativeEnum(AttendanceStatus),
      note: z.string().max(300).optional(),
    }),
  ),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const scheduleItemId = request.nextUrl.searchParams.get("scheduleItemId");
  const dateParam = request.nextUrl.searchParams.get("date");
  if (!scheduleItemId || !dateParam) return fail("scheduleItemId and date are required", 400);
  const date = new Date(dateParam);
  date.setHours(0, 0, 0, 0);

  const scheduleItem = await prisma.scheduleItem.findUnique({
    where: { id: scheduleItemId },
    include: {
      class: {
        include: {
          students: {
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { studentCode: "asc" },
          },
        },
      },
      attendances: { where: { date } },
    },
  });
  if (!scheduleItem) return fail("Session not found", 404);
  if (scheduleItem.teacherId !== teacher.id) return fail("Forbidden", 403);

  try {
    await assertTeacherClassAccess(teacher.id, scheduleItem.classId);
    await assertTeacherSubjectAccess(teacher.id, scheduleItem.subjectId);
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(error.message, 403);
    throw error;
  }

  return ok(
    scheduleItem.class.students.map((student) => {
      const record = scheduleItem.attendances.find((item) => item.studentId === student.id);
      return {
        studentId: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        status: record?.status ?? null,
        note: record?.note ?? null,
        attendanceId: record?.id ?? null,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const date = new Date(parsed.data.date);
  date.setHours(0, 0, 0, 0);

  const scheduleItem = await prisma.scheduleItem.findUnique({
    where: { id: parsed.data.scheduleItemId },
    include: { class: { include: { students: { select: { id: true } } } } },
  });
  if (!scheduleItem) return fail("Session not found", 404);
  if (scheduleItem.teacherId !== teacher.id) return fail("Forbidden", 403);

  try {
    await assertTeacherClassAccess(teacher.id, scheduleItem.classId);
    await assertTeacherSubjectAccess(teacher.id, scheduleItem.subjectId);
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(error.message, 403);
    throw error;
  }

  const classStudentIds = new Set(scheduleItem.class.students.map((item) => item.id));
  for (const record of parsed.data.records) {
    if (!classStudentIds.has(record.studentId)) return fail("Student out of class scope", 403);
  }

  await Promise.all(
    parsed.data.records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_scheduleItemId_date: {
            studentId: record.studentId,
            scheduleItemId: parsed.data.scheduleItemId,
            date,
          },
        },
        update: {
          status: record.status,
          note: record.note,
          teacherId: teacher.id,
        },
        create: {
          studentId: record.studentId,
          scheduleItemId: parsed.data.scheduleItemId,
          teacherId: teacher.id,
          classId: scheduleItem.classId,
          subjectId: scheduleItem.subjectId,
          date,
          status: record.status,
          note: record.note,
        },
      }),
    ),
  );

  const absentStudentIds = parsed.data.records.filter((r) => r.status === "ABSENT").map((r) => r.studentId);
  if (absentStudentIds.length) {
    const streakCandidates = await prisma.student.findMany({
      where: { id: { in: absentStudentIds } },
      select: {
        id: true,
        userId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    await Promise.all(
      streakCandidates.map(async (student) => {
        const recentAbsents = await prisma.attendance.findMany({
          where: {
            studentId: student.id,
            subjectId: scheduleItem.subjectId,
            status: "ABSENT",
            date: { lte: date },
          },
          orderBy: { date: "desc" },
          take: 3,
        });
        if (recentAbsents.length === 3) {
          const dayDiff1 =
            (recentAbsents[0].date.getTime() - recentAbsents[1].date.getTime()) / (1000 * 60 * 60 * 24);
          const dayDiff2 =
            (recentAbsents[1].date.getTime() - recentAbsents[2].date.getTime()) / (1000 * 60 * 60 * 24);
          if (dayDiff1 <= 7 && dayDiff2 <= 7) {
            await createNotification(
              student.userId,
              NotificationType.ATTENDANCE_MISS,
              "Attendance warning",
              "You have 3 absences in a row.",
              "/dashboard/student/attendance",
            );
          }
        }
      }),
    );
  }

  return ok({ saved: true, total: parsed.data.records.length });
}
