import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export default async function StudentPortfolioPage() {
  const { user } = await requireCurrentUser();
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!student) {
    return <EmptyState icon="🏆" title="No student profile" description="Portfolio is unavailable without student profile." />;
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { studentId: student.id },
    include: { achievements: { orderBy: { date: "desc" } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Portfolio" description="Achievements and growth highlights." />
      {!portfolio ? (
        <EmptyState icon="🏆" title="No portfolio yet" description="Portfolio will appear when achievements are added." />
      ) : (
        <div className="space-y-3">
          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">About</h3>
            <p className="mt-2 text-sm text-slate-600">{portfolio.bio ?? "No bio provided."}</p>
          </article>
          {portfolio.achievements.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.category} • {new Date(item.date).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
