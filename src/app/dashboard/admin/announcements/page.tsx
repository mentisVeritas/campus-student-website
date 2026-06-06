"use client";

import { Role } from "@prisma/client";
import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

type AnnouncementRow = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  updatedAt: string;
  isRead?: boolean;
  classId?: string | null;
  targetRole: Role | null;
  class?: { id: string; name: string; year: number } | null;
  author: {
    firstName: string;
    lastName: string;
    role: Role;
  };
};

const ANNOUNCEMENT_READ_CACHE_KEY = "announcement-read-cache:v1:admin";

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

type AdminClassOption = { id: string; name: string; year: number };
type AudienceMode = "ROLE_TARGET" | "SPECIFIC_CLASS";

const roles: Array<Role | "ALL"> = ["ALL", "ADMIN", "TEACHER", "STUDENT", "CANTEEN_STAFF"];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("ROLE_TARGET");
  const [targetRole, setTargetRole] = useState<Role | "ALL">("ALL");
  const [classes, setClasses] = useState<AdminClassOption[]>([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);

  const load = async () => {
    const response = await fetch("/api/announcements?scope=all");
    const payload = await response.json();
    const serverRows = (payload.data ?? []) as AnnouncementRow[];
    const cachedRead = getCachedReadIds();
    setRows(serverRows.map((row) => (cachedRead.has(row.id) ? { ...row, isRead: true } : row)));
  };

  const markRead = async (announcementId: string) => {
    const row = rows.find((item) => item.id === announcementId);
    if (!row || row.isRead) return;
    setRows((prev) => prev.map((item) => (item.id === announcementId ? { ...item, isRead: true } : item)));
    setSelected((prev) => (prev && prev.id === announcementId ? { ...prev, isRead: true } : prev));
    addCachedReadId(announcementId);
    void fetch("/api/announcements/read?scope=all", {
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
    fetch("/api/admin/classes")
      .then((response) => response.json())
      .then((payload) => {
        const list = (payload.data ?? []) as AdminClassOption[];
        setClasses(list);
        setTargetClassId(list[0]?.id ?? "");
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          isPinned,
        }),
      });
    } else {
      const payload =
        audienceMode === "SPECIFIC_CLASS"
          ? {
              title,
              content,
              targetRole: "STUDENT",
              classId: targetClassId || null,
              isPinned,
            }
          : {
              title,
              content,
              targetRole: targetRole === "ALL" ? null : targetRole,
              classId: null,
              isPinned,
            };
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setTitle("");
    setContent("");
    setEditingId(null);
    setAudienceMode("ROLE_TARGET");
    setTargetRole("ALL");
    setIsPinned(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Announcements" description="Publish global or role-targeted announcements." />
      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Content"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={4}
            required
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</span>
              <select
                value={audienceMode}
                onChange={(event) => setAudienceMode(event.target.value as AudienceMode)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                disabled={editingId !== null}
              >
                <option value="ROLE_TARGET">By role</option>
                <option value="SPECIFIC_CLASS">Specific class</option>
              </select>
            </label>
            {audienceMode === "ROLE_TARGET" ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target role</span>
                <select
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value as Role | "ALL")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={editingId !== null}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</span>
                <select
                  value={targetClassId}
                  onChange={(event) => setTargetClassId(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={editingId !== null}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Year {cls.year})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mt-5 inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} />
              Pinned
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {editingId ? "Save changes" : "Publish"}
        </button>
        {editingId ? (
          <button
            type="button"
            className="mt-3 ml-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setContent("");
              setAudienceMode("ROLE_TARGET");
              setTargetRole("ALL");
              setIsPinned(false);
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>

      {!rows.length ? (
        <EmptyState icon="📢" title="No announcements" description="Published announcements will appear here." />
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
              <p className="mt-2 text-sm text-slate-600">{item.content}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.author.firstName} {item.author.lastName} • {item.author.role} • target: {item.targetRole ?? "ALL"}
                {item.class ? ` • class: ${item.class.name} (Year ${item.class.year})` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sent: {formatDateTime(item.publishedAt)}
                {new Date(item.updatedAt).getTime() > new Date(item.publishedAt).getTime()
                  ? ` • Edited: ${formatDateTime(item.updatedAt)}`
                  : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await fetch(`/api/announcements/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: item.title,
                        content: item.content,
                        isPinned: !item.isPinned,
                      }),
                    });
                    await load();
                  }}
                >
                  {item.isPinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingId(item.id);
                    setTitle(item.title);
                    setContent(item.content);
                    setTargetRole(item.targetRole ?? "ALL");
                    setIsPinned(item.isPinned);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await fetch(`/api/announcements/${item.id}`, { method: "DELETE" });
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
      <Modal open={selected !== null} title={selected?.title ?? "Announcement"} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.content}</p>
            <p className="text-xs text-slate-500">
              {selected.author.firstName} {selected.author.lastName} • {selected.author.role} • target:{" "}
              {selected.targetRole ?? "ALL"}
              {selected.class ? ` • class: ${selected.class.name} (Year ${selected.class.year})` : ""}
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
