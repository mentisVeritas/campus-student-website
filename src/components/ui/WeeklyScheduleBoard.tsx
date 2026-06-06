"use client";

import { Fragment, useMemo, useState } from "react";

type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";

type ScheduleItem = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  classLabel?: string | null;
  teacherName?: string;
  room: string;
  changeNote?: string | null;
  isSharedLesson?: boolean;
  sharedWithLabel?: string | null;
};

type WeeklyScheduleBoardProps = {
  items: ScheduleItem[];
  showSharedLabel?: boolean;
};

const days: Array<{ key: DayOfWeek; label: string }> = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
];

const slotOptions = [
  { start: "09:00", end: "10:20" },
  { start: "10:30", end: "11:50" },
  { start: "12:00", end: "13:20" },
  { start: "14:20", end: "15:40" },
  { start: "15:50", end: "17:10" },
  { start: "17:20", end: "18:40" },
] as const;

export default function WeeklyScheduleBoard({ items, showSharedLabel = true }: WeeklyScheduleBoardProps) {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  const boardBySlot = useMemo(() => {
    const map = new Map<string, ScheduleItem>();
    for (const item of items) {
      map.set(`${item.dayOfWeek}__${item.startTime}`, item);
    }
    return map;
  }, [items]);

  return (
    <div className="h-[calc(100vh-9rem)] rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="h-full overflow-auto">
        <div className="grid min-w-[980px] grid-cols-6 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            Time
          </div>
          {days.map((day) => (
            <div
              key={day.key}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {day.label}
            </div>
          ))}

          {slotOptions.map((slot) => (
            <Fragment key={slot.start}>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <p className="font-semibold">{slot.start}</p>
                <p>{slot.end}</p>
              </div>
              {days.map((day) => {
                const item = boardBySlot.get(`${day.key}__${slot.start}`);
                if (!item) {
                  return (
                    <div
                      key={`${day.key}-${slot.start}`}
                      className="min-h-[112px] rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                    >
                      Free
                    </div>
                  );
                }

                return (
                  <button
                    key={`${day.key}-${slot.start}`}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`min-h-[112px] rounded-lg border p-3 text-left shadow-sm transition-colors ${
                      item.isSharedLesson
                        ? "border-fuchsia-300 bg-fuchsia-50 hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-fuchsia-900/30 dark:hover:bg-fuchsia-900/45"
                        : item.changeNote
                          ? "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/45"
                          : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/45"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.subject}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {item.startTime} - {item.endTime}
                    </p>
                    {item.classLabel ? <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.classLabel}</p> : null}
                    {item.teacherName ? <p className="text-xs text-slate-500 dark:text-slate-400">{item.teacherName}</p> : null}
                    <p className="text-xs text-slate-500 dark:text-slate-400">Room {item.room}</p>
                    {showSharedLabel && item.isSharedLesson && item.sharedWithLabel ? (
                      <p className="text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">Shared: {item.sharedWithLabel}</p>
                    ) : null}
                    {item.changeNote ? (
                      <p className="mt-1 line-clamp-2 text-[11px] font-medium text-amber-700 dark:text-amber-300" title={item.changeNote}>
                        {item.changeNote}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-xl ${
              selectedItem.isSharedLesson
                ? "border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-slate-900"
                : selectedItem.changeNote
                  ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-slate-900"
                  : "border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-slate-900"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedItem.subject}</h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {selectedItem.startTime} - {selectedItem.endTime}
            </p>
            {selectedItem.classLabel ? <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedItem.classLabel}</p> : null}
            {selectedItem.teacherName ? <p className="text-sm text-slate-700 dark:text-slate-300">{selectedItem.teacherName}</p> : null}
            <p className="text-sm text-slate-700 dark:text-slate-300">Room {selectedItem.room}</p>
            {showSharedLabel && selectedItem.isSharedLesson && selectedItem.sharedWithLabel ? (
              <p className="mt-1 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-300">Shared with: {selectedItem.sharedWithLabel}</p>
            ) : null}
            {selectedItem.changeNote ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-100/70 p-3 dark:border-amber-700 dark:bg-amber-900/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Comment</p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{selectedItem.changeNote}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
