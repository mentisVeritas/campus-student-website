import { FileText, School, Users, UserSquare2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { prisma } from "@/lib/prisma";
import AdminQuickActions from "./AdminQuickActions";

export default async function AdminDashboardPage() {
  const [students, teachers, classes, pendingDocs, latestUsers] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.documentRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Dashboard" description="Campus operations and system health overview." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={students} accentClass="border-l-indigo-500" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Teachers" value={teachers} accentClass="border-l-emerald-500" icon={<UserSquare2 className="h-4 w-4" />} />
        <StatCard label="Classes" value={classes} accentClass="border-l-amber-500" icon={<School className="h-4 w-4" />} />
        <StatCard label="Pending Requests" value={pendingDocs} accentClass="border-l-rose-500" icon={<FileText className="h-4 w-4" />} />
      </section>
      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Users</h3>
        <div className="mt-3 space-y-2">
          {latestUsers.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.firstName} {item.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.email}</p>
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.role}</p>
            </div>
          ))}
        </div>
      </article>
      <AdminQuickActions />
    </div>
  );
}
