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

const ANNOUNCEMENT_READ_CACHE_KEY = "announcement-read-cache:v1:teacher";

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

type TeacherClassOption = { id: string; name: string; year: number };
type Audience = "ALL_USERS" | "ALL_STUDENTS" | "MY_CLASS";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function TeacherAnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL_STUDENTS");
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassOption[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
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
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload) => setCurrentUserId(payload?.data?.user?.id ?? null));
    fetch("/api/teacher/my-classes")
      .then((response) => response.json())
      .then((payload) => {
        const classes = (payload.data ?? []) as TeacherClassOption[];
        setTeacherClasses(classes);
        setTargetClassId(classes[0]?.id ?? "");
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
        audience === "ALL_USERS"
          ? { title, content, targetRole: null, classId: null, isPinned }
          : audience === "ALL_STUDENTS"
            ? { title, content, targetRole: "STUDENT", classId: null, isPinned }
            : { title, content, targetRole: "STUDENT", classId: targetClassId || null, isPinned };
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setEditingId(null);
    setTitle("");
    setContent("");
    setAudience("ALL_STUDENTS");
    setIsPinned(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher Announcements" description="Publish updates for your students." />
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
                value={audience}
                onChange={(event) => setAudience(event.target.value as Audience)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                disabled={editingId !== null}
              >
                <option value="ALL_USERS">All users</option>
                <option value="ALL_STUDENTS">All students</option>
                <option value="MY_CLASS">Specific class</option>
              </select>
            </label>
            {audience === "MY_CLASS" ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</span>
                <select
                  value={targetClassId}
                  onChange={(event) => setTargetClassId(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={editingId !== null}
                >
                  {teacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Year {cls.year})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
              setAudience("ALL_STUDENTS");
              setIsPinned(false);
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>

      {!rows.length ? (
        <EmptyState icon="📢" title="No announcements" description="Available announcements will appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => {
            const canManage = currentUserId != null && item.authorId === currentUserId;
            return (
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
                {item.class ? ` • class: ${item.class.name} (Year ${item.class.year})` : ""} •{" "}
                {new Date(item.publishedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sent: {formatDateTime(item.publishedAt)}
                {new Date(item.updatedAt).getTime() > new Date(item.publishedAt).getTime()
                  ? ` • Edited: ${formatDateTime(item.updatedAt)}`
                  : ""}
              </p>
              {canManage ? (
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
                      if (item.classId) {
                        setAudience("MY_CLASS");
                        setTargetClassId(item.classId);
                      } else if (item.targetRole === "STUDENT") {
                        setAudience("ALL_STUDENTS");
                      } else {
                        setAudience("ALL_USERS");
                      }
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
              ) : null}
            </article>
            );
          })}
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
