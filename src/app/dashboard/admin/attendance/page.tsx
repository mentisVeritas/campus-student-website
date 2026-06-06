"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

type BucketRow = {
  total: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
};

type GroupRow = BucketRow & { id: string; name: string; course: number };
type SubjectRow = BucketRow & { subjectId: string; subjectName: string };
type StudentRow = BucketRow & { studentId: string; studentName: string };

type MatrixCell =
  | { date: string; kind: "no_lesson" }
  | {
      date: string;
      kind: "lesson";
      slots: Array<{
        scheduleItemId: string;
        attendanceId: string | null;
        status: "PRESENT" | "ABSENT" | "LATE" | null;
      }>;
    };

type MatrixRow = { studentId: string; studentName: string; cells: MatrixCell[] };

/** One scheduled lesson slot (period) inside a calendar day cell */
type LessonMark = {
  date: string;
  kind: "lesson";
  scheduleItemId: string;
  attendanceId: string | null;
  status: "PRESENT" | "ABSENT" | "LATE" | null;
};

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Sep-based academic year start (Sep–Aug) */
function defaultAcademicYearStart(): number {
  const d = new Date();
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

function defaultSemester(): 1 | 2 {
  const m = new Date().getMonth() + 1;
  if (m >= 9 || m <= 1) return 1;
  return 2;
}

function academicYearLabel(startYear: number): string {
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

function rateTone(rate: number): { backgroundColor: string; color: string } {
  const safe = Math.max(0, Math.min(100, rate));
  if (safe <= 75) {
    return { backgroundColor: "#ef4444", color: "#ffffff" };
  }

  const t = (safe - 75) / 25;
  const from = { r: 250, g: 204, b: 21 };
  const to = { r: 34, g: 197, b: 94 };
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);

  return {
    backgroundColor: `rgb(${r} ${g} ${b})`,
    color: safe > 92 ? "#ffffff" : "#1f2937",
  };
}

type LessonDayCell = Extract<MatrixCell, { kind: "lesson" }>;

type CycleStatus = "PRESENT" | "LATE" | "ABSENT" | null;

/** Gray → Green → Yellow → Red → Gray */
const CYCLE_ORDER: CycleStatus[] = [null, "PRESENT", "LATE", "ABSENT"];

function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLessonMark(day: LessonDayCell, slot: LessonDayCell["slots"][number]): LessonMark {
  return {
    date: day.date,
    kind: "lesson",
    scheduleItemId: slot.scheduleItemId,
    attendanceId: slot.attendanceId,
    status: slot.status,
  };
}

/** Past days without a row count as Present; today & future without row are empty (gray). */
function effectiveCycleStatus(cell: LessonMark): CycleStatus {
  const stored = cell.status;
  const today = localTodayIso();
  if (cell.date >= today) {
    return stored;
  }
  return stored ?? "PRESENT";
}

function nextCycleStatus(current: CycleStatus): CycleStatus {
  const idx = CYCLE_ORDER.indexOf(current);
  const nextIdx = idx < 0 ? 0 : (idx + 1) % CYCLE_ORDER.length;
  return CYCLE_ORDER[nextIdx];
}

function cycleLabel(status: CycleStatus): string {
  if (status === null) return "—";
  if (status === "PRESENT") return "P";
  if (status === "ABSENT") return "A";
  return "L";
}

function cycleButtonClass(status: CycleStatus): string {
  if (status === null) return "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600";
  if (status === "PRESENT") return "bg-emerald-500 text-white hover:bg-emerald-600";
  if (status === "ABSENT") return "bg-red-500 text-white hover:bg-red-600";
  return "bg-yellow-400 text-yellow-950 hover:bg-yellow-500";
}

function MatrixAttendanceCycleCell(props: {
  studentId: string;
  cell: LessonMark;
  busy: boolean;
  compact: boolean;
  onCycle: (studentId: string, cell: LessonMark) => void;
}) {
  const { studentId, cell, busy, compact, onCycle } = props;
  const visual = effectiveCycleStatus(cell);

  return (
    <button
      type="button"
      disabled={busy}
      title="Cycle: gray → green → yellow → red → gray"
      onClick={(e) => {
        e.stopPropagation();
        onCycle(studentId, cell);
      }}
      className={`flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-[3px] font-bold shadow-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 ${compact ? "px-0.5 text-[10px] leading-none" : "h-9 w-full text-sm"} ${cycleButtonClass(visual)}`}
    >
      {busy ? "…" : cycleLabel(visual)}
    </button>
  );
}

type AdminAttendancePageProps = {
  overviewApiPath?: string;
  cellApiPath?: string;
  pageTitle?: string;
  pageDescription?: string;
};

export default function AdminAttendancePage({
  overviewApiPath = "/api/admin/attendance/overview",
  cellApiPath = "/api/admin/attendance/cell",
  pageTitle = "Attendance",
  pageDescription = "Overall rate by group → subjects → students. Open a month to edit daily marks (calendar grid).",
}: AdminAttendancePageProps = {}) {
  const [classId, setClassId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [month, setMonth] = useState(defaultMonth);
  const [academicYearStart, setAcademicYearStart] = useState(defaultAcademicYearStart);
  const [semester, setSemester] = useState<1 | 2>(defaultSemester);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("academicYearStart", String(academicYearStart));
    p.set("semester", String(semester));
    return p;
  }, [academicYearStart, semester]);

  const [overallPayload, setOverallPayload] = useState<{ overall: BucketRow; groups: GroupRow[] } | null>(null);
  const [classPayload, setClassPayload] = useState<{
    class: { id: string; name: string; course: number };
    classOverall: BucketRow;
    subjects: SubjectRow[];
  } | null>(null);
  const [studentPayload, setStudentPayload] = useState<{
    class: { id: string; name: string; course: number };
    subject: SubjectRow;
    students: StudentRow[];
  } | null>(null);
  const [matrixPayload, setMatrixPayload] = useState<{
    class: { id: string; name: string; course: number };
    subject: SubjectRow;
    month: string;
    days: Array<{ date: string; dayOfMonth: number; weekday: string; hasLesson: boolean; slotIds?: string[] }>;
    students: StudentRow[];
    matrix: MatrixRow[];
  } | null>(null);

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<SubjectRow[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string>("");

  const refreshTokenRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    refreshTokenRef.current += 1;
    const token = refreshTokenRef.current;
    void (async () => {
      setLoading(true);
      try {
        if (!classId) {
          const res = await fetch(`${overviewApiPath}?${filterParams.toString()}`, { cache: "no-store" });
          const json = await res.json();
          if (token !== refreshTokenRef.current) return;
          setOverallPayload(json.data ?? null);
          setClassPayload(null);
          setStudentPayload(null);
          setMatrixPayload(null);
          return;
        }

        const classParams = new URLSearchParams(filterParams);
        classParams.set("classId", classId);
        const classRes = await fetch(`${overviewApiPath}?${classParams.toString()}`, { cache: "no-store" });
        const classJson = await classRes.json();
        if (token !== refreshTokenRef.current) return;
        setClassPayload(classJson.data ?? null);

        const ovRes = await fetch(`${overviewApiPath}?${filterParams.toString()}`, { cache: "no-store" });
        const ovJson = await ovRes.json();
        if (token !== refreshTokenRef.current) return;
        setOverallPayload(ovJson.data ?? null);

        if (!subjectId) {
          setStudentPayload(null);
          setMatrixPayload(null);
          return;
        }

        const stParams = new URLSearchParams(filterParams);
        stParams.set("classId", classId);
        stParams.set("subjectId", subjectId);
        const stRes = await fetch(`${overviewApiPath}?${stParams.toString()}`, { cache: "no-store" });
        const stJson = await stRes.json();
        if (token !== refreshTokenRef.current) return;
        setStudentPayload(stJson.data ?? null);

        const mxParams = new URLSearchParams(filterParams);
        mxParams.set("classId", classId);
        mxParams.set("subjectId", subjectId);
        mxParams.set("month", month);
        const mxRes = await fetch(`${overviewApiPath}?${mxParams.toString()}`, { cache: "no-store" });
        const mxJson = await mxRes.json();
        if (token !== refreshTokenRef.current) return;
        setMatrixPayload(mxJson.data ?? null);
      } finally {
        if (token === refreshTokenRef.current) setLoading(false);
      }
    })();
  }, [classId, subjectId, month, reloadKey, filterParams, overviewApiPath]);

  const expandStudent = async (studentId: string) => {
    if (!classId) return;
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      setExpandedSubjects(null);
      return;
    }
    setExpandedStudentId(studentId);
    const xp = new URLSearchParams(filterParams);
    xp.set("classId", classId);
    xp.set("expandStudent", studentId);
    const res = await fetch(`${overviewApiPath}?${xp.toString()}`, { cache: "no-store" });
    const json = await res.json();
    setExpandedSubjects(json.data?.studentSubjects ?? []);
  };

  const cycleAttendance = async (studentId: string, cell: LessonMark) => {
    if (cell.kind !== "lesson") return;
    const current = effectiveCycleStatus(cell);
    const next = nextCycleStatus(current);
    const key = `${studentId}-${cell.date}-${cell.scheduleItemId}`;
    setSavingKey(key);
    try {
      if (next === null) {
        const clearParams = new URLSearchParams({
          scheduleItemId: cell.scheduleItemId,
          studentId,
          date: cell.date,
        });
        const res = await fetch(`${cellApiPath}?${clearParams}`, { method: "DELETE", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(json.error ?? "Failed to clear");
          return;
        }
      } else {
        const res = await fetch(cellApiPath, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleItemId: cell.scheduleItemId,
            studentId,
            date: cell.date,
            status: next,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(json.error ?? "Failed to save");
          return;
        }
      }
      setReloadKey((k) => k + 1);
    } finally {
      setSavingKey("");
    }
  };

  const subjectCrumbName = studentPayload?.subject.subjectName ?? matrixPayload?.subject.subjectName;

  const sidebarItems = !classId
    ? (overallPayload?.groups ?? []).map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: `Course ${row.course}`,
        rate: row.attendanceRate,
        active: row.id === classId,
        onClick: () => {
          setExpandedStudentId(null);
          setExpandedSubjects(null);
          setSubjectId(null);
          setClassId(row.id);
        },
      }))
    : (classPayload?.subjects ?? []).map((row) => ({
        id: row.subjectId,
        title: row.subjectName,
        subtitle: `${row.total} marks`,
        rate: row.attendanceRate,
        active: row.subjectId === subjectId,
        onClick: () => {
          setExpandedStudentId(null);
          setExpandedSubjects(null);
          setSubjectId(row.subjectId);
        },
      }));

  const sidebarTitle = !classId ? "Groups" : "Subjects";
  const showSidebar = !subjectId;

  const backToSubjects = () => {
    setExpandedStudentId(null);
    setExpandedSubjects(null);
    setSubjectId(null);
  };

  const backToGroups = () => {
    setExpandedStudentId(null);
    setExpandedSubjects(null);
    setSubjectId(null);
    setClassId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={pageTitle} description={pageDescription} />

      <nav aria-label="Attendance path" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
        {classId ? (
          <button
            type="button"
            onClick={backToGroups}
            className="rounded font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            All groups
          </button>
        ) : (
          <span className="font-medium text-slate-900 dark:text-slate-100">All groups</span>
        )}
        {classPayload?.class.name ? (
          <>
            <span aria-hidden className="text-slate-400">
              →
            </span>
            {subjectId ? (
              <button
                type="button"
                onClick={backToSubjects}
                className="rounded font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {classPayload.class.name}
              </button>
            ) : (
              <span className="font-medium text-slate-900 dark:text-slate-100">{classPayload.class.name}</span>
            )}
          </>
        ) : null}
        {subjectCrumbName ? (
          <>
            <span aria-hidden className="text-slate-400">
              →
            </span>
            {subjectId ? (
              <button
                type="button"
                onClick={backToSubjects}
                className="rounded font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {subjectCrumbName}
              </button>
            ) : (
              <span className="font-medium text-slate-900 dark:text-slate-100">{subjectCrumbName}</span>
            )}
          </>
        ) : null}
        {matrixPayload?.month ? (
          <>
            <span aria-hidden className="text-slate-400">
              →
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{matrixPayload.month}</span>
          </>
        ) : null}
      </nav>
      <p className="h-5 text-sm text-slate-500" aria-live="polite">
        {loading ? "Loading…" : ""}
      </p>
      {!overallPayload && !loading ? <EmptyState icon="📋" title="No data" description="No attendance records yet." /> : null}

      <section className={showSidebar ? "grid gap-4 lg:grid-cols-[19rem_1fr]" : "w-full"}>
        {showSidebar ? (
          <aside className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
              <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{sidebarTitle}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {!classId ? "Select group" : classPayload?.class.name}
              </p>
            </div>
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full rounded-lg border p-2 text-left transition ${
                    item.active
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                    <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={rateTone(item.rate)}>
                      {item.rate}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <div className={`min-w-0 space-y-4 ${showSidebar ? "" : "w-full max-w-none"}`}>
          <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600">
                <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">ACADEMIC YEAR:</span>
                <select
                  value={academicYearStart}
                  onChange={(e) => setAcademicYearStart(Number(e.target.value))}
                  className="max-w-[9rem] cursor-pointer bg-transparent font-semibold text-slate-900 outline-none dark:text-slate-100"
                  aria-label="Academic year"
                >
                  {Array.from({ length: 8 }, (_, i) => defaultAcademicYearStart() - 3 + i).map((y) => (
                    <option key={y} value={y}>
                      {academicYearLabel(y)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600">
                <span className="text-slate-600 dark:text-slate-400">SEMESTER:</span>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                  className="cursor-pointer bg-transparent font-semibold text-slate-900 outline-none dark:text-slate-100"
                  aria-label="Semester"
                >
                  <option value={1}>1 (Sep–Jan)</option>
                  <option value={2}>2 (Feb–Aug)</option>
                </select>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600">
                <span className="text-slate-600 dark:text-slate-400">MONTH:</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="cursor-pointer rounded border border-transparent bg-transparent font-semibold text-slate-900 outline-none dark:text-slate-100"
                  aria-label="Calendar month"
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Overall</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{overallPayload?.overall.attendanceRate ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Group average</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{classPayload?.classOverall.attendanceRate ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Subject average</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{studentPayload?.subject.attendanceRate ?? 0}%</p>
              </div>
            </div>
          </section>

          {studentPayload && expandedStudentId && expandedSubjects ? (
            <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">All subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {expandedSubjects.map((subj) => (
                  <span key={subj.subjectId} className="rounded px-2 py-1 text-xs font-medium" style={rateTone(subj.attendanceRate)}>
                    {subj.subjectName}: {subj.attendanceRate}%
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {matrixPayload && classId && subjectId ? (
            <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Calendar matrix ({matrixPayload.month}) — edit P/A/L
              </h3>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Click a student name for all subjects. Each cell cycles: gray → green (P) → yellow (L) → red (A) → gray. Past days default to green;
                today and future start gray.
              </p>
              <div className="w-full overflow-x-auto">
                <table className="min-w-max border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[9rem] border border-slate-200 bg-slate-100 px-2 py-2 text-left dark:border-slate-700 dark:bg-slate-800">
                        Student
                      </th>
                      {matrixPayload.days.map((day, idx) => {
                        const slotCount = day.slotIds?.length ?? 0;
                        const narrowTh =
                          slotCount > 1 ? "min-w-[5rem] max-w-[6rem]" : "min-w-[2.65rem] max-w-[3.1rem]";
                        return (
                          <th
                            key={day.date}
                            className={`${narrowTh} border border-slate-200 px-0.5 py-1.5 text-center dark:border-slate-700 ${
                              day.hasLesson
                                ? idx % 2 === 0
                                  ? "bg-emerald-50 dark:bg-emerald-900/15"
                                  : "bg-sky-50 dark:bg-sky-900/15"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            }`}
                          >
                            <div className="text-xs font-semibold leading-tight">{day.dayOfMonth}</div>
                            <div className="text-[9px] uppercase leading-tight">{day.weekday}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixPayload.matrix.map((row) => (
                      <tr key={row.studentId}>
                        <td
                          role="button"
                          tabIndex={0}
                          title="Show all subjects for this student"
                          onClick={() => void expandStudent(row.studentId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void expandStudent(row.studentId);
                            }
                          }}
                          className={`sticky left-0 z-10 cursor-pointer border border-slate-200 px-2 py-2 font-medium outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:hover:bg-slate-800 ${
                            expandedStudentId === row.studentId
                              ? "bg-amber-50 dark:bg-amber-900/25"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          {row.studentName}
                        </td>
                        {row.cells.map((cell, idx) => {
                          const key = `${row.studentId}-${cell.date}-${idx}`;
                          if (cell.kind === "no_lesson") {
                            return <td key={key} className="border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />;
                          }
                          const multi = cell.slots.length > 1;
                          return (
                            <td key={key} className="border border-slate-200 p-px dark:border-slate-700">
                              <div
                                className={`flex items-stretch justify-center gap-px ${multi ? "h-8 divide-x divide-slate-300/90 dark:divide-slate-600" : "min-h-9 h-9"}`}
                              >
                                {cell.slots.map((slot) => {
                                  const mark = toLessonMark(cell, slot);
                                  const busy = savingKey === `${row.studentId}-${cell.date}-${slot.scheduleItemId}`;
                                  return (
                                    <MatrixAttendanceCycleCell
                                      key={slot.scheduleItemId}
                                      studentId={row.studentId}
                                      cell={mark}
                                      busy={busy}
                                      compact={multi}
                                      onCycle={(sid, c) => void cycleAttendance(sid, c)}
                                    />
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
