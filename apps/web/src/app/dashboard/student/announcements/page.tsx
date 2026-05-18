"use client";

import { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  updatedAt: string;
  isRead?: boolean;
  author: {
    firstName: string;
    lastName: string;
    role: Role;
  };
};

const ANNOUNCEMENT_READ_CACHE_KEY = "announcement-read-cache:v1:student";

function getCachedReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENT_READ_CACHE_KEY);
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
  window.localStorage.setItem(ANNOUNCEMENT_READ_CACHE_KEY, JSON.stringify(Array.from(set)));
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function StudentAnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);

  const load = async () => {
    const response = await fetch("/api/announcements");
    const payload = await response.json();
    const serverRows = (payload.data ?? []) as AnnouncementRow[];
    const cachedRead = getCachedReadIds();
    setRows(serverRows.map((row) => (cachedRead.has(row.id) ? { ...row, isRead: true } : row)));
  };

  const markRead = async (announcementId: string) => {
    const row = rows.find((item) => item.id === announcementId);
    if (!row || row.isRead) return;
    // Update UI immediately so NEW/highlight disappears right after opening.
    setRows((prev) => prev.map((item) => (item.id === announcementId ? { ...item, isRead: true } : item)));
    setSelected((prev) => (prev && prev.id === announcementId ? { ...prev, isRead: true } : prev));
    addCachedReadId(announcementId);
    void fetch("/api/announcements/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementIds: [announcementId] }),
    });
  };

  const openAnnouncement = async (item: AnnouncementRow) => {
    setSelected(item);
    await markRead(item.id);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Announcements" description="Pinned first, latest updates from faculty and administration." />
      {!rows.length ? (
        <EmptyState icon="📢" title="No announcements" description="There are no active announcements now." />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                item.isRead ? "border-slate-100" : "border-indigo-200 bg-indigo-50/40 ring-2 ring-indigo-100"
              } cursor-pointer transition hover:shadow-md`}
              onClick={() => void openAnnouncement(item)}
            >
              <p className="text-base font-semibold text-slate-900">
                {!item.isRead ? (
                  <span className="mr-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                    New
                  </span>
                ) : null}
                {item.isPinned ? "📌 " : ""}
                {item.title}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.content}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.author.firstName} {item.author.lastName} • {item.author.role}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sent: {formatDateTime(item.publishedAt)}</p>
            </article>
          ))}
        </div>
      )}

      <Modal open={selected !== null} title={selected?.title ?? "Announcement"} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.content}</p>
            <p className="text-xs text-slate-500">
              {selected.author.firstName} {selected.author.lastName} • {selected.author.role}
            </p>
            <p className="text-xs text-slate-500">
              Sent: {formatDateTime(selected.publishedAt)}
              {new Date(selected.updatedAt).getTime() > new Date(selected.publishedAt).getTime()
                ? ` • Edited: ${formatDateTime(selected.updatedAt)}`
                : ""}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
