"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type LostFoundRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: "LOST" | "FOUND" | "CLAIMED";
  reporterName: string;
  createdAt: string;
  foundDate: string | null;
  canEdit: boolean;
  isMine: boolean;
};

export default function StudentLostFoundPage() {
  const [rows, setRows] = useState<LostFoundRow[]>([]);
  const [status, setStatus] = useState<"LOST" | "FOUND">("LOST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"ALL" | "LOST" | "FOUND" | "CLAIMED">("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lost-found")
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, []);

  const load = async () => {
    const response = await fetch("/api/lost-found");
    const payload = await response.json();
    setRows(payload.data ?? []);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await fetch("/api/lost-found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, location, status }),
    });
    setStatus("LOST");
    setTitle("");
    setDescription("");
    setLocation("");
    await load();
  };

  const transitionStatus = async (id: string, nextStatus: "LOST" | "FOUND" | "CLAIMED") => {
    setSavingId(id);
    try {
      await fetch(`/api/lost-found/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const filtered = rows.filter((row) => {
    if (tab !== "ALL" && row.status !== tab) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [row.title, row.description, row.location, row.reporterName].some((value) => value.toLowerCase().includes(q));
  });

  const stat = {
    all: rows.length,
    lost: rows.filter((row) => row.status === "LOST").length,
    found: rows.filter((row) => row.status === "FOUND").length,
    claimed: rows.filter((row) => row.status === "CLAIMED").length,
  };

  const tone = (state: LostFoundRow["status"]) =>
    state === "LOST"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      : state === "FOUND"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";

  const topMatches = rows
    .filter((row) => row.status === "LOST")
    .flatMap((lost) =>
      rows
        .filter((row) => row.status === "FOUND")
        .filter((found) => {
          const tokens = new Set(
            `${lost.title} ${lost.description}`
              .toLowerCase()
              .split(/[^\p{L}\p{N}]+/u)
              .filter((s) => s.length >= 4),
          );
          return `${found.title} ${found.description}`
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .some((s) => tokens.has(s));
        })
        .slice(0, 1)
        .map((found) => ({ lost, found })),
    )
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <PageHeader title="Lost & Found" description="Report items, filter feed, and quickly process claim flow." />

      <section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">All</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.all}</p>
        </article>
        <article className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <p className="text-xs uppercase text-rose-600 dark:text-rose-400">Lost</p>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stat.lost}</p>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
          <p className="text-xs uppercase text-emerald-600 dark:text-emerald-400">Found</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stat.found}</p>
        </article>
        <article className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-indigo-900 dark:bg-slate-900">
          <p className="text-xs uppercase text-indigo-600 dark:text-indigo-400">Claimed</p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stat.claimed}</p>
        </article>
      </section>

      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Report Item</h3>
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-2">
            {(["LOST", "FOUND"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStatus(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  status === mode
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {mode === "LOST" ? "I lost something" : "I found an item"}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" rows={3} required />
        </div>
        <button type="submit" className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Submit
        </button>
      </form>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "LOST", "FOUND", "CLAIMED"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === item
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {item}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item, location, or reporter"
            className="ml-auto min-w-[16rem] rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </section>

      {topMatches.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Potential matches</h3>
          <div className="mt-2 space-y-2 text-sm">
            {topMatches.map((m) => (
              <p key={`${m.lost.id}-${m.found.id}`} className="text-amber-800 dark:text-amber-200">
                <span className="font-semibold">{m.lost.title}</span> could match found item <span className="font-semibold">{m.found.title}</span>.
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {!filtered.length ? (
        <EmptyState icon="🔎" title="No reports yet" description="Be the first to report an item." />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone(row.status)}`}>{row.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.description}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {row.location} • reported by {row.reporterName}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Created: {new Date(row.createdAt).toLocaleString()}
                {row.foundDate ? ` • Found: ${new Date(row.foundDate).toLocaleString()}` : ""}
              </p>
              {row.canEdit ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.status !== "LOST" ? (
                    <button
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => void transitionStatus(row.id, "LOST")}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      Mark Lost
                    </button>
                  ) : null}
                  {row.status !== "FOUND" ? (
                    <button
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => void transitionStatus(row.id, "FOUND")}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      Mark Found
                    </button>
                  ) : null}
                  {row.status !== "CLAIMED" ? (
                    <button
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => void transitionStatus(row.id, "CLAIMED")}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      Mark Claimed
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
