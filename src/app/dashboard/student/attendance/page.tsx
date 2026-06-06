"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceStatus } from "@prisma/client";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type BucketRow = {
  total: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
};

type MatrixCell =
  | { date: string; kind: "no_lesson" }
  | {
      date: string;
      kind: "lesson";
      scheduleItemId: string;
      attendanceId: string | null;
      status: AttendanceStatus | null;
    };

type DayCol = {
  date: string;
  dayOfMonth: number;
  weekday: string;
  hasLesson: boolean;
};

type MatrixRow = {
  scheduleItemId: string;
  rowTitle: string;
  cells: MatrixCell[];
};

type SubjectMatrixCell = {
  date: string;
  kind: "no_lesson" | "lesson";
  statuses: Array<AttendanceStatus | null>;
};

type SubjectMatrixRow = {
  subjectName: string;
  cells: SubjectMatrixCell[];
};

function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type LessonCell = Extract<MatrixCell, { kind: "lesson" }>;

/** Align student matrix labels/colors with admin/teacher (view only). */
function cellDisplay(status: AttendanceStatus | null): { text: string; className: string } {
  if (status === "PRESENT") {
    return {
      text: "P",
      className:
        "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_12px_-6px_rgba(16,185,129,0.85)] ring-1 ring-emerald-300/70",
    };
  }
  if (status === "LATE") {
    return {
      text: "L",
      className:
        "bg-gradient-to-b from-amber-300 to-yellow-500 text-yellow-950 shadow-[0_6px_12px_-6px_rgba(234,179,8,0.75)] ring-1 ring-yellow-300/80",
    };
  }
  if (status === "ABSENT") {
    return {
      text: "A",
      className:
        "bg-gradient-to-b from-rose-400 to-red-600 text-white shadow-[0_6px_12px_-6px_rgba(239,68,68,0.85)] ring-1 ring-rose-300/70",
    };
  }
  return { text: "—", className: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" };
}

function SubjectMatrixCellView({ cell }: { cell: SubjectMatrixCell }) {
  if (cell.kind === "no_lesson" || cell.statuses.length === 0) {
    return (
      <td className="h-14 border border-slate-200/80 bg-slate-50/90 p-0 align-middle dark:border-slate-700 dark:bg-slate-900/50" />
    );
  }

  return (
    <td className="h-14 border border-slate-200/80 px-1 py-1 align-middle dark:border-slate-700">
      <div className="flex h-10 min-w-[3.25rem] items-center justify-center gap-1">
        {cell.statuses.map((status, idx) => {
          const visualStatus: AttendanceStatus | null =
            status ?? (cell.date < localTodayIso() ? "PRESENT" : null);
          const { text, className } = cellDisplay(visualStatus);
          const title =
            status === null
              ? cell.date < localTodayIso()
                ? "No mark in journal (shown as Present like admin view for past dates)"
                : "No mark yet"
              : status === "PRESENT"
                ? "Present"
                : status === "ABSENT"
                  ? "Absent"
                  : "Late";
          return (
            <span
              key={`${cell.date}-${idx}-${status}`}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-extrabold tracking-wide transition-transform duration-150 hover:scale-105 ${className}`}
              title={title}
            >
              {text}
            </span>
          );
        })}
      </div>
    </td>
  );
}

/** Per-day roll-up: share of lesson slots scored (present=1, late=0.5) among slots that have any mark */
function columnRates(matrix: MatrixRow[], dayLen: number): string[] {
  const out: string[] = [];
  for (let col = 0; col < dayLen; col++) {
    let scored = 0;
    let weight = 0;
    for (const row of matrix) {
      const cell = row.cells[col];
      if (cell.kind !== "lesson") continue;
      if (cell.status === null) continue;
      weight += 1;
      if (cell.status === "PRESENT") scored += 1;
      else if (cell.status === "LATE") scored += 0.5;
    }
    out.push(weight ? `${Math.round((scored / weight) * 100)}%` : "—");
  }
  return out;
}

function formatYearBreadcrumb(startYear: number): string {
  return `YEAR_${startYear}_${String(startYear + 1).slice(-2)}`;
}

export default function StudentAttendancePage() {
  const [referenceDate, setReferenceDate] = useState(localTodayIso);
  const [studentName, setStudentName] = useState("");
  const [monthLabel, setMonthLabel] = useState("");
  const [academicYearStart, setAcademicYearStart] = useState<number | null>(null);
  const [semesterNum, setSemesterNum] = useState<1 | 2 | null>(null);
  const [overall, setOverall] = useState<BucketRow | null>(null);
  const [classOverall, setClassOverall] = useState<BucketRow | null>(null);
  const [days, setDays] = useState<DayCol[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshTokenRef = useRef(0);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("date", referenceDate);
    return p.toString();
  }, [referenceDate]);

  useEffect(() => {
    refreshTokenRef.current += 1;
    const token = refreshTokenRef.current;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/student/attendance?${queryString}`, { cache: "no-store" });
        const json = await res.json();
        if (token !== refreshTokenRef.current) return;
        if (!res.ok) {
          setOverall(null);
          setClassOverall(null);
          setDays([]);
          setMatrix([]);
          setAcademicYearStart(null);
          setSemesterNum(null);
          setMonthLabel("");
          return;
        }
        const d = json.data;
        setStudentName(d?.studentName ?? "");
        setMonthLabel(d?.month ?? "");
        setAcademicYearStart(typeof d?.academicYearStart === "number" ? d.academicYearStart : null);
        setSemesterNum(typeof d?.semester === "number" ? d.semester : null);
        setOverall(d?.overall ?? null);
        setClassOverall(d?.classOverall ?? null);
        setDays(d?.days ?? []);
        setMatrix(d?.matrix ?? []);
      } finally {
        if (token === refreshTokenRef.current) setLoading(false);
      }
    })();
  }, [queryString]);

  const hasMatrix = matrix.length > 0 && days.length > 0;
  const groupedMatrix = useMemo<SubjectMatrixRow[]>(() => {
    const bySubject = new Map<string, SubjectMatrixRow>();

    for (const row of matrix) {
      const subjectName = row.rowTitle.split(" · ")[0]?.trim() || row.rowTitle;
      if (!bySubject.has(subjectName)) {
        bySubject.set(subjectName, {
          subjectName,
          cells: days.map((d) => ({ date: d.date, kind: d.hasLesson ? "lesson" : "no_lesson", statuses: [] })),
        });
      }
      const target = bySubject.get(subjectName)!;
      row.cells.forEach((cell, idx) => {
        if (cell.kind !== "lesson") return;
        if (target.cells[idx]) {
          target.cells[idx].kind = "lesson";
          // Keep every scheduled slot in that day (including unmarked ones) to avoid hiding data.
          target.cells[idx].statuses.push(cell.status);
        }
      });
    }

    return [...bySubject.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [matrix, days]);

  const colRates = useMemo(() => {
    const out: string[] = [];
    for (let col = 0; col < days.length; col++) {
      let scored = 0;
      let weight = 0;
      for (const row of groupedMatrix) {
        const cell = row.cells[col];
        if (!cell || cell.kind !== "lesson") continue;
        for (const status of cell.statuses) {
          const normalizedStatus: AttendanceStatus | null =
            status ?? (cell.date < localTodayIso() ? "PRESENT" : null);
          if (normalizedStatus === null) continue;
          weight += 1;
          if (normalizedStatus === "PRESENT") scored += 1;
          else if (normalizedStatus === "LATE") scored += 0.5;
        }
      }
      out.push(weight ? `${Math.round((scored / weight) * 100)}%` : "—");
    }
    return out;
  }, [groupedMatrix, days.length]);

  const monthHuman = useMemo(() => {
    const m = monthLabel ? /^(\d{4})-(\d{2})$/.exec(monthLabel) : null;
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";
  }, [monthLabel]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description="Monthly matrix by module (read-only). Pick any date — the whole month of that date is shown."
      />

      {/* Reference-style breadcrumb strip */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 pb-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          ACADEMIC_YEAR:{" "}
          <span className="text-slate-900 dark:text-slate-100">
            {academicYearStart != null ? formatYearBreadcrumb(academicYearStart) : "—"}
          </span>
        </span>
        <span className="text-slate-400">→</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          SEMESTER:{" "}
          <span className="text-slate-900 dark:text-slate-100">{semesterNum != null ? `SEMESTER_${semesterNum}` : "—"}</span>
        </span>
        <span className="text-slate-400">→</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          MONTH: <span className="text-slate-900 dark:text-slate-100">{monthHuman || "—"}</span>
        </span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
            <span className="font-medium text-slate-600 dark:text-slate-400">DATE</span>
            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="cursor-pointer rounded border-0 bg-transparent font-semibold text-slate-900 outline-none dark:text-slate-100"
              aria-label="Pick a date in the month to display"
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing calendar month containing this date · {studentName || "Student"}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Overall</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{loading ? "…" : `${overall?.attendanceRate ?? 0}%`}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Group average</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{loading ? "…" : `${classOverall?.attendanceRate ?? 0}%`}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recorded</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{loading ? "…" : (overall?.total ?? 0)}</p>
          </div>
        </div>
      </section>

      <p className="h-5 text-sm text-slate-500" aria-live="polite">
        {loading ? "Loading…" : ""}
      </p>

      {!loading && !hasMatrix ? (
        <EmptyState icon="📋" title="No modules" description="No group schedule — nothing to show in the matrix." />
      ) : null}

      {!loading && hasMatrix ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Attendance grid</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              P = present, L = late, A = absent, — = no mark yet. Read-only mode for students.
            </p>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="min-w-max border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[14rem] border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Module
                  </th>
                  {days.map((day, idx) => (
                    <th
                      key={day.date}
                      className={`min-w-[3.75rem] border border-slate-200 px-1 py-1.5 text-center align-bottom dark:border-slate-700 ${
                        day.hasLesson
                          ? idx % 2 === 0
                            ? "bg-emerald-50 dark:bg-emerald-950/25"
                            : "bg-sky-50 dark:bg-sky-950/20"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      <div className="text-base font-bold leading-none text-slate-900 dark:text-slate-100">{day.dayOfMonth}</div>
                      <div className="mt-0.5 text-[9px] font-medium uppercase text-slate-600 dark:text-slate-400">{day.weekday}</div>
                      <div className="mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">{colRates[idx]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedMatrix.map((row, rowIdx) => (
                  <tr
                    key={row.subjectName}
                    className={
                      rowIdx % 2 === 0
                        ? "bg-emerald-50/35 dark:bg-emerald-950/10"
                        : "bg-white dark:bg-slate-950/40"
                    }
                  >
                    <td
                      className={`sticky left-0 z-10 h-14 border border-slate-200 px-3 py-2 align-middle text-xs font-medium leading-snug shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] dark:border-slate-700 ${
                        rowIdx % 2 === 0 ? "bg-emerald-50/90 dark:bg-emerald-950/40" : "bg-white dark:bg-slate-950"
                      }`}
                    >
                      <span className="mr-2 tabular-nums text-slate-400">{rowIdx + 1}.</span>
                      <span className="text-slate-900 dark:text-slate-100">{row.subjectName}</span>
                    </td>
                    {row.cells.map((cell, idx) => (
                      <SubjectMatrixCellView key={`${row.subjectName}-${cell.date}-${idx}`} cell={cell} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
