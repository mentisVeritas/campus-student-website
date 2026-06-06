import PageHeader from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import ScheduleManager from "./ScheduleManager";

export default async function AdminSchedulePage() {
  const [schedule, classes, subjects, teachers] = await Promise.all([
    prisma.scheduleItem.findMany({
      include: {
        class: { select: { id: true, name: true, year: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ class: { name: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.class.findMany({
      select: { id: true, name: true, year: true },
      orderBy: [{ year: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
        subjects: { select: { subjectId: true } },
      },
      orderBy: { employeeId: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Schedule" description="Cross-class timetable overview for administration." />
      <ScheduleManager
        initialRows={schedule}
        classes={classes.map((item) => ({ id: item.id, label: `${item.name} (Year ${item.year})` }))}
        subjects={subjects.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` }))}
        teachers={teachers.map((item) => ({
          id: item.id,
          label: `${item.user.firstName} ${item.user.lastName}`,
          subjectIds: item.subjects.map((entry) => entry.subjectId),
        }))}
      />
    </div>
  );
}
