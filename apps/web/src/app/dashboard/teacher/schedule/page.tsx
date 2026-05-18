import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import WeeklyScheduleBoard from "@/components/ui/WeeklyScheduleBoard";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

type GroupedRow = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  changeNote: string | null;
  classNames: string[];
};

export default async function TeacherSchedulePage() {
  const { user } = await requireCurrentUser();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!teacher) {
    return <EmptyState icon="📅" title="No teacher profile" description="Admin should assign a teacher profile first." />;
  }

  const rows = await prisma.scheduleItem.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: { select: { name: true, year: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { class: { name: "asc" } }],
  });

  const grouped = new Map<string, GroupedRow>();
  for (const row of rows) {
    const key = `${row.dayOfWeek}__${row.startTime}__${row.endTime}__${row.subjectId}__${row.room}`;
    const existing = grouped.get(key);
    const classLabel = `${row.class.name} (Year ${row.class.year})`;

    if (!existing) {
      grouped.set(key, {
        id: row.id,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        subject: row.subject.name,
        room: row.room,
        changeNote: row.changeNote,
        classNames: [classLabel],
      });
      continue;
    }

    if (!existing.classNames.includes(classLabel)) {
      existing.classNames.push(classLabel);
    }
  }

  const schedule = Array.from(grouped.values()).sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek.localeCompare(b.dayOfWeek);
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Schedule" description="Weekly board with subject, class groups, room, and time slots." />
      {schedule.length ? (
        <WeeklyScheduleBoard
          showSharedLabel={false}
          items={schedule.map((item) => ({
            id: item.id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            subject: item.subject,
            classLabel: `Group: ${item.classNames.join(", ")}`,
            room: item.room,
            changeNote: item.changeNote,
            isSharedLesson: item.classNames.length > 1,
            sharedWithLabel: item.classNames.length > 1 ? item.classNames.join(", ") : null,
          }))}
        />
      ) : (
        <EmptyState icon="📅" title="No schedule available" description="No lessons are assigned to you yet." />
      )}
    </div>
  );
}
