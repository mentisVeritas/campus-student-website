"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminQuickActions() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshRankings = async () => {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/rankings/refresh", { method: "POST" });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to refresh rankings");
      return;
    }
    setMessage(`Rankings refreshed (${payload.data.total} students).`);
  };

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/dashboard/admin/users"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Create User
        </Link>
        <Link
          href="/dashboard/admin/classes"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Create Class
        </Link>
        <button
          type="button"
          onClick={refreshRankings}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Refresh Rankings
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </article>
  );
}
