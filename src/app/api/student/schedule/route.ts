import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) {
    return fail("Forbidden", 403);
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { classId: true, class: { select: { year: true } } },
  });
  if (!student?.classId) {
    return fail("Student class not assigned", 404);
  }

  const schedule = await prisma.scheduleItem.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const slotKeys = new Set(
    schedule.map((item) => `${item.dayOfWeek}__${item.startTime}__${item.endTime}__${item.subjectId}__${item.teacherId}__${item.room}`),
  );
  const sameYearRows = await prisma.scheduleItem.findMany({
    where: {
      class: { year: student.class?.year ?? -1 },
      classId: { not: student.classId },
    },
    include: {
      class: { select: { name: true, year: true } },
    },
  });
  const sharedWithByKey = new Map<string, string[]>();
  for (const row of sameYearRows) {
    const key = `${row.dayOfWeek}__${row.startTime}__${row.endTime}__${row.subjectId}__${row.teacherId}__${row.room}`;
    if (!slotKeys.has(key)) continue;
    const current = sharedWithByKey.get(key) ?? [];
    const label = `${row.class.name} (Year ${row.class.year})`;
    if (!current.includes(label)) {
      current.push(label);
      sharedWithByKey.set(key, current);
    }
  }

  return ok(
    schedule.map((item) => ({
      id: item.id,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      changeNote: item.changeNote,
      subject: item.subject.name,
      teacherName: `${item.teacher.user.firstName} ${item.teacher.user.lastName}`,
      isSharedLesson:
        (sharedWithByKey.get(
          `${item.dayOfWeek}__${item.startTime}__${item.endTime}__${item.subjectId}__${item.teacherId}__${item.room}`,
        )?.length ?? 0) > 0,
      sharedWithLabel:
        sharedWithByKey
          .get(`${item.dayOfWeek}__${item.startTime}__${item.endTime}__${item.subjectId}__${item.teacherId}__${item.room}`)
          ?.join(", ") ?? null,
    })),
  );
}
