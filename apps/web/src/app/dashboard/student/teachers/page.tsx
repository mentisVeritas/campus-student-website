"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
};

export default function StudentTeachersPage() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/teachers")
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q),
    );
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <PageHeader title="Teachers" description="Find teacher contacts and subjects." />
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or department"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {!filtered.length ? (
        <EmptyState icon="👨‍🏫" title="No teachers found" description="Try another search query." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar name={row.name} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.department}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{row.subjects.join(", ")}</p>
              <a href={`mailto:${row.email}`} className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-700">
                {row.email}
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
