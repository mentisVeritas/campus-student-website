"use client";

import { GradeType } from "@prisma/client";
import { useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type StudentRow = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email: string;
};

type SubjectRow = {
  id: string;
  name: string;
};

type GradeEntryClientProps = {
  classId: string;
  students: StudentRow[];
  subjects: SubjectRow[];
};

const gradeTypes: GradeType[] = ["QUIZ", "MIDTERM", "FINAL", "ASSIGNMENT"];

export default function GradeEntryClient({ classId, students, subjects }: GradeEntryClientProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? "");
  const [scoreByStudent, setScoreByStudent] = useState<Record<string, string>>({});
  const [typeByStudent, setTypeByStudent] = useState<Record<string, GradeType>>({});
  const [commentByStudent, setCommentByStudent] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId)?.name ?? "Subject",
    [selectedSubjectId, subjects],
  );

  const handleScoreChange = (studentId: string, raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (!digitsOnly) {
      setScoreByStudent((state) => ({ ...state, [studentId]: "" }));
      return;
    }
    const numeric = Number(digitsOnly);
    const clamped = Math.max(0, Math.min(100, numeric));
    setScoreByStudent((state) => ({
      ...state,
      [studentId]: String(clamped),
    }));
  };

  const submitOne = async (studentId: string) => {
    const scoreRaw = scoreByStudent[studentId];
    const parsedScore = Number(scoreRaw);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      setStatus("Score must be a number between 0 and 100.");
      return;
    }
    if (!selectedSubjectId) {
      setStatus("Select subject first.");
      return;
    }

    setSavingId(studentId);
    setStatus("");
    const response = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        subjectId: selectedSubjectId,
        score: parsedScore,
        type: typeByStudent[studentId] ?? "QUIZ",
        comment: commentByStudent[studentId] || undefined,
      }),
    });
    const payload = await response.json();
    setSavingId(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Failed to save grade.");
      return;
    }
    setStatus(`Saved for ${studentId} in ${selectedSubjectName}.`);
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Class</p>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">{classId}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</span>
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {students.map((student) => (
          <div key={student.id} className="grid gap-2 rounded-lg border border-slate-100 p-3 xl:grid-cols-[1.4fr_0.8fr_0.9fr_1.6fr_auto] dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{student.studentCode}</p>
            </div>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="Score"
              value={scoreByStudent[student.id] ?? ""}
              onChange={(event) => handleScoreChange(student.id, event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={typeByStudent[student.id] ?? "QUIZ"}
              onChange={(event) =>
                setTypeByStudent((state) => ({
                  ...state,
                  [student.id]: event.target.value as GradeType,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {gradeTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Comment"
              value={commentByStudent[student.id] ?? ""}
              onChange={(event) =>
                setCommentByStudent((state) => ({
                  ...state,
                  [student.id]: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => submitOne(student.id)}
              disabled={savingId === student.id}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingId === student.id ? <LoadingSpinner /> : null}
              Save
            </button>
          </div>
        ))}
      </div>
      {status ? <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{status}</p> : null}
    </div>
  );
}
