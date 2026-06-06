"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  isBlocked: boolean;
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
  initialRole: "ADMIN" | "TEACHER" | "STUDENT" | "CANTEEN_STAFF";
  initialStudentYear: number | null;
  initialStudentClassId: string | null;
  initialTeacherDepartment: string | null;
  initialTeacherSubjectIds: string[];
  initialTeacherClassIds: string[];
  initialHomeroomClassId: string | null;
  classes: Array<{ id: string; name: string; year: number }>;
  subjects: Array<{ id: string; name: string }>;
};

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function UserStatusAction({
  userId,
  isBlocked,
  initialEmail,
  initialFirstName,
  initialLastName,
  initialRole,
  initialStudentYear,
  initialStudentClassId,
  initialTeacherDepartment,
  initialTeacherSubjectIds,
  initialTeacherClassIds,
  initialHomeroomClassId,
  classes,
  subjects,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [role, setRole] = useState(initialRole);
  const [studentYear, setStudentYear] = useState(initialStudentYear ?? 1);
  const [studentClassId, setStudentClassId] = useState(initialStudentClassId ?? "");
  const [teacherDepartment, setTeacherDepartment] = useState(initialTeacherDepartment ?? "General");
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>(initialTeacherSubjectIds ?? []);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>(initialTeacherClassIds ?? []);
  const [homeroomClassId, setHomeroomClassId] = useState(initialHomeroomClassId ?? "");

  const toggle = async () => {
    setMessage("");
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: isBlocked ? "UNBLOCK" : "PERMANENT" }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(payload.error ?? "Failed to change user status");
      return;
    }
    router.refresh();
  };

  const toggleArrayItem = (value: string, setter: (next: string[]) => void, current: string[]) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
      return;
    }
    setter([...current, value]);
  };

  const saveEdit = async () => {
    setMessage("");
    setBusy(true);
    const safeFirstName = String(firstName ?? "").trim();
    const safeLastName = String(lastName ?? "").trim();
    const safeEmail = String(email ?? "").trim().toLowerCase();
    if (!safeFirstName || !safeLastName || !safeEmail) {
      setBusy(false);
      setMessage("Email, first name and last name are required.");
      return;
    }
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: safeEmail,
        firstName: safeFirstName,
        lastName: safeLastName,
        role,
        ...(role === "STUDENT"
          ? {
              studentYear: studentYear ?? 1,
              studentClassId: studentClassId || null,
            }
          : {}),
        ...(role === "TEACHER"
          ? {
              teacherDepartment: teacherDepartment || "General",
              teacherSubjectIds,
              teacherClassIds,
              homeroomClassId: homeroomClassId || null,
            }
          : {}),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(payload.error ?? "Failed to update user");
      return;
    }
    setEditOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
            isBlocked
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          }`}
        >
          {busy ? "Saving..." : isBlocked ? "Blocked" : "Active"}
        </button>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-md border border-indigo-300 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
        >
          Edit
        </button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit user</h3>
        {message ? (
          <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">{message}</p>
        ) : null}
        <div className="mt-3 grid gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Props["initialRole"])}
            className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="STUDENT">STUDENT</option>
            <option value="TEACHER">TEACHER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CANTEEN_STAFF">CANTEEN_STAFF</option>
          </select>

          {role === "STUDENT" ? (
            <>
              <input
                type="number"
                min={1}
                max={6}
                value={studentYear}
                onChange={(e) => setStudentYear(Number(e.target.value || 1))}
                placeholder="Course year"
                className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <select
                value={studentClassId}
                onChange={(e) => setStudentClassId(e.target.value)}
                className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No group</option>
                {classes.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} (Year {group.year})
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {role === "TEACHER" ? (
            <>
              <input
                value={teacherDepartment}
                onChange={(e) => setTeacherDepartment(e.target.value)}
                placeholder="Department"
                className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />

              <div className="rounded border p-2 text-sm dark:border-slate-600">
                <p className="mb-1 text-xs font-semibold text-slate-500">Available subjects</p>
                <div className="grid max-h-32 gap-1 overflow-auto pr-1">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={teacherSubjectIds.includes(subject.id)}
                        onChange={() => toggleArrayItem(subject.id, setTeacherSubjectIds, teacherSubjectIds)}
                      />
                      <span>{subject.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded border p-2 text-sm dark:border-slate-600">
                <p className="mb-1 text-xs font-semibold text-slate-500">Teacher groups</p>
                <div className="grid max-h-32 gap-1 overflow-auto pr-1">
                  {classes.map((group) => (
                    <label key={group.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={teacherClassIds.includes(group.id)}
                        onChange={() => toggleArrayItem(group.id, setTeacherClassIds, teacherClassIds)}
                      />
                      <span>
                        {group.name} (Year {group.year})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <select
                value={homeroomClassId}
                onChange={(e) => setHomeroomClassId(e.target.value)}
                className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No curator class</option>
                {classes
                  .filter((group) => teacherClassIds.includes(group.id))
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      Curator: {group.name}
                    </option>
                  ))}
              </select>
            </>
          ) : null}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(false)}
            className="rounded border px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={busy}
            className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </Modal>
    </>
  );
}
