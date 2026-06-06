import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import ClassStudentList from "./ClassStudentList";
import ClassTeacherList from "./ClassTeacherList";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminClassDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const classRow = await prisma.class.findUnique({
    where: { id },
    include: {
      students: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { studentCode: "asc" },
      },
      teachers: {
        include: {
          teacher: {
            select: {
              id: true,
              employeeId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      scheduleItems: {
        include: { subject: { select: { name: true } } },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!classRow) {
    return <EmptyState icon="🏫" title="Class not found" description="Requested class does not exist." />;
  }

  const unassignedStudents = await prisma.student.findMany({
    where: { classId: null },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { studentCode: "asc" },
    take: 12,
  });

  const subjectsByTeacherId = new Map<string, string[]>();
  for (const item of classRow.scheduleItems) {
    const current = subjectsByTeacherId.get(item.teacherId) ?? [];
    if (!current.includes(item.subject.name)) {
      current.push(item.subject.name);
      subjectsByTeacherId.set(item.teacherId, current);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={`Class ${classRow.name}`} description={`Year ${classRow.year} • Admin management view`} />

      <section className="grid gap-4 xl:grid-cols-2">
        <ClassStudentList
          classId={classRow.id}
          count={classRow.students.length}
          students={classRow.students.map((student) => ({
            id: student.id,
            studentCode: student.studentCode,
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            email: student.user.email,
          }))}
          unassignedStudents={unassignedStudents.map((student) => ({
            id: student.id,
            studentCode: student.studentCode,
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            email: "",
          }))}
        />

        <ClassTeacherList
          classId={classRow.id}
          count={classRow.teachers.length}
          teachers={classRow.teachers.map((item) => ({
            id: item.teacherId,
            employeeId: item.teacher.employeeId,
            firstName: item.teacher.user.firstName,
            lastName: item.teacher.user.lastName,
            isHomeroom: item.isHomeroom,
            subjects: subjectsByTeacherId.get(item.teacherId) ?? [],
          }))}
        />
      </section>
    </div>
  );
}
