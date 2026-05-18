"use client";

import { MealCategory } from "@prisma/client";
import {
  CalendarDays,
  ChefHat,
  Coffee,
  Droplets,
  Loader2,
  Pizza,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const categories: MealCategory[] = ["BREAKFAST", "LUNCH", "SNACK", "DRINKS"];

const categoryVisual: Record<
  MealCategory,
  { label: string; Icon: typeof Coffee; pill: string; ring: string; glow: string }
> = {
  BREAKFAST: {
    label: "Breakfast",
    Icon: Coffee,
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    ring: "ring-amber-400/40",
    glow: "from-amber-500/15 to-transparent",
  },
  LUNCH: {
    label: "Lunch",
    Icon: UtensilsCrossed,
    pill: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-100",
    ring: "ring-orange-400/40",
    glow: "from-orange-500/15 to-transparent",
  },
  SNACK: {
    label: "Snacks",
    Icon: Pizza,
    pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    ring: "ring-emerald-400/40",
    glow: "from-emerald-500/15 to-transparent",
  },
  DRINKS: {
    label: "Drinks",
    Icon: Droplets,
    pill: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
    ring: "ring-sky-400/40",
    glow: "from-sky-500/15 to-transparent",
  },
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: MealCategory;
  price: number;
  calories: number | null;
  available: boolean;
};

type MenuPayload = {
  id?: string;
  date?: string;
  items: MenuItem[];
};

export default function CanteenMenuPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "0",
    category: "BREAKFAST" as MealCategory,
    calories: "",
  });

  const grouped = useMemo(() => {
    const items = menu?.items ?? [];
    return categories.map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }));
  }, [menu]);

  const totalItems = menu?.items?.length ?? 0;
  const availableCount = useMemo(() => menu?.items?.filter((i) => i.available).length ?? 0, [menu]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/canteen/menu?date=${date}`);
      const payload = await response.json();
      setMenu(payload.data);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!menu?.id) {
      await fetch("/api/canteen/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, items: [] }),
      });
      await loadMenu();
    }

    const current = menu?.id ? menu : null;
    const targetMenuId = current?.id ?? (await (await fetch(`/api/canteen/menu?date=${date}`)).json()).data?.id;
    if (!targetMenuId) return;

    await fetch(`/api/canteen/menu/${targetMenuId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        category: form.category,
        calories: form.calories ? Number(form.calories) : undefined,
      }),
    });
    setForm({ name: "", description: "", price: "0", category: "BREAKFAST", calories: "" });
    await loadMenu();
  };

  const removeItem = async (id: string) => {
    if (!menu?.id) return;
    await fetch(`/api/canteen/menu/${menu.id}/items/${id}`, { method: "DELETE" });
    await loadMenu();
  };

  const setItemAvailable = async (item: MenuItem, available: boolean) => {
    if (!menu?.id) return;
    await fetch(`/api/canteen/menu/${menu.id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available }),
    });
    await loadMenu();
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-md dark:border-indigo-500/30 dark:from-indigo-950/80 dark:via-slate-900 dark:to-violet-950/60 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-400/25 to-violet-400/20 blur-3xl dark:from-indigo-500/20 dark:to-violet-500/15" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <ChefHat className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Menu Management</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Kitchen board
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Pick a day, build courses by category, and flip dishes on or off for what&apos;s actually being served.
                Students see only what you mark as available.
              </p>
            </div>
          </div>
          <dl className="flex shrink-0 gap-6 rounded-xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-600/80 md:text-left">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Dishes</dt>
              <dd className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{totalItems}</dd>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-600" aria-hidden />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Live</dt>
              <dd className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{availableCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Date bar */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block flex-1">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <CalendarDays className="h-4 w-4 text-indigo-500" aria-hidden />
              Menu date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadMenu()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Refresh menu
          </button>
        </div>
      </section>

      {/* Add form */}
      <form
        onSubmit={addItem}
        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add a dish</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">New items appear under the category you choose.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            placeholder="Dish name"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((state) => ({ ...state, category: event.target.value as MealCategory }))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryVisual[category].label}
              </option>
            ))}
          </select>
          <input
            placeholder="Price"
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((state) => ({ ...state, price: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <input
            placeholder="Calories (optional)"
            type="number"
            min={0}
            value={form.calories}
            onChange={(event) => setForm((state) => ({ ...state, calories: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            placeholder="Short description (optional)"
            value={form.description}
            onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm md:col-span-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add to menu
        </button>
      </form>

      {/* Grouped cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Board for this date</h2>
          {loading ? (
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading…
            </span>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {grouped.map((group) => {
            const meta = categoryVisual[group.category];
            const CatIcon = meta.Icon;
            return (
              <div
                key={group.category}
                className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-inset dark:border-slate-700 dark:bg-slate-900 ${meta.ring}`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${meta.glow} to-transparent`}
                  aria-hidden
                />
                <div className="relative border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${meta.pill}`}>
                      <CatIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{meta.label}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative space-y-3 p-5">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between ${
                        !item.available ? "opacity-70" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                        {item.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{item.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span className="text-slate-800 dark:text-slate-200">${item.price.toFixed(2)}</span>
                          {item.calories ? <span className="ml-2">· {item.calories} kcal</span> : null}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={item.available}
                            onChange={(e) => void setItemAvailable(item, e.target.checked)}
                          />
                          <span className="text-slate-700 dark:text-slate-200">Available</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => void removeItem(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/80 transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-500/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {!group.items.length ? (
                    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                      Nothing here yet — add dishes above.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
