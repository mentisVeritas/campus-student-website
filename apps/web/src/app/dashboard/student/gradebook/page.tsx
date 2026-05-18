"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

const ALL_FILTER = "ALL";

type SubjectGrade = {
  subject: string;
  code: string;
  credits: number;
  average: number;
  items: Array<{
    id: string;
    score: number;
    type: string;
    comment: string | null;
    gradedAt: string;
    teacherName: string;
  }>;
};

type GradesPayload = {
  gpa: number;
  semester: string;
  subjects: SubjectGrade[];
};

type GradebookRow = {
  id: string;
  subject: string;
  code: string;
  credits: number;
  type: string;
  score: number;
  date: string;
  teacher: string;
  comment: string | null;
};

function formatDate(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function scoreTone(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (score >= 75) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
}

export default function StudentGradebookPage() {
  const [payload, setPayload] = useState<GradesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_FILTER);

  useEffect(() => {
    let mounted = true;
    fetch("/api/student/grades")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        setPayload(data.data ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setPayload(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo<GradebookRow[]>(() => {
    if (!payload) return [];
    return payload.subjects.flatMap((subject) =>
      subject.items.map((item) => ({
        id: item.id,
        subject: subject.subject,
        code: subject.code,
        credits: subject.credits,
        type: item.type,
        score: item.score,
        date: item.gradedAt,
        teacher: item.teacherName,
        comment: item.comment,
      })),
    );
  }, [payload]);

  const filteredRows = useMemo(
    () => {
      return rows.filter((row) => {
        const subjectOk = subjectFilter === ALL_FILTER || row.subject === subjectFilter;
        const typeOk = typeFilter === ALL_FILTER || row.type === typeFilter;
        return subjectOk && typeOk;
      });
    },
    [rows, subjectFilter, typeFilter],
  );

  const subjectOptions = useMemo(
    () => [ALL_FILTER, ...(payload?.subjects.map((item) => item.subject) ?? [])],
    [payload],
  );
  const typeOptions = useMemo(
    () => [ALL_FILTER, ...Array.from(new Set(rows.map((row) => row.type)))],
    [rows],
  );

  const statCards = useMemo(() => {
    const totalSubjects = payload?.subjects.length ?? 0;
    const totalAssessments = rows.length;
    const topSubject = payload?.subjects.reduce((best, current) => {
      if (!best) return current;
      return current.average > best.average ? current : best;
    }, null as SubjectGrade | null);
    return {
      totalSubjects,
      totalAssessments,
      gpa: payload?.gpa ?? 0,
      semester: payload?.semester ?? "-",
      topSubject: topSubject ? `${topSubject.subject} (${topSubject.average.toFixed(1)})` : "-",
    };
  }, [payload, rows.length]);

  return (
    <div className="space-y-4">
      <PageHeader title="Gradebook" description="Full history of grades with filters by subject and type." />
      {loading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Loading gradebook...
        </div>
      ) : !payload ? (
        <EmptyState icon="📚" title="No data yet" description="Gradebook data is not available." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Semester</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{statCards.semester}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">GPA</p>
              <p className="mt-1 text-base font-semibold text-indigo-600 dark:text-indigo-400">{statCards.gpa.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Subjects</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{statCards.totalSubjects}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Assessments</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{statCards.totalAssessments}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Subject</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{statCards.topSubject}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/60">
                <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rows shown</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {filteredRows.length} / {rows.length}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => {
                  setSubjectFilter(ALL_FILTER);
                  setTypeFilter(ALL_FILTER);
                }}
              >
                Reset filters
              </button>
            </div>
          </div>

          {!filteredRows.length ? (
            <EmptyState icon="🧾" title="No rows for selected filters" description="Try another subject or grade type." />
          ) : (
            <DataTable headers={["Subject", "Code", "Type", "Score", "Date", "Teacher", "Comment"]}>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{row.subject}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.credits} credits</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.code}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(row.score)}`}>{row.score}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">{row.teacher}</td>
                  <td className="px-4 py-3">{row.comment ?? "-"}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}
    </div>
  );
}
