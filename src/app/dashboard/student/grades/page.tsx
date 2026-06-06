import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import GradeBar from "@/components/ui/GradeBar";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

function dedupeLatest<T>(rows: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export default async function StudentGradesPage() {
  const { user } = await requireCurrentUser();
  const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!student) {
    return <EmptyState icon="📚" title="No grades yet" description="Student profile is not connected." />;
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: student.id },
    include: { subject: true },
    orderBy: [{ subjectId: "asc" }, { gradedAt: "desc" }],
  });

  if (!grades.length) {
    return <EmptyState icon="📝" title="No grades yet" description="Teachers have not published grades yet." />;
  }

  const dedupedGrades = dedupeLatest(grades, (grade) => `${grade.subjectId}__${grade.type}`);

  const grouped = Object.values(
    dedupedGrades.reduce<Record<string, { name: string; credits: number; items: typeof dedupedGrades }>>((acc, grade) => {
      if (!acc[grade.subjectId]) {
        acc[grade.subjectId] = { name: grade.subject.name, credits: grade.subject.credits, items: [] };
      }
      acc[grade.subjectId].items.push(grade);
      return acc;
    }, {}),
  );

  const gpa = Number(
    (
      grouped.reduce((sum, subject) => {
        const avg = subject.items.reduce((a, b) => a + b.score, 0) / subject.items.length;
        return sum + avg;
      }, 0) /
      grouped.length /
      20
    ).toFixed(2),
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Grades" description="Subject performance and all assessment entries." />

      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Current semester GPA</p>
        <p className="mt-1 text-4xl font-bold text-slate-900 dark:text-slate-100">{gpa}</p>
      </article>

      {grouped.map((subject) => {
        const average = Number(
          (subject.items.reduce((sum, item) => sum + item.score, 0) / subject.items.length).toFixed(1),
        );
        return (
          <article key={subject.name} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{subject.name}</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">{subject.credits} credits</span>
            </div>
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Average</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{average}</span>
              </div>
              <GradeBar score={average} />
            </div>
            <div className="space-y-2">
              {subject.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.type}</span>
                    <span>{item.score}</span>
                  </div>
                  {item.comment ? <p className="mt-1 text-slate-500 dark:text-slate-400">{item.comment}</p> : null}
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
