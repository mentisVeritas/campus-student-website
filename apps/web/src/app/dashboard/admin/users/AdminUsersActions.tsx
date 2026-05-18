"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "CANTEEN_STAFF";

type Props = {
  classes: Array<{ id: string; name: string; year: number }>;
  subjects: Array<{ id: string; name: string }>;
  systemLockedInitial: boolean;
  systemLockedUntilInitial: string | null;
};

function normalizeMinutesInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  const value = Number(digits);
  if (!Number.isFinite(value)) return "";
  return String(Math.min(9999, Math.max(0, value)));
}

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="rounded border px-2 py-1 text-xs dark:border-slate-600 dark:text-slate-200">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminUsersActions({ classes, subjects, systemLockedInitial, systemLockedUntilInitial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [systemLockOpen, setSystemLockOpen] = useState(false);
  const [systemLocked, setSystemLocked] = useState<boolean>(systemLockedInitial);
  const [systemLockedUntil, setSystemLockedUntil] = useState<string | null>(systemLockedUntilInitial);

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "STUDENT" as Role,
    year: 1,
    studentClassId: "",
    department: "General",
    teacherSubjectIds: [] as string[],
    teacherClassIds: [] as string[],
    homeroomClassId: "",
  });
  const [lockForm, setLockForm] = useState({
    locked: true,
    temporary: true,
    durationMinutesInput: "120",
    reason: "Maintenance",
  });

  const lockDurationMinutes = Math.max(1, Number(lockForm.durationMinutesInput) || 120);
  const systemStatusLabel = useMemo(() => {
    if (!systemLocked) return "System: ACTIVE";
    if (!systemLockedUntil) return "System: LOCKED";
    return `System locked until ${new Date(systemLockedUntil).toLocaleString()}`;
  }, [systemLocked, systemLockedUntil]);

  const createUser = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createForm.email,
        password: createForm.password,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        role: createForm.role,
        ...(createForm.role === "STUDENT" ? { year: createForm.year } : {}),
        ...(createForm.role === "STUDENT" ? { studentClassId: createForm.studentClassId || null } : {}),
        ...(createForm.role === "TEACHER"
          ? {
              department: createForm.department,
              teacherSubjectIds: createForm.teacherSubjectIds,
              teacherClassIds: createForm.teacherClassIds,
              homeroomClassId: createForm.homeroomClassId || null,
            }
          : {}),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(payload.error ?? "Failed to create user");
      return;
    }
    setCreateOpen(false);
    router.refresh();
  };

  const setSystemLock = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/system-lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locked: lockForm.locked,
        reason: lockForm.locked ? lockForm.reason : null,
        ...(lockForm.locked && lockForm.temporary ? { minutes: lockDurationMinutes } : {}),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(payload.error ?? "Failed to change system lock");
      return;
    }
    setSystemLocked(lockForm.locked);
    setSystemLockedUntil(
      lockForm.locked ? (lockForm.temporary ? new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString() : null) : null,
    );
    setSystemLockOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        disabled={busy}
      >
        Create user
      </button>
      <button
        type="button"
        onClick={() => {
          if (systemLocked) {
            setLockForm((prev) => ({ ...prev, locked: false }));
          } else {
            setLockForm((prev) => ({ ...prev, locked: true, temporary: true, durationMinutesInput: "120" }));
          }
          setSystemLockOpen(true);
        }}
        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
          systemLocked ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"
        }`}
        disabled={busy}
      >
        {systemLocked ? "Unlock system" : "Lock system"}
      </button>
      <span className={`rounded-lg px-3 py-2 text-xs font-medium ${systemLocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
        {systemStatusLabel}
      </span>

      <Modal title="Create user" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid gap-2 md:grid-cols-2">
          <input value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <input value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Temporary password" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <input value={createForm.firstName} onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <input value={createForm.lastName} onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as Role }))} className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="STUDENT">STUDENT</option><option value="TEACHER">TEACHER</option><option value="ADMIN">ADMIN</option><option value="CANTEEN_STAFF">CANTEEN_STAFF</option>
          </select>
          {createForm.role === "STUDENT" ? <input type="number" value={createForm.year} onChange={(e) => setCreateForm((p) => ({ ...p, year: Number(e.target.value || 1) }))} placeholder="Course year" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /> : null}
          {createForm.role === "STUDENT" ? (
            <select
              value={createForm.studentClassId}
              onChange={(e) => setCreateForm((p) => ({ ...p, studentClassId: e.target.value }))}
              className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">No group</option>
              {classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} (Year {group.year})
                </option>
              ))}
            </select>
          ) : null}
          {createForm.role === "TEACHER" ? <input value={createForm.department} onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /> : null}
          {createForm.role === "TEACHER" ? (
            <>
              <div className="rounded border p-2 text-sm dark:border-slate-600 md:col-span-2">
                <p className="mb-1 text-xs font-semibold text-slate-500">Available subjects</p>
                <div className="grid max-h-32 gap-1 overflow-auto pr-1">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.teacherSubjectIds.includes(subject.id)}
                        onChange={() =>
                          setCreateForm((prev) => ({
                            ...prev,
                            teacherSubjectIds: prev.teacherSubjectIds.includes(subject.id)
                              ? prev.teacherSubjectIds.filter((item) => item !== subject.id)
                              : [...prev.teacherSubjectIds, subject.id],
                          }))
                        }
                      />
                      <span>{subject.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded border p-2 text-sm dark:border-slate-600 md:col-span-2">
                <p className="mb-1 text-xs font-semibold text-slate-500">Teacher groups</p>
                <div className="grid max-h-32 gap-1 overflow-auto pr-1">
                  {classes.map((group) => (
                    <label key={group.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.teacherClassIds.includes(group.id)}
                        onChange={() =>
                          setCreateForm((prev) => ({
                            ...prev,
                            teacherClassIds: prev.teacherClassIds.includes(group.id)
                              ? prev.teacherClassIds.filter((item) => item !== group.id)
                              : [...prev.teacherClassIds, group.id],
                          }))
                        }
                      />
                      <span>{group.name} (Year {group.year})</span>
                    </label>
                  ))}
                </div>
              </div>
              <select
                value={createForm.homeroomClassId}
                onChange={(e) => setCreateForm((p) => ({ ...p, homeroomClassId: e.target.value }))}
                className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 md:col-span-2"
              >
                <option value="">No curator class</option>
                {classes
                  .filter((group) => createForm.teacherClassIds.includes(group.id))
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
          <button type="button" onClick={() => setCreateOpen(false)} className="rounded border px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">Cancel</button>
          <button type="button" onClick={() => void createUser()} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" disabled={busy}>Create</button>
        </div>
      </Modal>

      <Modal title="System lock" open={systemLockOpen} onClose={() => setSystemLockOpen(false)}>
        <div className="grid gap-2">
          {lockForm.locked ? (
            <>
              <label className="flex items-center gap-2 text-sm dark:text-slate-200">
                <input type="checkbox" checked={lockForm.temporary} onChange={(e) => setLockForm((p) => ({ ...p, temporary: e.target.checked }))} />
                Temporary lock
              </label>
              {lockForm.temporary ? (
                <div className="space-y-1">
                  <input
                    inputMode="numeric"
                    value={lockForm.durationMinutesInput}
                    onChange={(e) =>
                      setLockForm((p) => ({ ...p, durationMinutesInput: normalizeMinutesInput(e.target.value) }))
                    }
                    className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Minutes (e.g. 90)"
                  />
                  <p className="text-xs text-slate-500">Type one number in minutes. Example: 90 = 1h 30m.</p>
                </div>
              ) : null}
              <input value={lockForm.reason} onChange={(e) => setLockForm((p) => ({ ...p, reason: e.target.value }))} className="rounded border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Reason" />
            </>
          ) : (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              System will be unlocked immediately.
            </p>
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setSystemLockOpen(false)} className="rounded border px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">Cancel</button>
          <button type="button" onClick={() => void setSystemLock()} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" disabled={busy}>Apply</button>
        </div>
      </Modal>
    </div>
  );
}
