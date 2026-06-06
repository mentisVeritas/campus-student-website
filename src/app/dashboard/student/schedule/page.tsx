import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import WeeklyScheduleBoard from "@/components/ui/WeeklyScheduleBoard";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export default async function StudentSchedulePage() {
  const { user } = await requireCurrentUser();
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { classId: true, class: { select: { year: true } } },
  });
  if (!student?.classId) {
    return <EmptyState icon="🗓" title="No class assigned" description="Admin needs to assign you to a class." />;
  }

  const schedule = await prisma.scheduleItem.findMany({
    where: { classId: student.classId },
    include: {
      subject: true,
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

  return (
    <div className="space-y-4">
      <PageHeader title="Schedule" description="Weekly timetable with room and change notes." />
      {schedule.length ? (
        <WeeklyScheduleBoard
          items={schedule.map((item) => ({
            id: item.id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            subject: item.subject.name,
            teacherName: `${item.teacher.user.firstName} ${item.teacher.user.lastName}`,
            room: item.room,
            changeNote: item.changeNote,
            isSharedLesson:
              (sharedWithByKey.get(
                `${item.dayOfWeek}__${item.startTime}__${item.endTime}__${item.subjectId}__${item.teacherId}__${item.room}`,
              )?.length ?? 0) > 0,
            sharedWithLabel:
              sharedWithByKey
                .get(`${item.dayOfWeek}__${item.startTime}__${item.endTime}__${item.subjectId}__${item.teacherId}__${item.room}`)
                ?.join(", ") ?? null,
          }))}
        />
      ) : (
        <EmptyState icon="📅" title="No schedule available" description="Schedule has not been published yet." />
      )}
    </div>
  );
}
