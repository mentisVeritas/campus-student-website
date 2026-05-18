import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarEventItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxParticipants: number | null;
  registrationsCount: number;
  isRegistered: boolean;
};

export function dateKey(d: Date): string {
  return format(startOfDay(d), "yyyy-MM-dd");
}

/** Each calendar day the event touches (local date), inclusive. */
export function expandEventToDateKeys(event: CalendarEventItem): string[] {
  const start = startOfDay(new Date(event.startDate));
  const end = startOfDay(new Date(event.endDate));
  if (end < start) {
    return [format(start, "yyyy-MM-dd")];
  }
  return eachDayOfInterval({ start, end }).map((day) => format(day, "yyyy-MM-dd"));
}

export function buildEventsByDay(events: CalendarEventItem[]): Map<string, CalendarEventItem[]> {
  const map = new Map<string, CalendarEventItem[]>();
  for (const event of events) {
    for (const key of expandEventToDateKeys(event)) {
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }
  return map;
}

/** Monday-start week grid covering the full month viewport. */
export function getCalendarGridDays(monthCursor: Date): Date[] {
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

const ACCENTS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-500",
] as const;

export function accentForEventId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}
