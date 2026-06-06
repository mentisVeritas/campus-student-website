import PageContainer from "@/components/common/page-container";
import { mockNews } from "@/lib/mock-data";

export default function NewsPage() {
  return (
    <PageContainer
      title="University News"
      description="Official announcements and updates."
    >
      <ul className="space-y-3">
        {mockNews.map((news) => (
          <li key={news.id} className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{news.title}</p>
            <div className="mt-2 flex gap-3 text-xs text-slate-500">
              <span>{news.date}</span>
              <span>{news.category}</span>
            </div>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
