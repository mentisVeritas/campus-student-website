import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/layout/PageHeader";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import ProfileActions from "./ProfileActions";

export default async function StudentProfilePage() {
  const { user } = await requireCurrentUser();
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      class: true,
    },
  });

  if (!student) {
    redirect("/dashboard/profile");
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Update and review your personal details." />
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
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Student Code</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{student.studentCode}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Class</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{student.class?.name ?? "N/A"}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Year</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{student.year}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{user.phone ?? "Not specified"}</p>
          </div>
        </div>
      </article>
      <ProfileActions />
    </div>
  );
}
