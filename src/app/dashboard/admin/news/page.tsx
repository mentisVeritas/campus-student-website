"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type UniversityNewsRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminNewsPage() {
  const [rows, setRows] = useState<UniversityNewsRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");

  const load = async () => {
    const response = await fetch("/api/university-news");
    const payload = await response.json();
    setRows(payload.data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = JSON.stringify({ title, content, category });
    if (editingId) {
      await fetch(`/api/university-news/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } else {
      await fetch("/api/university-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    }

    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory("General");
    await load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="News Management" description="Create, edit, and delete official university news." />

      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="News title"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="News content"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={5}
            required
          />
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category (e.g. Academic, Event, Policy)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {editingId ? "Save changes" : "Publish news"}
        </button>
        {editingId ? (
          <button
            type="button"
            className="ml-2 mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setContent("");
              setCategory("General");
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>

      {!rows.length ? (
        <EmptyState icon="📰" title="No news yet" description="Published university news will appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-base font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.content}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.category} • {formatDateTime(item.publishedAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    setEditingId(item.id);
                    setTitle(item.title);
                    setContent(item.content);
                    setCategory(item.category);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  onClick={async () => {
                    await fetch(`/api/university-news/${item.id}`, { method: "DELETE" });
                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
