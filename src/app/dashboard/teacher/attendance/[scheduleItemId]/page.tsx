"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";

type Row = {
  studentId: string;
  name: string;
  status: "PRESENT" | "ABSENT" | "LATE" | null;
  note: string | null;
};

type Props = {
  params: Promise<{ scheduleItemId: string }>;
};

export default function TeacherAttendanceSessionPage({ params }: Props) {
  const searchParams = useSearchParams();
  const [scheduleItemId, setScheduleItemId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    params.then((value) => setScheduleItemId(value.scheduleItemId));
  }, [params]);

  useEffect(() => {
    if (!scheduleItemId) return;
    fetch(`/api/teacher/attendance/session?scheduleItemId=${scheduleItemId}&date=${date}`)
      .then((response) => response.json())
      .then((payload) => setRows(payload.data ?? []));
  }, [scheduleItemId, date]);

  const stats = useMemo(() => {
    const present = rows.filter((row) => row.status === "PRESENT").length;
    const absent = rows.filter((row) => row.status === "ABSENT").length;
    const late = rows.filter((row) => row.status === "LATE").length;
    return { present, absent, late, total: rows.length };
  }, [rows]);

  const setAll = (status: "PRESENT" | "ABSENT" | "LATE") => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        status,
        note: status === "PRESENT" ? null : row.note,
      })),
    );
  };

  const save = async () => {
    if (!scheduleItemId) return;
    const response = await fetch("/api/teacher/attendance/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleItemId,
        date,
        records: rows
          .filter((row) => row.status)
          .map((row) => ({
            studentId: row.studentId,
            status: row.status,
            note: row.note ?? undefined,
          })),
      }),
    });
    const payload = await response.json();
    setMessage(response.ok ? "Attendance saved." : payload.error ?? "Failed to save.");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance Session" description={new Date(date).toLocaleDateString()} />
      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Link href="/dashboard/teacher/attendance" className="text-sm text-indigo-600 hover:text-indigo-700">
          ← Back to attendance
        </Link>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setAll("PRESENT")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">All PRESENT</button>
          <button type="button" onClick={() => setAll("ABSENT")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">All ABSENT</button>
          <button type="button" onClick={() => setAll("LATE")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">All LATE</button>
        </div>
      </article>

      <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.studentId} className="grid gap-2 rounded-lg border border-slate-100 p-3 xl:grid-cols-[1.2fr_auto_auto_auto_1.2fr] dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
              {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => (
                <label key={status} className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    checked={row.status === status}
                    onChange={() =>
                      setRows((current) =>
                        current.map((item) =>
                          item.studentId === row.studentId
                            ? { ...item, status, note: status === "PRESENT" ? null : item.note }
                            : item,
                        ),
                      )
                    }
                  />
                  {status}
                </label>
              ))}
              <input
                type="text"
                value={row.note ?? ""}
                disabled={row.status === "PRESENT" || row.status === null}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.studentId === row.studentId ? { ...item, note: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Note"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          ))}
          {!rows.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No students for this session.</p> : null}
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          Totals: {stats.present} present • {stats.absent} absent • {stats.late} late • {stats.total} students
        </p>
        <button type="button" onClick={save} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Save
        </button>
        {message ? <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{message}</p> : null}
      </article>
    </div>
  );
}
