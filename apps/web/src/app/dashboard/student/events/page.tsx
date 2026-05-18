"use client";

import { Calendar as CalendarIcon, LayoutList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import StudentEventCalendar from "@/components/events/student-event-calendar";
import StudentEventDayPanel from "@/components/events/student-event-day-panel";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  buildEventsByDay,
  dateKey,
  type CalendarEventItem,
} from "@/lib/student-events-calendar";
import { format, parse, startOfDay, startOfMonth } from "date-fns";

export default function StudentEventsPage() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/events");
    const payload = await response.json();
    setEvents(payload.data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadEvents();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  const eventsByDay = useMemo(() => buildEventsByDay(events), [events]);
  const selectedDayEvents = eventsByDay.get(dateKey(selectedDate)) ?? [];

  const toggleRegistration = async (id: string, currentlyRegistered: boolean) => {
    setBusyId(id);
    await fetch(`/api/student/events/${id}/register`, {
      method: currentlyRegistered ? "DELETE" : "POST",
    });
    await loadEvents();
    setBusyId(null);
  };

  const sortedForList = useMemo(
    () => [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [events],
  );

  const viewToggle = (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => setView("calendar")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          view === "calendar"
            ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        Calendar
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          view === "list"
            ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <LayoutList className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Student events"
        description="Browse campus activities on the calendar or as a list. Register in one tap."
        action={viewToggle}
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <div className="h-[420px] animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
          <div className="h-[320px] animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/80" />
        </div>
      ) : !events.length ? (
        <EmptyState icon="🗓" title="No events yet" description="New events will appear here when published." />
      ) : view === "calendar" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start">
          <StudentEventCalendar
            eventsByDay={eventsByDay}
            monthCursor={monthCursor}
            onMonthCursorChange={setMonthCursor}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <div className="lg:sticky lg:top-4 lg:self-start">
            <StudentEventDayPanel
              selectedDate={selectedDate}
              events={selectedDayEvents}
              busyId={busyId}
              onToggleRegistration={toggleRegistration}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedForList.map((event, index) => {
            const dayKey = dateKey(new Date(event.startDate));
            const prevKey =
              index > 0 ? dateKey(new Date(sortedForList[index - 1].startDate)) : null;
            const showDayHeader = dayKey !== prevKey;

            return (
              <div key={event.id}>
                {showDayHeader ? (
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                    {format(parse(dayKey, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}
                  </p>
                ) : null}
                <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{event.location}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(event.startDate), "HH:mm")} – {format(new Date(event.endDate), "HH:mm")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {event.registrationsCount}
                    {event.maxParticipants != null ? ` / ${event.maxParticipants}` : ""} participants
                  </p>
                  <button
                    type="button"
                    disabled={busyId === event.id}
                    onClick={() => toggleRegistration(event.id, event.isRegistered)}
                    className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                      event.isRegistered
                        ? "border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500"
                    }`}
                  >
                    {busyId === event.id ? "…" : event.isRegistered ? "Unregister" : "Register"}
                  </button>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
