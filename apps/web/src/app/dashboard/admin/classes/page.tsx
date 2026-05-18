import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import ClassActionsButton from "./ClassActionsButton";
import CreateClassButton from "./CreateClassButton";

export default async function AdminClassesPage() {
  const classes = await prisma.class.findMany({
    include: {
      students: { select: { id: true } },
      teachers: {
        where: { isHomeroom: true },
        include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
    orderBy: [{ year: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Classes"
        description="Manage class groups, students, and teacher assignments."
        action={<CreateClassButton />}
      />
      {!classes.length ? (
        <EmptyState icon="🏫" title="No classes yet" description='Click "New class" above to create a group.' />
      ) : (
        <DataTable headers={["Name", "Year", "Homeroom Teacher", "Students", "Details", "Actions"]}>
          {classes.map((item) => (
            <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
              <td className="px-4 py-3">{item.year}</td>
              <td className="px-4 py-3">
                {item.teachers[0]
                  ? `${item.teachers[0].teacher.user.firstName} ${item.teachers[0].teacher.user.lastName}`
                  : "Not assigned"}
              </td>
              <td className="px-4 py-3">{item.students.length}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/admin/classes/${item.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open
                </Link>
              </td>
              <td className="px-4 py-3">
                <ClassActionsButton classId={item.id} initialName={item.name} initialYear={item.year} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
