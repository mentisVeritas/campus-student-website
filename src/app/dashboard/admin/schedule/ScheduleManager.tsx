"use client";

import { Fragment, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

type Option = { id: string; label: string; subjectIds?: string[] };

type ScheduleRow = {
  id: string;
  class: { id: string; name: string; year: number };
  subject: { id: string; name: string; code: string };
  teacher: { id: string; user: { firstName: string; lastName: string } };
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI";
  startTime: string;
  endTime: string;
  room: string;
  changeNote: string | null;
};
type BoardScheduleRow = ScheduleRow & {
  sharedWith: Array<{ id: string; name: string; year: number }>;
  isSharedLesson: boolean;
};

type Props = {
  initialRows: ScheduleRow[];
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
};

const weekdays = ["MON", "TUE", "WED", "THU", "FRI"] as const;
const weekdayLabels: Record<(typeof weekdays)[number], string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
};
const slotOptions = [
  { start: "09:00", end: "10:20" },
  { start: "10:30", end: "11:50" },
  { start: "12:00", end: "13:20" },
  { start: "14:20", end: "15:40" },
  { start: "15:50", end: "17:10" },
  { start: "17:20", end: "18:40" },
] as const;
function getSlotEndByStart(start: string): string {
  return slotOptions.find((slot) => slot.start === start)?.end ?? "";
}

const ADMIN_SCHEDULE_CONFIRM = "ADMIN_SCHEDULE_CONFIRM";

type JsonRecord = Record<string, unknown>;

async function postOrPatchScheduleWithConfirm(
  url: string,
  method: "POST" | "PATCH",
  body: JsonRecord,
): Promise<{
  ok: boolean;
  userCancelled?: boolean;
  payload: { data?: unknown; error?: string; code?: string; warnings?: string[] };
}> {
  const exec = async (payload: JsonRecord) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await response.json();
    return { response, payload: raw as { data?: unknown; error?: string; code?: string; warnings?: string[] } };
  };

  const first = await exec(body);
  if (
    first.response.status === 409 &&
    first.payload?.code === ADMIN_SCHEDULE_CONFIRM &&
    Array.isArray(first.payload.warnings) &&
    first.payload.warnings.length > 0
  ) {
    const lines = first.payload.warnings.map((w) => `• ${w}`).join("\n");
    const proceed = window.confirm(
      `${first.payload.error ?? "Scheduling guidelines would be violated."}\n\n${lines}\n\nSave anyway?`,
    );
    if (!proceed) return { ok: false, userCancelled: true, payload: first.payload };
    const second = await exec({ ...body, confirmAdminOverrides: true });
    return { ok: second.response.ok, payload: second.payload };
  }
  return { ok: first.response.ok, payload: first.payload };
}

