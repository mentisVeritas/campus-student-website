"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

type TeacherGradeRow = {
  id: string;
  studentName: string;
  classId: string | null;
  subjectId: string;
  subject: string;
  score: number;
  type: string;
  comment: string | null;
  gradedAt: string;
};

export default function TeacherGradesPage() {
  const [rows, setRows] = useState<TeacherGradeRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [stats, setStats] = useState<{
    averageScore: number;
    topStudent: { name: string; average: number } | null;
    below65: Array<{ name: string; average: number }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/teacher/my-classes")
      .then((response) => response.json())
      .then((payload) => setClasses(payload.data ?? []));

    fetch("/api/grades")
      .then((response) => response.json())
      .then((payload) => {
        const data = payload.data ?? [];
        setRows(data);
        const firstWithClass = data.find((row: TeacherGradeRow) => row.classId);
        if (firstWithClass) {
          setSelectedClassId(firstWithClass.classId ?? "");
          setSelectedSubjectId(firstWithClass.subjectId ?? "");
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetch(`/api/grades/stats?classId=${selectedClassId}&subjectId=${selectedSubjectId}`)
      .then((response) => response.json())
      .then((payload) => setStats(payload.data ?? null));
  }, [selectedClassId, selectedSubjectId]);

  const classOptions = classes
    .filter((item) => rows.some((row) => row.classId === item.id))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const subjectOptions = Array.from(
    new Map(
      rows
        .filter((row) => typeof row.subjectId === "string" && row.subjectId.trim().length > 0)
        .map((row) => [`${row.subjectId}::${row.subject}`, { id: row.subjectId, name: row.subject }] as const),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const downloadCsv = () => {
    if (!selectedClassId || !selectedSubjectId) return;
    window.location.href = `/api/grades/export?classId=${selectedClassId}&subjectId=${selectedSubjectId}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Grades" description="Recent grades submitted by teacher account." />
      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select class</option>
            {classOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select subject</option>
            {subjectOptions.map((item) => (
              <option key={`${item.id}::${item.name}`} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedClassId || !selectedSubjectId}
            onClick={downloadCsv}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
        {stats ? (
          <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-3">
            <p>Average: {stats.averageScore.toFixed(2)}</p>
            <p>Top: {stats.topStudent ? `${stats.topStudent.name} (${stats.topStudent.average.toFixed(2)})` : "-"}</p>
            <p>Below 65: {stats.below65.length}</p>
          </div>
        ) : null}
      </section>
      {!rows.length ? (
        <EmptyState icon="📝" title="No grades yet" description="Submit grades from class detail page." />
      ) : (
        <DataTable headers={["Student", "Subject", "Type", "Score", "Comment", "Date"]}>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">{row.studentName}</td>
              <td className="px-4 py-3">{row.subject}</td>
              <td className="px-4 py-3">{row.type}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{row.score}</td>
              <td className="px-4 py-3">{row.comment ?? "-"}</td>
              <td className="px-4 py-3">{new Date(row.gradedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
