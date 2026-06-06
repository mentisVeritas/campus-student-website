"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

type RankingRow = {
  id: string;
  rank: number;
  studentName: string;
  className: string;
  gpa: number;
  isCurrentUser: boolean;
};

export default function StudentRankingsPage() {
  const [rows, setRows] = useState<RankingRow[]>([]);

  useEffect(() => {
    fetch("/api/rankings")
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Rankings" description="Top performers in current semester." />
      {!rows.length ? (
        <EmptyState icon="🥇" title="No rankings available" description="Rankings will be calculated soon." />
      ) : (
        <DataTable headers={["Rank", "Student", "Class", "GPA"]}>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60 ${
                row.isCurrentUser ? "bg-indigo-50/60 dark:bg-indigo-900/30" : ""
              }`}
            >
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                {row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : row.rank}
              </td>
              <td className="px-4 py-3">{row.studentName}</td>
              <td className="px-4 py-3">{row.className}</td>
              <td className="px-4 py-3">{row.gpa.toFixed(2)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
