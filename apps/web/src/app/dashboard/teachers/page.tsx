import PageContainer from "@/components/common/page-container";
import { mockTeachers } from "@/lib/mock-data";

export default function TeachersPage() {
  return (
    <PageContainer
      title="Teachers Catalog"
      description="Faculty contacts by department."
    >
      <ul className="space-y-3">
        {mockTeachers.map((teacher) => (
          <li key={teacher.id} className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{teacher.name}</p>
            <p className="text-sm text-slate-600">{teacher.email}</p>
            <p className="text-xs text-slate-500">{teacher.department}</p>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
