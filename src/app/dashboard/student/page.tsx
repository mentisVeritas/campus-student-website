import { DayOfWeek } from "@prisma/client";
import { Bell, CalendarDays, FileText, GraduationCap } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import GradeBar from "@/components/ui/GradeBar";
import StatCard from "@/components/ui/StatCard";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

function todayDayOfWeek(): DayOfWeek | null {
  const day = new Date().getDay();
  const map: Record<number, DayOfWeek> = {
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
  };
  return map[day] ?? null;
}

export default async function StudentDashboardPage() {
  const { user } = await requireCurrentUser();
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });

  if (!student) {
    return <EmptyState icon="🎓" title="No student profile" description="Ask admin to assign your student profile." />;
  }

  const recentGradeRows = await prisma.grade.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true } } },
    orderBy: { gradedAt: "desc" },
    take: 50,
  });
  const recentGrades = Array.from(
    new Map(recentGradeRows.map((grade) => [grade.subjectId, grade])).values(),
  ).slice(0, 5);
  const documentsCount = await prisma.documentRequest.count({
    where: {
      requesterUserId: user.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  const dow = todayDayOfWeek();
  const scheduleToday =
    student.classId && dow
      ? await prisma.scheduleItem.findMany({
          where: {
            classId: student.classId,
            dayOfWeek: dow,
          },
          include: { subject: true },
          orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
        })
      : [];
  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ targetRole: "STUDENT" }, { targetRole: null }] },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 3,
  });

  const allGrades = await prisma.grade.findMany({ where: { studentId: student.id }, select: { score: true } });
  const average = allGrades.length
    ? Number((allGrades.reduce((sum, g) => sum + g.score, 0) / allGrades.length).toFixed(1))
    : 0;

  return (
    <div className="space-y-4">
      <PageHeader title={`Good morning, ${user.firstName} 👋`} description={new Date().toDateString()} />

      <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Overview</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {student.class?.name ?? "Class not assigned"}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {scheduleToday.length} {scheduleToday.length === 1 ? "class" : "classes"} scheduled for today
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-600 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Average score</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{average}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="transition-transform hover:-translate-y-0.5">
          <StatCard label="Classes Today" value={scheduleToday.length} accentClass="border-l-indigo-500" icon={<CalendarDays className="h-4 w-4" />} />
        </div>
        <div className="transition-transform hover:-translate-y-0.5">
          <StatCard label="Average Score" value={average} accentClass="border-l-emerald-500" icon={<GraduationCap className="h-4 w-4" />} />
        </div>
        <div className="transition-transform hover:-translate-y-0.5">
          <StatCard label="Active Requests" value={documentsCount} accentClass="border-l-amber-500" icon={<FileText className="h-4 w-4" />} />
        </div>
        <div className="transition-transform hover:-translate-y-0.5">
          <StatCard label="Unread Notifications" value={unread} accentClass="border-l-rose-500" icon={<Bell className="h-4 w-4" />} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Today Schedule</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {scheduleToday.length} classes
            </span>
          </div>
          {scheduleToday.length ? (
            <div className="mt-3 space-y-3">
              {scheduleToday.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm ring-1 ring-slate-900/5 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:ring-white/5 dark:hover:border-indigo-500"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.subject.name}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {item.startTime} – {item.endTime} • Room {item.room}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📅" title="No classes today" description="Enjoy your free day or check weekly schedule." />
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent grades</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Latest by date</span>
          </div>
          <div className="mt-3 space-y-3">
            {recentGrades.map((grade) => (
              <div key={grade.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/60">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{grade.subject.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{grade.type.replace(/_/g, " ")}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-bold tabular-nums text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600">
                    {grade.score}
                  </span>
                </div>
                <GradeBar score={grade.score} />
              </div>
            ))}
            {!recentGrades.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No grades yet. New grades will appear here.</p>
            ) : null}
          </div>
        </article>
      </section>

      <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Latest Announcements</h3>
          <Link href="/dashboard/student/announcements" className="text-sm text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/20"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {announcement.isPinned ? "📌 " : ""}
                {announcement.title}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{announcement.content}</p>
            </div>
          ))}
          {!announcements.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No announcements for now.</p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
