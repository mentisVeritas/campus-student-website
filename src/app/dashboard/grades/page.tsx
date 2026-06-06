import PageContainer from "@/components/common/page-container";
import { mockGrades } from "@/lib/mock-data";

export default function GradesPage() {
  return (
    <PageContainer
      title="Academic Results"
      description="Current semester grades by subject."
    >
      <div className="grid gap-3">
        {mockGrades.map((grade) => (
          <article key={grade.id} className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{grade.subject}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>Score: {grade.score}</span>
              <span>Credits: {grade.credits}</span>
              <span>Semester: {grade.semester}</span>
            </div>
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
