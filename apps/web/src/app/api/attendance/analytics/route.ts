import { AttendanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  assertTeacherClassAccess,
  assertTeacherSubjectAccess,
  ForbiddenError,
  getTeacherSubjectIds,
} from "@/lib/teacher-access";

const updateSchema = z.object({
  attendanceId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().max(300).nullable().optional(),
});

type Bucket = {
  total: number;
  present: number;
  absent: number;
  late: number;
};

function emptyBucket(): Bucket {
  return { total: 0, present: 0, absent: 0, late: 0 };
}

function addStatus(bucket: Bucket, status: AttendanceStatus) {
  bucket.total += 1;
  if (status === "PRESENT") bucket.present += 1;
  if (status === "ABSENT") bucket.absent += 1;
  if (status === "LATE") bucket.late += 1;
}

function withRate<T extends Bucket>(entry: T) {
  const attendanceRate = entry.total ? Number((((entry.present + entry.late * 0.5) / entry.total) * 100).toFixed(1)) : 0;
  return { ...entry, attendanceRate };
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN", "TEACHER"])) return fail("Forbidden", 403);

  const courseParam = request.nextUrl.searchParams.get("course");
  const classId = request.nextUrl.searchParams.get("classId");
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const dayParam = request.nextUrl.searchParams.get("day");
  const studentId = request.nextUrl.searchParams.get("studentId");

  const course = courseParam ? Number(courseParam) : null;
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;
  const dayDate = dayParam ? new Date(dayParam) : null;
  if (dayDate) dayDate.setHours(0, 0, 0, 0);

  const teacher = session.role === "TEACHER"
    ? await prisma.teacher.findUnique({
        where: { userId: session.userId },
        select: { id: true, classes: { select: { classId: true } } },
      })
    : null;
  if (session.role === "TEACHER" && !teacher) return fail("Teacher profile not found", 404);

  const teacherClassIds = session.role === "TEACHER" ? teacher?.classes.map((item) => item.classId) ?? [] : [];

  const teacherSubjectIds =
    session.role === "TEACHER" && teacher
      ? await getTeacherSubjectIds(teacher.id)
      : [];

  if (session.role === "TEACHER" && classId && !teacherClassIds.includes(classId)) {
    return fail("Forbidden", 403);
  }

  const classScopeIds =
    classId != null && classId !== ""
      ? [classId]
      : session.role === "TEACHER"
        ? teacherClassIds
        : [];

  const groups = await prisma.class.findMany({
    where: {
      ...(course ? { year: course } : {}),
      ...(session.role === "TEACHER"
        ? { id: { in: classScopeIds.length ? classScopeIds : [] } }
        : classScopeIds.length
          ? { id: { in: classScopeIds } }
          : {}),
    },
    orderBy: [{ year: "asc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const dayStart = dayDate ? new Date(dayDate) : null;
  const dayEnd = dayDate ? new Date(dayDate) : null;
  if (dayEnd) dayEnd.setDate(dayEnd.getDate() + 1);

  const rows = await prisma.attendance.findMany({
    where: {
      ...(session.role === "TEACHER" && teacher ? { teacherId: teacher.id } : {}),
      ...(session.role === "TEACHER"
        ? teacherSubjectIds.length
          ? { subjectId: { in: teacherSubjectIds } }
          : { subjectId: { in: [] } }
        : {}),
      ...(session.role === "TEACHER"
        ? !teacherClassIds.length
          ? { classId: { in: [] } }
          : classId
            ? { classId }
            : { classId: { in: teacherClassIds } }
        : {}),
      ...(session.role === "ADMIN" && classId ? { classId } : {}),
      ...(course ? { class: { year: course } } : {}),
      ...(studentId ? { studentId } : {}),
      ...(dayStart && dayEnd
        ? { date: { gte: dayStart, lt: dayEnd } }
        : year
          ? month
            ? { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
            : { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
          : {}),
    },
    include: {
      class: { select: { id: true, name: true, year: true } },
      student: {
        select: {
          id: true,
          year: true,
          studentCode: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      subject: { select: { id: true, name: true } },
      scheduleItem: { select: { startTime: true, endTime: true, room: true } },
    },
    orderBy: [{ date: "asc" }, { scheduleItem: { startTime: "asc" } }],
  });

  const yearMap = new Map<number, Bucket>();
  const monthMap = new Map<number, Bucket>();
  const dayMap = new Map<string, Bucket>();
  const groupMap = new Map<string, Bucket & { classId: string; className: string; course: number }>();
  const studentMap = new Map<string, Bucket & { studentId: string; studentName: string; className: string; course: number }>();
  const subjectMap = new Map<string, Bucket & { subjectId: string; subjectName: string }>();

  for (const row of rows) {
    const rowYear = row.date.getFullYear();
    const rowMonth = row.date.getMonth() + 1;
    const rowDay = row.date.toISOString().slice(0, 10);

    if (!yearMap.has(rowYear)) yearMap.set(rowYear, emptyBucket());
    addStatus(yearMap.get(rowYear)!, row.status);

    if (!monthMap.has(rowMonth)) monthMap.set(rowMonth, emptyBucket());
    addStatus(monthMap.get(rowMonth)!, row.status);

    if (!dayMap.has(rowDay)) dayMap.set(rowDay, emptyBucket());
    addStatus(dayMap.get(rowDay)!, row.status);

    if (!groupMap.has(row.classId)) {
      groupMap.set(row.classId, { ...emptyBucket(), classId: row.class.id, className: row.class.name, course: row.class.year });
    }
    addStatus(groupMap.get(row.classId)!, row.status);

    if (!studentMap.has(row.studentId)) {
      studentMap.set(row.studentId, {
        ...emptyBucket(),
        studentId: row.student.id,
        studentName: `${row.student.user.firstName} ${row.student.user.lastName}`,
        className: row.class.name,
        course: row.student.year,
      });
    }
    addStatus(studentMap.get(row.studentId)!, row.status);

    if (!subjectMap.has(row.subjectId)) {
      subjectMap.set(row.subjectId, {
        ...emptyBucket(),
        subjectId: row.subject.id,
        subjectName: row.subject.name,
      });
    }
    addStatus(subjectMap.get(row.subjectId)!, row.status);
  }

  const records = rows.map((row) => ({
    attendanceId: row.id,
    date: row.date.toISOString().slice(0, 10),
    studentId: row.studentId,
    studentName: `${row.student.user.firstName} ${row.student.user.lastName}`,
    subjectId: row.subjectId,
    subjectName: row.subject.name,
    className: row.class.name,
    course: row.class.year,
    startTime: row.scheduleItem.startTime,
    endTime: row.scheduleItem.endTime,
    room: row.scheduleItem.room,
    status: row.status,
    note: row.note,
  }));

  return ok({
    filters: {
      course,
      classId,
      year,
      month,
      day: dayParam,
      studentId,
    },
    groups,
    courses: Array.from(new Set(groups.map((item) => item.year))).sort((a, b) => a - b),
    yearSummary: Array.from(yearMap.entries())
      .map(([value, bucket]) => withRate({ year: value, ...bucket }))
      .sort((a, b) => a.year - b.year),
    monthSummary: Array.from(monthMap.entries())
      .map(([value, bucket]) => withRate({ month: value, ...bucket }))
      .sort((a, b) => a.month - b.month),
    daySummary: Array.from(dayMap.entries())
      .map(([value, bucket]) => withRate({ day: value, ...bucket }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    groupSummary: Array.from(groupMap.values()).map((bucket) => withRate(bucket)).sort((a, b) => a.className.localeCompare(b.className)),
    studentSummary: Array.from(studentMap.values()).map((bucket) => withRate(bucket)).sort((a, b) => a.studentName.localeCompare(b.studentName)),
    subjectSummary: Array.from(subjectMap.values()).map((bucket) => withRate(bucket)).sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    records,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN", "TEACHER"])) return fail("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const existing = await prisma.attendance.findUnique({
    where: { id: parsed.data.attendanceId },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      teacher: { select: { userId: true, id: true } },
    },
  });
  if (!existing) return fail("Attendance record not found", 404);

  if (session.role === "TEACHER") {
    if (existing.teacher.userId !== session.userId) {
      return fail("Forbidden", 403);
    }
    try {
      await assertTeacherClassAccess(existing.teacher.id, existing.classId);
      await assertTeacherSubjectAccess(existing.teacher.id, existing.subjectId);
    } catch (error) {
      if (error instanceof ForbiddenError) return fail(error.message, 403);
      throw error;
    }
  }

  await prisma.attendance.update({
    where: { id: parsed.data.attendanceId },
    data: {
      status: parsed.data.status,
      note: parsed.data.note ?? null,
    },
  });

  return ok({ updated: true });
}
