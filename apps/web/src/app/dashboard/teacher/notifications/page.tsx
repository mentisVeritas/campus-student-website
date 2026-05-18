"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
};

export default function TeacherNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((response) => response.json())
      .then((payload) => setItems(payload.data ?? []));
  }, []);

  const markOne = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const openDetails = async (item: NotificationItem) => {
    await markOne(item.id);
    setSelectedId(item.id);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Stay updated with class and system updates."
        action={
          <button
            type="button"
            onClick={markAll}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Mark all as read
          </button>
        }
      />

      {!items.length ? (
        <EmptyState icon="🔔" title="No notifications" description="You are all caught up." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openDetails(item)}
              className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${
                item.read
                  ? "border-slate-100 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  : "border-indigo-100 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm">
                    {item.message.length > 92 ? `${item.message.slice(0, 92)}...` : item.message}
                  </p>
                </div>
                <StatusBadge status={item.read ? "READ" : "UNREAD"} />
              </div>
              <p className="mt-2 text-xs">{new Date(item.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedItem.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(selectedItem.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {selectedItem.message}
            </p>
            {selectedItem.link ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    router.push(selectedItem.link!);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Open details
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
