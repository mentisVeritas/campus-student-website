"use client";

import { Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEventItem } from "@/lib/student-events-calendar";
import { accentForEventId } from "@/lib/student-events-calendar";

type StudentEventDayPanelProps = {
  selectedDate: Date;
  events: CalendarEventItem[];
  busyId: string | null;
  onToggleRegistration: (eventId: string, currentlyRegistered: boolean) => void;
};

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
  if (sameDay) {
    return `${format(start, "EEE, MMM d")} · ${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
  }
  return `${format(start, "MMM d, HH:mm")} → ${format(end, "MMM d, HH:mm")}`;
}

export default function StudentEventDayPanel({
  selectedDate,
  events,
  busyId,
  onToggleRegistration,
}: StudentEventDayPanelProps) {
  const heading = format(selectedDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex flex-col rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected day</p>
        <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{heading}</p>
      </div>

      <div className="max-h-[min(520px,70vh)] flex-1 space-y-3 overflow-y-auto p-4">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No events scheduled for this day.</p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/50"
            >
              <div className="flex gap-3">
                <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${accentForEventId(event.id)}`} aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{event.title}</h4>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{event.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatRange(event.startDate, event.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {event.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {event.registrationsCount}
                      {event.maxParticipants != null ? ` / ${event.maxParticipants}` : ""} attending
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === event.id}
                    onClick={() => onToggleRegistration(event.id, event.isRegistered)}
                    className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                      event.isRegistered
                        ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    }`}
                  >
                    {busyId === event.id ? "…" : event.isRegistered ? "Unregister" : "Register"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
