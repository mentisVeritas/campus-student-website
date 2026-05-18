import PageContainer from "@/components/common/page-container";
import { mockGrades } from "@/lib/mock-data";

export default function GradebookPage() {
  const totalCredits = mockGrades.reduce((sum, item) => sum + item.credits, 0);
  const weighted = mockGrades.reduce((sum, item) => sum + item.score * item.credits, 0);
  const average = totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : "0.00";

  return (
    <PageContainer
      title="Electronic Gradebook"
      description="Consolidated overview of grades and weighted average."
    >
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Semester</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {mockGrades.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">{item.subject}</td>
                <td className="px-3 py-2">{item.credits}</td>
                <td className="px-3 py-2">{item.score}</td>
                <td className="px-3 py-2">{item.semester}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Weighted average score: {average}
      </div>
    </PageContainer>
  );
}
