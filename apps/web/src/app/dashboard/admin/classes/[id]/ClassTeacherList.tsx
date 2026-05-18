"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeacherRow = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  isHomeroom: boolean;
  subjects: string[];
};

type Props = {
  classId: string;
  count: number;
  teachers: TeacherRow[];
};

const fetchOpts: RequestInit = { credentials: "same-origin" };

export default function ClassTeacherList({ classId, count, teachers }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const setTeacherHomeroom = async (teacherId: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/teachers`, {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, isHomeroom: true }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setMessage("Homeroom teacher updated.");
        router.refresh();
        return;
      }
      setMessage(payload?.error ?? "Failed to update homeroom teacher");
    } catch {
      setMessage("Network error. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeTeacher = async (teacherId: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/classes/${encodeURIComponent(classId)}/teachers/${encodeURIComponent(teacherId)}`,
        { ...fetchOpts, method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setMessage("Teacher removed from class.");
        router.refresh();
        return;
      }
      setMessage(payload?.error ?? "Failed to remove teacher");
    } catch {
      setMessage("Network error. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Manage Teachers ({count})</h3>
      <div className="mt-3 space-y-2">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {teacher.firstName} {teacher.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {teacher.employeeId} • {teacher.isHomeroom ? "Homeroom teacher" : "Subject teacher"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Subjects in this class: {teacher.subjects.join(", ") || "Not scheduled yet"}
              </p>
            </div>
            <div className="flex gap-2">
              {!teacher.isHomeroom ? (
                <button
                  type="button"
                  onClick={() => setTeacherHomeroom(teacher.id)}
                  disabled={busy}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                >
                  Set homeroom
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeTeacher(teacher.id)}
                disabled={busy}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {!teachers.length ? <p className="text-sm text-slate-500">No teachers assigned.</p> : null}
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </article>
  );
}
