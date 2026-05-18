import { NextRequest } from "next/server";
import { DayOfWeek } from "@prisma/client";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { getTeacherClassIds, getTeacherSubjectIds } from "@/lib/teacher-access";
import { prisma } from "@/lib/prisma";

function toWeekday(date: Date): DayOfWeek | null {
  const map: Record<number, DayOfWeek> = {
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
  };
  return map[date.getDay()] ?? null;
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["TEACHER"])) return fail("Forbidden", 403);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!teacher) return fail("Teacher profile not found", 404);

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);
  const weekday = toWeekday(date);
  if (!weekday) return ok([]);

  const [allowedClassIds, allowedSubjectIds] = await Promise.all([
    getTeacherClassIds(teacher.id),
    getTeacherSubjectIds(teacher.id),
  ]);
  if (!allowedClassIds.length || !allowedSubjectIds.length) return ok([]);

  const sessions = await prisma.scheduleItem.findMany({
    where: {
      teacherId: teacher.id,
      dayOfWeek: weekday,
      classId: { in: allowedClassIds },
      subjectId: { in: allowedSubjectIds },
    },
    include: {
      class: { include: { students: { select: { id: true } } } },
      subject: { select: { name: true } },
      attendances: { where: { date }, select: { id: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return ok(
    sessions.map((item) => ({
      scheduleItemId: item.id,
      classId: item.classId,
      className: item.class.name,
      subjectName: item.subject.name,
      room: item.room,
      startTime: item.startTime,
      endTime: item.endTime,
      totalStudents: item.class.students.length,
      filledCount: item.attendances.length,
      filled: item.attendances.length === item.class.students.length && item.class.students.length > 0,
    })),
  );
}
