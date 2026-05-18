import { NextRequest } from "next/server";
import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { parseIsoDateUtcCalendar } from "@/lib/parse-local-date";
import { prisma } from "@/lib/prisma";
import { assertTeacherClassAccess, assertTeacherSubjectAccess, ForbiddenError } from "@/lib/teacher-access";

const schema = z.object({
  scheduleItemId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().max(300).nullable().optional(),
});

async function ensureTeacherCellAccess(teacherInternalId: string, scheduleItemId: string) {
  const scheduleItem = await prisma.scheduleItem.findUnique({
    where: { id: scheduleItemId },
    include: { class: { include: { students: { select: { id: true } } } } },
  });
  if (!scheduleItem) return { ok: false as const, response: fail("Schedule item not found", 404) };
  try {
    await assertTeacherClassAccess(teacherInternalId, scheduleItem.classId);
    await assertTeacherSubjectAccess(teacherInternalId, scheduleItem.subjectId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false as const, response: fail(error.message, 403) };
    throw error;
  }
  return { ok: true as const, scheduleItem };
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const gate = await ensureTeacherCellAccess(teacher.id, parsed.data.scheduleItemId);
  if (!gate.ok) return gate.response;
  const scheduleItem = gate.scheduleItem;

  const inClass = scheduleItem.class.students.some((item) => item.id === parsed.data.studentId);
  if (!inClass) return fail("Student is not in this class", 400);

  const date = parseIsoDateUtcCalendar(parsed.data.date);
  if (!date) return fail("Invalid date", 400);

  const row = await prisma.attendance.upsert({
    where: {
      studentId_scheduleItemId_date: {
        studentId: parsed.data.studentId,
        scheduleItemId: parsed.data.scheduleItemId,
        date,
      },
    },
    update: {
      status: parsed.data.status,
      note: parsed.data.note ?? null,
      teacherId: scheduleItem.teacherId,
      classId: scheduleItem.classId,
      subjectId: scheduleItem.subjectId,
    },
    create: {
      studentId: parsed.data.studentId,
      scheduleItemId: parsed.data.scheduleItemId,
      teacherId: scheduleItem.teacherId,
      classId: scheduleItem.classId,
      subjectId: scheduleItem.subjectId,
      date,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
    },
    select: { id: true },
  });

  return ok({ attendanceId: row.id });
}

export async function DELETE(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const scheduleItemId = request.nextUrl.searchParams.get("scheduleItemId");
  const studentId = request.nextUrl.searchParams.get("studentId");
  const dateStr = request.nextUrl.searchParams.get("date");
  if (!scheduleItemId || !studentId || !dateStr?.match(/^\d{4}-\d{2}-\d{2}$/)) return fail("Invalid query", 400);

  const gate = await ensureTeacherCellAccess(teacher.id, scheduleItemId);
  if (!gate.ok) return gate.response;

  const date = parseIsoDateUtcCalendar(dateStr);
  if (!date) return fail("Invalid date", 400);

  await prisma.attendance.deleteMany({
    where: {
      studentId,
      scheduleItemId,
      date,
    },
  });

  return ok({ deleted: true });
}
