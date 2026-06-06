"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type BulletinRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  contactInfo: string;
  price: number | null;
  authorName: string;
};

export default function StudentBulletinPage() {
  const [rows, setRows] = useState<BulletinRow[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    contactInfo: "",
    price: "",
  });

  useEffect(() => {
    fetch("/api/bulletin")
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, []);

  const load = async () => {
    const response = await fetch("/api/bulletin");
    const payload = await response.json();
    setRows(payload.data ?? []);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await fetch("/api/bulletin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
        contactInfo: form.contactInfo,
        price: form.price ? Number(form.price) : undefined,
      }),
    });
    setForm({ title: "", description: "", category: "", contactInfo: "", price: "" });
    await load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Bulletin Board" description="Campus buy/sell/help posts." />
      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Post</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
          <input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
          <input value={form.contactInfo} onChange={(e) => setForm((s) => ({ ...s, contactInfo: e.target.value }))} placeholder="Contact info" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
          <input value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="Price (optional)" type="number" min={0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" rows={3} required />
        </div>
        <button type="submit" className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Publish
        </button>
      </form>
      {!rows.length ? (
        <EmptyState icon="📌" title="No bulletin posts" description="No active posts at the moment." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{row.category}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.description}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {row.authorName} • {row.contactInfo} {row.price != null ? `• $${row.price}` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