export default function ScheduleManager({ initialRows, classes, subjects, teachers }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [selectedClassFilter, setSelectedClassFilter] = useState(classes[0]?.id ?? "");
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    dayOfWeek: (typeof weekdays)[number];
    startTime: string;
    endTime: string;
  }>({
    open: false,
    dayOfWeek: "MON",
    startTime: slotOptions[0].start,
    endTime: slotOptions[0].end,
  });
  const [createForm, setCreateForm] = useState({
    subjectId: subjects[0]?.id ?? "",
    teacherId: teachers[0]?.id ?? "",
    room: "A-101",
    changeNote: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: (typeof weekdays)[number];
    startTime: string;
    endTime: string;
    room: string;
    changeNote: string;
  }>({
    classId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "MON" as (typeof weekdays)[number],
    startTime: slotOptions[0].start,
    endTime: slotOptions[0].end,
    room: "",
    changeNote: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teachersForSubjectCreate = useMemo(
    () => teachers.filter((teacher) => !teacher.subjectIds || teacher.subjectIds.includes(createForm.subjectId)),
    [createForm.subjectId, teachers],
  );
  const teachersForSubjectEdit = useMemo(
    () => teachers.filter((teacher) => !teacher.subjectIds || teacher.subjectIds.includes(editForm.subjectId)),
    [editForm.subjectId, teachers],
  );
  const boardRows = useMemo(() => {
    const selectedClassRows = rows.filter((row) => row.class.id === selectedClassFilter);
    return selectedClassRows.map((row) => {
      const sharedWith = rows
        .filter(
          (candidate) =>
            candidate.id !== row.id &&
            candidate.dayOfWeek === row.dayOfWeek &&
            candidate.startTime === row.startTime &&
            candidate.endTime === row.endTime &&
            candidate.teacher.id === row.teacher.id &&
            candidate.subject.id === row.subject.id &&
            candidate.room === row.room &&
            candidate.class.year === row.class.year,
        )
        .map((candidate) => ({ id: candidate.class.id, name: candidate.class.name, year: candidate.class.year }));
      return {
        ...row,
        sharedWith,
        isSharedLesson: sharedWith.length > 0,
      } satisfies BoardScheduleRow;
    });
  }, [rows, selectedClassFilter]);
  const visibleRows = useMemo(() => rows.filter((row) => row.class.id === selectedClassFilter), [rows, selectedClassFilter]);
  const boardBySlot = useMemo(() => {
    const map = new Map<string, BoardScheduleRow>();
    for (const row of boardRows) {
      map.set(`${row.dayOfWeek}__${row.startTime}`, row);
    }
    return map;
  }, [boardRows]);

  const refresh = async () => {
    const response = await fetch("/api/admin/schedule");
    const payload = await response.json();
    setRows(payload.data ?? []);
  };

  const createSlot = async () => {
    if (busy || !createModal.open) return;
    if (!createForm.subjectId || !createForm.teacherId || !createForm.room.trim()) {
      setError("Please select subject, teacher and room.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { ok, userCancelled, payload } = await postOrPatchScheduleWithConfirm("/api/admin/schedule", "POST", {
        classId: selectedClassFilter,
        subjectId: createForm.subjectId,
        teacherId: createForm.teacherId,
        dayOfWeek: createModal.dayOfWeek,
        startTime: createModal.startTime,
        endTime: createModal.endTime,
        room: createForm.room.trim(),
        changeNote: createForm.changeNote.trim() || null,
      });
      if (!ok) {
        if (userCancelled) setError(null);
        else setError(payload.error ?? "Failed to create schedule slot");
        return;
      }
      setCreateModal((prev) => ({ ...prev, open: false }));
      setCreateForm((prev) => ({ ...prev, changeNote: "" }));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const prepareFromBoardCell = (dayOfWeek: (typeof weekdays)[number], startTime: string) => {
    const endTime = getSlotEndByStart(startTime);
    setCreateModal({
      open: true,
      dayOfWeek,
      startTime,
      endTime,
    });
    setEditingId(null);
    setError(null);
  };

  const startEdit = (row: ScheduleRow) => {
    setEditingId(row.id);
    setEditForm({
      classId: row.class.id,
      subjectId: row.subject.id,
      teacherId: row.teacher.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      changeNote: row.changeNote ?? "",
    });
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, userCancelled, payload } = await postOrPatchScheduleWithConfirm(`/api/admin/schedule/${editingId}`, "PATCH", {
        classId: editForm.classId,
        subjectId: editForm.subjectId,
        teacherId: editForm.teacherId,
        dayOfWeek: editForm.dayOfWeek,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        room: editForm.room,
        changeNote: editForm.changeNote.trim() || null,
      });
      if (!ok) {
        if (userCancelled) setError(null);
        else setError(payload.error ?? "Failed to update schedule slot");
        return;
      }
      setEditingId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const deleteSlot = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/schedule/${id}`, { method: "DELETE" });
      const raw = await response.text();
      let payload: { error?: string } = {};
      if (raw) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          payload = {};
        }
      }
      if (!response.ok) {
        setError(payload.error ?? "Failed to delete schedule slot");
        return;
      }
      await refresh();
      if (editingId === id) setEditingId(null);
    } finally {
      setBusy(false);
    }
  };

  const applyNote = async (id: string, note: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNote: note }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to update change note");
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, changeNote: payload.data.changeNote } : row)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Class filter</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose class, then click + Add lesson on the board.</p>
        <div className="mt-3">
          <select
            value={selectedClassFilter}
            onChange={async (e) => {
              const next = e.target.value;
              setSelectedClassFilter(next);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {classes.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </section>

      {createModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setCreateModal((prev) => ({ ...prev, open: false }))}>
          <div
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add lesson</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {weekdayLabels[createModal.dayOfWeek]} | {createModal.startTime} - {createModal.endTime}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={createForm.subjectId}
                onChange={(e) => {
                  const subjectId = e.target.value;
                  setCreateForm((prev) => {
                    const nextTeacherOptions = teachers.filter(
                      (teacher) => !teacher.subjectIds || teacher.subjectIds.includes(subjectId),
                    );
                    const hasCurrent = nextTeacherOptions.some((teacher) => teacher.id === prev.teacherId);
                    return {
                      ...prev,
                      subjectId,
                      teacherId: hasCurrent ? prev.teacherId : (nextTeacherOptions[0]?.id ?? ""),
                    };
                  });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {subjects.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={createForm.teacherId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {teachersForSubjectCreate.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {!teachersForSubjectCreate.length ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 md:col-span-2">
                  No teachers linked to this subject. Pick another subject or assign teachers in admin.
                </p>
              ) : null}
              <input
                type="text"
                value={createForm.room}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, room: e.target.value }))}
                placeholder="Room"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                type="text"
                value={createForm.changeNote}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, changeNote: e.target.value }))}
                placeholder="Optional change note"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void createSlot()}
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreateModal((prev) => ({ ...prev, open: false }))}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Class schedule board</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Click empty slot to prefill creation form. Click existing lesson to edit it.
        </p>
        <div className="mt-3 overflow-auto">
          <div className="grid min-w-[980px] grid-cols-6 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Time
            </div>
            {weekdays.map((day) => (
              <div
                key={day}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {weekdayLabels[day]}
              </div>
            ))}

            {slotOptions.map((slot) => {
              const startTime = slot.start;
              const endTime = slot.end;
              return (
                <Fragment key={startTime}>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <p className="font-semibold">{startTime}</p>
                    <p>{endTime}</p>
                  </div>
                  {weekdays.map((day) => {
                    const row = boardBySlot.get(`${day}__${startTime}`);
                    return row ? (
                      <button
                        key={`${day}-${startTime}`}
                        type="button"
                        onClick={() => startEdit(row)}
                        className={`min-h-[112px] rounded-lg border p-3 text-left shadow-sm transition-colors ${
                          row.isSharedLesson
                            ? "border-fuchsia-300 bg-fuchsia-50 hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-fuchsia-900/30 dark:hover:bg-fuchsia-900/45"
                            : row.changeNote
                            ? "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/45"
                            : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/45"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.subject.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {row.startTime} - {row.endTime}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Room {row.room}</p>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">Teacher: {row.teacher.user.firstName}</p>
                        {row.isSharedLesson ? (
                          <p className="mt-1 text-[11px] font-medium text-fuchsia-700 dark:text-fuchsia-300">
                            Shared with: {row.sharedWith.map((item) => `${item.name} (Year ${item.year})`).join(", ")}
                          </p>
                        ) : null}
                        {row.changeNote ? (
                          <p className="mt-1 line-clamp-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">{row.changeNote}</p>
                        ) : null}
                      </button>
                    ) : (
                      <button
                        key={`${day}-${startTime}`}
                        type="button"
                        onClick={() => prepareFromBoardCell(day, startTime)}
                        className="min-h-[112px] rounded-lg border border-dashed border-slate-300 bg-white p-3 text-left text-xs text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                      >
                        + Add lesson
                      </button>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {editingId ? (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm dark:border-indigo-700 dark:bg-indigo-900/20">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit slot</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select
              value={editForm.classId}
              onChange={(e) => setEditForm((prev) => ({ ...prev, classId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {classes.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={editForm.subjectId}
              onChange={(e) => {
                const subjectId = e.target.value;
                setEditForm((prev) => {
                  const nextTeacherOptions = teachers.filter(
                    (teacher) => !teacher.subjectIds || teacher.subjectIds.includes(subjectId),
                  );
                  const hasCurrent = nextTeacherOptions.some((teacher) => teacher.id === prev.teacherId);
                  return {
                    ...prev,
                    subjectId,
                    teacherId: hasCurrent ? prev.teacherId : (nextTeacherOptions[0]?.id ?? ""),
                  };
                });
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {subjects.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={editForm.teacherId}
              onChange={(e) => setEditForm((prev) => ({ ...prev, teacherId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {teachersForSubjectEdit.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={editForm.dayOfWeek}
              onChange={(e) => setEditForm((prev) => ({ ...prev, dayOfWeek: e.target.value as (typeof weekdays)[number] }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {weekdays.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              value={editForm.startTime}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  startTime: e.target.value,
                  endTime: getSlotEndByStart(e.target.value),
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {slotOptions.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {slot.start} - {slot.end}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={editForm.endTime}
              readOnly
              className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <input
              type="text"
              value={editForm.room}
              onChange={(e) => setEditForm((prev) => ({ ...prev, room: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="text"
              value={editForm.changeNote}
              onChange={(e) => setEditForm((prev) => ({ ...prev, changeNote: e.target.value }))}
              placeholder="Optional change note"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingId) return;
                  void deleteSlot(editingId);
                }}
                disabled={busy || !editingId}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300"
              >
                Delete slot
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!rows.length ? (
        <EmptyState icon="🗓" title="No schedule data" description="Create the first slot to build timetable." />
      ) : (
        <DataTable headers={["Class", "Day", "Time", "Subject", "Teacher", "Room", "Change Note", "Actions"]}>
          {visibleRows.map((item) => (
            <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
              <td className="px-4 py-3">{item.class.name}</td>
              <td className="px-4 py-3">{item.dayOfWeek}</td>
              <td className="px-4 py-3">
                {item.startTime} - {item.endTime}
              </td>
              <td className="px-4 py-3">{item.subject.name}</td>
              <td className="px-4 py-3">
                {item.teacher.user.firstName} {item.teacher.user.lastName}
              </td>
              <td className="px-4 py-3">{item.room}</td>
              <td className="px-4 py-3">
                <input
                  defaultValue={item.changeNote ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (item.changeNote ?? "")) {
                      void applyNote(item.id, e.target.value);
                    }
                  }}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="mr-2 rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
                  onClick={() => startEdit(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                  onClick={() => void deleteSlot(item.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
