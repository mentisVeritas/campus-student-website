"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StudentRow = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Props = {
  classId: string;
  count: number;
  students: StudentRow[];
  unassignedStudents: StudentRow[];
};

const fetchOpts: RequestInit = { credentials: "same-origin" };

export default function ClassStudentList({ classId, count, students, unassignedStudents }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const addStudent = async (studentId: string) => {
    if (!studentId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/students`, {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setMessage("Student added to class.");
        router.refresh();
        return;
      }
      setMessage(payload?.error ?? "Failed to assign student");
    } catch {
      setMessage("Network error. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`,
        { ...fetchOpts, method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setMessage("Student removed from class.");
        router.refresh();
        return;
      }
      setMessage(payload?.error ?? "Failed to remove student");
    } catch {
      setMessage("Network error. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Manage Students ({count})</h3>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">In this class</p>
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {student.studentCode} • Class member
                </p>
                <p className="mt-1 text-xs text-slate-500">{student.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => removeStudent(student.id)}
                  disabled={busy}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!students.length ? <p className="text-sm text-slate-500">No students in this class yet.</p> : null}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Not assigned to a class</p>
        <div className="space-y-2">
          {unassignedStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-slate-500">{student.studentCode} • Unassigned</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addStudent(student.id)}
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
          {!unassignedStudents.length ? (
            <p className="text-sm text-slate-500">No unassigned students left.</p>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </article>
  );
}
