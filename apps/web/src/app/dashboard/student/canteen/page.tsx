"use client";

import { MealCategory } from "@prisma/client";
import { Coffee, Droplets, Flame, Pizza, Sparkles, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  calories: number | null;
  category: MealCategory;
  available: boolean;
};

const categories: MealCategory[] = ["BREAKFAST", "LUNCH", "SNACK", "DRINKS"];

const categoryMeta: Record<
  MealCategory,
  { label: string; short: string; Icon: LucideIcon; pill: string; ring: string }
> = {
  BREAKFAST: {
    label: "Breakfast",
    short: "AM",
    Icon: Coffee,
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    ring: "ring-amber-400/30",
  },
  LUNCH: {
    label: "Lunch",
    short: "Midday",
    Icon: UtensilsCrossed,
    pill: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-100",
    ring: "ring-orange-400/30",
  },
  SNACK: {
    label: "Snacks",
    short: "Bites",
    Icon: Pizza,
    pill: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100",
    ring: "ring-rose-400/30",
  },
  DRINKS: {
    label: "Drinks",
    short: "Cold & hot",
    Icon: Droplets,
    pill: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
    ring: "ring-sky-400/30",
  },
};

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greetingFromHour(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 15) return "Hungry yet?";
  if (h < 19) return "Afternoon fuel";
  return "Evening bites";
}

export default function StudentCanteenPage() {
  const [selectedTab, setSelectedTab] = useState<MealCategory>("BREAKFAST");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [date, setDate] = useState(todayIsoLocal);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMenu = useCallback(async (isoDate: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/canteen/menu?date=${encodeURIComponent(isoDate)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setItems([]);
        setLoadError(typeof payload.error === "string" ? payload.error : "Could not load menu");
        return;
      }
      const menu = payload.data as { items?: MenuItem[] } | undefined;
      setItems(Array.isArray(menu?.items) ? menu.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMenu(date);
  }, [date, loadMenu]);

  const visible = useMemo(() => items.filter((item) => item.category === selectedTab), [items, selectedTab]);

  const counts = useMemo(() => {
    const map = {} as Record<MealCategory, number>;
    for (const c of categories) map[c] = 0;
    for (const item of items) map[item.category] += 1;
    return map;
  }, [items]);

  const formattedDay = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [date]);

  const isToday = date === todayIsoLocal();

  return (
    <div className="space-y-6">
      <PageHeader title="Canteen" description="Browse today’s menu by category — prices, calories, and availability at a glance." />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 shadow-sm dark:border-orange-900/40 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-rose-950/40">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-300/25 blur-2xl dark:bg-orange-500/15" />
        <div className="pointer-events-none absolute -bottom-6 left-1/4 h-24 w-24 rounded-full bg-rose-300/20 blur-2xl dark:bg-rose-500/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-800 shadow-sm dark:bg-slate-900/80 dark:text-orange-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Campus dining
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {greetingFromHour()} — here’s what’s cooking
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-700 dark:text-slate-300">{formattedDay}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Day</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border-0 bg-transparent font-semibold text-slate-900 outline-none dark:text-slate-100"
                aria-label="Menu date"
              />
            </label>
            {isToday ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Showing today’s board</span>
            ) : (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Browsing another day</span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((cat) => {
            const meta = categoryMeta[cat];
            const Icon = meta.Icon;
            return (
              <div
                key={cat}
                className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-900/60"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg p-1.5 ${meta.pill}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{meta.label}</p>
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{counts[cat]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((tab) => {
          const meta = categoryMeta[tab];
          const Icon = meta.Icon;
          const active = selectedTab === tab;
          const n = counts[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`flex min-w-[8.5rem] shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? `border-transparent bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/40`
                  : `border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30`
              }`}
            >
              <span className={`rounded-lg p-1.5 ${active ? "bg-white/20" : meta.pill}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                  {meta.label}
                </span>
                <span className={`text-[10px] ${active ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {n} item{n === 1 ? "" : "s"} · {meta.short}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu grid */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loadError ? (
          <EmptyState
            icon="⚠️"
            title="Menu unavailable"
            description={loadError}
          />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-700/80" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/80" />
              </div>
            ))}
          </div>
        ) : !visible.length ? (
          <EmptyState
            icon="🍽"
            title="Nothing listed here yet"
            description="Pick another category above or choose a different day — the kitchen may still be updating this slot."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visible.map((item) => {
              const meta = categoryMeta[item.category];
              return (
                <li
                  key={item.id}
                  className={`group relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80 ${meta.ring} ring-1`}
                >
                  {!item.available ? (
                    <span className="absolute right-3 top-3 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
                      Sold out
                    </span>
                  ) : (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      In stock
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3 pr-16">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-slate-900 dark:text-slate-100">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <span className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.calories != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Flame className="h-3 w-3 text-orange-500" aria-hidden />
                        {item.calories} kcal
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Calories TBA</span>
                    )}
                    <span className={`ml-auto text-xs font-medium ${meta.pill} rounded-full px-2 py-0.5`}>{meta.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
