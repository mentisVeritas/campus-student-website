"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type SportsRow = {
  id: string;
  name: string;
  coach: string;
  schedule: string;
  location: string;
  maxMembers: number | null;
  registrationsCount: number;
  isRegistered: boolean;
};

export default function StudentSportsPage() {
  const [rows, setRows] = useState<SportsRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sports")
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, []);

  const load = async () => {
    const response = await fetch("/api/sports");
    const payload = await response.json();
    setRows(payload.data ?? []);
  };

  const toggle = async (id: string, registered: boolean) => {
    setBusyId(id);
    await fetch(`/api/student/sports/${id}/register`, {
      method: registered ? "DELETE" : "POST",
    });
    await load();
    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Sports Sections" description="Join or leave available sports activities." />
      {!rows.length ? (
        <EmptyState icon="⚽" title="No sections available" description="Sports sections will appear here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.coach}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.schedule}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.location}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Members: {row.registrationsCount}
                {row.maxMembers ? ` / ${row.maxMembers}` : ""}
              </p>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => toggle(row.id, row.isRegistered)}
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {row.isRegistered ? "Unregister" : "Register"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
