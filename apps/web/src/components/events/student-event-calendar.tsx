"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  subMonths,
} from "date-fns";
import type { CalendarEventItem } from "@/lib/student-events-calendar";
import { accentForEventId, dateKey, getCalendarGridDays } from "@/lib/student-events-calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type StudentEventCalendarProps = {
  eventsByDay: Map<string, CalendarEventItem[]>;
  monthCursor: Date;
  onMonthCursorChange: (next: Date) => void;
  selectedDate: Date;
  onSelectDate: (day: Date) => void;
};

export default function StudentEventCalendar({
  eventsByDay,
  monthCursor,
  onMonthCursorChange,
  selectedDate,
  onSelectDate,
}: StudentEventCalendarProps) {
  const gridDays = getCalendarGridDays(monthCursor);
  const monthLabel = format(monthCursor, "MMMM yyyy");

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-4 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthCursorChange(subMonths(monthCursor, 1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const t = startOfDay(new Date());
              onMonthCursorChange(t);
              onSelectDate(t);
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onMonthCursorChange(addMonths(monthCursor, 1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px border-b border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-700">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="bg-slate-50 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100 p-px dark:bg-slate-700">
        {gridDays.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthCursor);
          const selected = isSameDay(startOfDay(day), startOfDay(selectedDate));
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(startOfDay(day))}
              className={`relative flex min-h-[72px] flex-col gap-0.5 bg-white p-1.5 text-left transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${
                !inMonth ? "opacity-40" : ""
              } ${selected ? "ring-2 ring-inset ring-indigo-500 dark:ring-indigo-400" : ""}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  today
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : inMonth
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${accentForEventId(ev.id)}`}
                    title={ev.title}
                  />
                ))}
              </div>
              {dayEvents.length > 3 ? (
                <span className="mt-auto text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  +{dayEvents.length - 3}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
