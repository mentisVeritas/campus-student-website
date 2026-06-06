"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

type UniversityNewsRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
  isRead?: boolean;
};

const NEWS_READ_CACHE_KEY = "news-read-cache:v1:student";

function getCachedReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(NEWS_READ_CACHE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set<string>(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function addCachedReadId(id: string) {
  if (typeof window === "undefined") return;
  const set = getCachedReadIds();
  set.add(id);
  window.localStorage.setItem(NEWS_READ_CACHE_KEY, JSON.stringify(Array.from(set)));
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function StudentNewsPage() {
  const [universityNews, setUniversityNews] = useState<UniversityNewsRow[]>([]);
  const [selected, setSelected] = useState<UniversityNewsRow | null>(null);

  const load = async () => {
    fetch("/api/university-news")
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload.data ?? []) as UniversityNewsRow[];
        const cachedRead = getCachedReadIds();
        setUniversityNews(rows.map((row) => (cachedRead.has(row.id) ? { ...row, isRead: true } : row)));
      });
  };

  const markRead = (newsId: string) => {
    const row = universityNews.find((item) => item.id === newsId);
    if (!row || row.isRead) return;
    setUniversityNews((prev) => prev.map((item) => (item.id === newsId ? { ...item, isRead: true } : item)));
    setSelected((prev) => (prev && prev.id === newsId ? { ...prev, isRead: true } : prev));
    addCachedReadId(newsId);
  };

  const openNews = (item: UniversityNewsRow) => {
    setSelected(item);
    markRead(item.id);
  };

  useEffect(() => {
    void load();
  }, []);

  const hasAny = universityNews.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Campus News" description="Official university news feed." />
      {!hasAny ? (
        <EmptyState icon="📰" title="No news yet" description="Latest campus updates will appear here." />
      ) : (
        <div className="space-y-4">
          {universityNews.map((item) => (
            <article
              key={item.id}
              className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${
                item.isRead
                  ? "border-slate-100 dark:border-slate-700"
                  : "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-900/30 dark:ring-indigo-800/60"
              }`}
              onClick={() => openNews(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {!item.isRead ? (
                    <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm dark:bg-indigo-500">
                      New
                    </span>
                  ) : null}
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {item.content}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {item.category} • {new Date(item.publishedAt).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
      <Modal open={selected !== null} title={selected?.title ?? "News"} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{selected.content}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{selected.category}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Published: {formatDateTime(selected.publishedAt)}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
