import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import GradeEntryClient from "./GradeEntryClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailsPage({ params }: PageProps) {
  const { user } = await requireCurrentUser();
  const { id: classId } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!teacher) {
    return <EmptyState icon="👨‍🏫" title="No teacher profile" description="Teacher profile is not configured yet." />;
  }

  const relation = await prisma.classTeacher.findUnique({
    where: {
      classId_teacherId: {
        classId,
        teacherId: teacher.id,
      },
    },
  });
  if (!relation) {
    return (
      <EmptyState
        icon="⛔"
        title="Class access denied"
        description="This class is not assigned to your teacher account."
      />
    );
  }

  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { studentCode: "asc" },
      },
      subjects: {
        where: {
          subject: {
            teachers: {
              some: { teacherId: teacher.id },
            },
          },
        },
        include: { subject: { select: { id: true, name: true } } },
      },
    },
  });

  if (!classRow) {
    return <EmptyState icon="🏫" title="Class not found" description="The requested class does not exist." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Class ${classRow.name}`}
        description="Review your class roster and submit grades by subject."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{classRow.students.length}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Subjects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{classRow.subjects.length}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class Year</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{classRow.year}</p>
        </article>
      </section>
      {classRow.subjects.length ? (
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Subjects you can grade</p>
          <p className="mt-1 text-sm text-slate-600">{classRow.subjects.map((row) => row.subject.name).join(", ")}</p>
        </article>
      ) : null}
      {!classRow.subjects.length ? (
        <EmptyState
          icon="📘"
          title="No assigned subjects"
          description="This class has no subjects assigned to your teacher profile."
        />
      ) : null}
      {!classRow.students.length ? (
        <EmptyState icon="📘" title="No students in class" description="This class currently has no students." />
      ) : classRow.subjects.length ? (
        <GradeEntryClient
          classId={classRow.id}
          students={classRow.students.map((student) => ({
            id: student.id,
            studentCode: student.studentCode,
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            email: student.user.email,
          }))}
          subjects={classRow.subjects.map((row) => ({
            id: row.subject.id,
            name: row.subject.name,
          }))}
        />
      ) : null}
    </div>
  );
}
