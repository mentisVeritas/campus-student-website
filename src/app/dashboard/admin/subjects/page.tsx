"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, GripVertical, Plus, UserSquare2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

type Subject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  teachersCount: number;
};

type TeacherSubject = {
  id: string;
  name: string;
  code: string;
};

type Teacher = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  subjects: TeacherSubject[];
};

type Payload = {
  subjects: Subject[];
  teachers: Teacher[];
};

const fetchOpts: RequestInit = { credentials: "same-origin" };

export default function AdminTeacherSubjectsPage() {
  const [data, setData] = useState<Payload>({ subjects: [], teachers: [] });
  const [loading, setLoading] = useState(false);
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [busyTeacherId, setBusyTeacherId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [form, setForm] = useState({ name: "", code: "", credits: "3" });

  const subjectsById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/teacher-subjects", fetchOpts);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Failed to load teachers and subjects");
        return;
      }
      setData(payload.data ?? { subjects: [], teachers: [] });
      setMessage("");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const assign = async (teacherId: string, subjectId: string) => {
    setBusyTeacherId(teacherId);
    try {
      const response = await fetch("/api/admin/teacher-subjects", {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, subjectId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not assign subject");
        return;
      }
      await load();
      setMessage("Subject assigned.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusyTeacherId(null);
    }
  };

  const unassign = async (teacherId: string, subjectId: string) => {
    setBusyTeacherId(teacherId);
    try {
      const response = await fetch("/api/admin/teacher-subjects", {
        ...fetchOpts,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, subjectId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not remove subject");
        return;
      }
      await load();
      setMessage("Subject removed.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusyTeacherId(null);
    }
  };

  const createSubject = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/subjects", {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          credits: Number(form.credits || "3"),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not create subject");
        return;
      }
      setForm({ name: "", code: "", credits: "3" });
      await load();
      setMessage("Subject created.");
    } catch {
      setMessage("Network error. Try again.");
    }
  };

  const onDropToTeacher = async (teacherId: string) => {
    const subjectId = draggedSubjectId;
    setDraggedSubjectId(null);
    if (!subjectId) return;
    const teacher = data.teachers.find((t) => t.id === teacherId);
    const dragged = subjectsById.get(subjectId);
    if (!dragged) return;
    if (teacher?.subjects.some((s) => s.id === subjectId)) return;
    await assign(teacherId, subjectId);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teacher Subject Matrix"
        description="Drag subjects from the right and drop onto teacher cards to grant teaching access."
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        }
      />

      {message ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <UserSquare2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Teachers</h3>
          </div>
          <div className="space-y-3">
            {data.teachers.map((teacher) => (
              <div
                key={teacher.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void onDropToTeacher(teacher.id)}
                className="rounded-lg border border-slate-200 p-3 transition hover:border-indigo-300 dark:border-slate-700"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {teacher.firstName} {teacher.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.employeeId}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {teacher.subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-200"
                    >
                      {subject.name}
                      <button
                        type="button"
                        disabled={busyTeacherId === teacher.id}
                        onClick={() => void unassign(teacher.id, subject.id)}
                        className="rounded-full p-0.5 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 dark:text-indigo-200 dark:hover:bg-indigo-500/25"
                        aria-label={`Remove ${subject.name} from ${teacher.firstName} ${teacher.lastName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {!teacher.subjects.length ? (
                    <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                      Drop subject here
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            {!data.teachers.length ? <p className="text-sm text-slate-500">No teachers found.</p> : null}
          </div>
        </article>

        <article className="space-y-4">
          <form
            onSubmit={createSubject}
            className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Subject</h3>
            </div>
            <div className="space-y-2">
              <input
                value={form.name}
                onChange={(event) => setForm((s) => ({ ...s, name: event.target.value }))}
                placeholder="Subject name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.code}
                  onChange={(event) => setForm((s) => ({ ...s, code: event.target.value.toUpperCase() }))}
                  placeholder="Code"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.credits}
                  onChange={(event) => setForm((s) => ({ ...s, credits: event.target.value }))}
                  placeholder="Credits"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <button type="submit" className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Create
            </button>
          </form>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Subjects (drag)</h3>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {data.subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggedSubjectId(subject.id)}
                  onDragEnd={() => setDraggedSubjectId(null)}
                  className="w-full cursor-grab rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300 active:cursor-grabbing dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{subject.name}</p>
                    <GripVertical className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {subject.code} • {subject.credits} credits • {subject.teachersCount} teachers
                  </p>
                </button>
              ))}
              {!data.subjects.length ? <p className="text-sm text-slate-500">No subjects yet.</p> : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
