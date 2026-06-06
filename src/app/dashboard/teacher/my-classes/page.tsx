import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export default async function TeacherMyClassesPage() {
  const { user } = await requireCurrentUser();
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!teacher) {
    return <EmptyState icon="👨‍🏫" title="No teacher profile" description="Teacher profile is not configured yet." />;
  }

  const classes = await prisma.classTeacher.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: { include: { students: { select: { id: true } } } },
    },
    orderBy: { class: { name: "asc" } },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="My Classes" description="Open a class to review roster and enter grades." />
      {!classes.length ? (
        <EmptyState icon="🏫" title="No classes assigned" description="Admin should assign classes to your account." />
      ) : (
        <DataTable headers={["Class", "Year", "Students", "Role", "Action"]}>
          {classes.map((item) => (
            <tr key={item.classId} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.class.name}</td>
              <td className="px-4 py-3">{item.class.year}</td>
              <td className="px-4 py-3">{item.class.students.length}</td>
              <td className="px-4 py-3">{item.isHomeroom ? "Homeroom" : "Subject Teacher"}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/teacher/my-classes/${item.classId}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open class
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
