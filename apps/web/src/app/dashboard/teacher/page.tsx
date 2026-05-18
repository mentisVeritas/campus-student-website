import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export default async function TeacherPage() {
  const { user } = await requireCurrentUser();
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: { classes: { include: { class: true } } },
  });

  if (!teacher) {
    return <EmptyState icon="👨‍🏫" title="No teacher profile" description="Admin should assign a teacher profile first." />;
  }

  const classIds = teacher.classes.map((item) => item.classId);
  const [gradesCount, announcementsCount] = await Promise.all([
    prisma.grade.count({ where: { teacherId: teacher.id } }),
    prisma.announcement.count({ where: { teacherId: teacher.id } }),
  ]);

  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    include: { students: { select: { id: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher Dashboard" description="Your classes, students, and grading activity." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="My Classes" value={classes.length} accentClass="border-l-indigo-500" />
        <StatCard label="Grades Submitted" value={gradesCount} accentClass="border-l-emerald-500" />
        <StatCard label="Announcements" value={announcementsCount} accentClass="border-l-amber-500" />
      </section>
      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">My Classes</h3>
          <Link href="/dashboard/teacher/my-classes" className="text-sm text-indigo-600 hover:text-indigo-700">
            Open all
          </Link>
        </div>
        <div className="space-y-2">
          {classes.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Year {item.year} • {item.students.length} students
              </p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
