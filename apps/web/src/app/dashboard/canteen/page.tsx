import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function CanteenPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const menu = await prisma.canteenMenu.findUnique({
    where: { date: today },
    include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Canteen Dashboard"
        description="Manage menu and item availability."
        action={
          <Link href="/dashboard/canteen/menu" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Open Menu Manager
          </Link>
        }
      />
      {!menu || !menu.items.length ? (
        <EmptyState icon="🍽" title="No menu for today" description="Create a menu for today to start serving items." />
      ) : (
        <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Today Menu</h3>
          <div className="mt-3 space-y-2">
            {menu.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">${item.price.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {item.category} • {item.available ? "Available" : "Unavailable"}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
