import Avatar from "@/components/ui/Avatar";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import ProfileActionsPanel from "@/app/dashboard/profile/ProfileActionsPanel";

export default async function TeacherProfilePage() {
  const { user } = await requireCurrentUser();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      subjects: { include: { subject: { select: { name: true } } } },
      classes: { include: { class: { select: { name: true } } } },
    },
  });

  if (!teacher) {
    redirect("/dashboard/profile");
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const subjectNames = teacher.subjects.map((item) => item.subject.name).sort((a, b) => a.localeCompare(b));
  const classNames = teacher.classes.map((item) => item.class.name).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Manage your profile and teaching account settings." />

      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={fullName} />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{fullName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Employee ID</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{teacher.employeeId}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Department</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{teacher.department}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Subjects</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {subjectNames.length ? subjectNames.join(", ") : "Not assigned"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Groups</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {classNames.length ? classNames.join(", ") : "Not assigned"}
            </p>
          </div>
        </div>
      </article>

      <ProfileActionsPanel initialFirstName={user.firstName} initialLastName={user.lastName} email={user.email} />
    </div>
  );
}
