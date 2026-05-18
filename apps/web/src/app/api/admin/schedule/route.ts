import { DayOfWeek } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, failNeedsConfirmation, ok } from "@/lib/api-response";
import { notifyScheduleStakeholders, teacherUserIdsFromTeacherIds } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const BREAK_MINUTES = 10;
const MAX_LESSONS_PER_DAY = 4;
const TARGET_LESSONS_PER_DAY = 3;
const MIN_LESSONS_PER_DAY_HINT = 2;
const MAX_SHARED_GROUPS_PER_LESSON = 2;
const MAX_LESSONS_PER_WEEK = 12;
const MAX_HEAVY_DAYS_PER_WEEK = 1;
const LESSON_START_MINUTE = 9 * 60;
const LESSON_END_MINUTE = 19 * 60;
const LESSON_DURATION_MINUTES = 80;
const ALLOWED_SLOTS: Record<string, string> = {
  "09:00": "10:20",
  "10:30": "11:50",
  "12:00": "13:20",
  "14:20": "15:40",
  "15:50": "17:10",
  "17:20": "18:40",
};
const MORNING_STARTS = new Set(["09:00", "10:30", "12:00"]);
const AFTERNOON_STARTS = new Set(["14:20", "15:50", "17:20"]);
const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
};

const createSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  room: z.string().min(1),
  changeNote: z.string().max(500).optional().nullable(),
  confirmAdminOverrides: z.boolean().optional(),
});

function toMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function timeValueToMinutes(value: unknown): number {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  if (typeof value === "string") {
    return toMinutes(value);
  }
  return NaN;
}

function getPreferredShift(className: string, classYear: number): "MORNING" | "AFTERNOON" {
  const sum = `${className}${classYear}`.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return sum % 2 === 0 ? "MORNING" : "AFTERNOON";
}

async function ensureTeacherAttachedToClass(classId: string, teacherId: string) {
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);

  const classId = request.nextUrl.searchParams.get("classId");
  const rows = await prisma.scheduleItem.findMany({
    where: classId ? { classId } : {},
    include: {
      class: { select: { id: true, name: true, year: true } },
      subject: { select: { id: true, name: true, code: true } },
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return ok(rows);
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);
  const startMinute = toMinutes(parsed.data.startTime);
  const endMinute = toMinutes(parsed.data.endTime);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute) {
    return fail("End time must be later than start time", 400);
  }
  if (startMinute < LESSON_START_MINUTE || endMinute > LESSON_END_MINUTE) {
    return fail("Lessons must be within 09:00 - 19:00", 400);
  }
  if (!(parsed.data.startTime in ALLOWED_SLOTS)) {
    return fail("Invalid lesson start time. Use strict slot starts: 09:00, 10:30, 12:00, 14:20, 15:50, 17:20", 400);
  }
  if (ALLOWED_SLOTS[parsed.data.startTime] !== parsed.data.endTime) {
    return fail("Invalid lesson end time for selected slot", 400);
  }
  if (endMinute - startMinute !== LESSON_DURATION_MINUTES) {
    return fail(`Lesson duration must be ${LESSON_DURATION_MINUTES} minutes`, 400);
  }

  const sameDayRows = await prisma.scheduleItem.findMany({
    where: {
      dayOfWeek: parsed.data.dayOfWeek,
      OR: [{ classId: parsed.data.classId }, { teacherId: parsed.data.teacherId }],
    },
    select: {
      startTime: true,
      endTime: true,
      classId: true,
      teacherId: true,
      subjectId: true,
      room: true,
      dayOfWeek: true,
      class: { select: { year: true } },
    },
  });

  const targetClass = await prisma.class.findUnique({
    where: { id: parsed.data.classId },
    select: { year: true, name: true },
  });
  if (!targetClass) {
    return fail("Class not found", 404);
  }

  const confirmAdminOverrides = parsed.data.confirmAdminOverrides === true;

  const classLessonsCountForDay = sameDayRows.filter((row) => row.classId === parsed.data.classId).length;
  const softWarnings: string[] = [];

  if (classLessonsCountForDay >= MAX_LESSONS_PER_DAY) {
    softWarnings.push(`Class can have maximum ${MAX_LESSONS_PER_DAY} lessons per day`);
  }

  const weekRowsForClass = await prisma.scheduleItem.findMany({
    where: { classId: parsed.data.classId },
    select: { dayOfWeek: true },
  });
  if (weekRowsForClass.length >= MAX_LESSONS_PER_WEEK) {
    softWarnings.push(`Class can have maximum ${MAX_LESSONS_PER_WEEK} lessons per week`);
  }
  const lessonsByDay = weekRowsForClass.reduce<Record<string, number>>((acc, row) => {
    acc[row.dayOfWeek] = (acc[row.dayOfWeek] ?? 0) + 1;
    return acc;
  }, {});
  const heavyDaysCount = Object.values(lessonsByDay).filter((count) => count >= MAX_LESSONS_PER_DAY).length;
  if (classLessonsCountForDay === MAX_LESSONS_PER_DAY - 1 && heavyDaysCount >= MAX_HEAVY_DAYS_PER_WEEK) {
    softWarnings.push(`Only ${MAX_HEAVY_DAYS_PER_WEEK} day per week can have 4 lessons`);
  }

  const preferredShift = getPreferredShift(targetClass.name, targetClass.year);
  const isShiftValid =
    preferredShift === "MORNING" ? MORNING_STARTS.has(parsed.data.startTime) : AFTERNOON_STARTS.has(parsed.data.startTime);
  if (!isShiftValid) {
    softWarnings.push(
      preferredShift === "MORNING"
        ? "This group is usually assigned morning shift (09:00, 10:30, 12:00)"
        : "This group is usually assigned afternoon shift (14:20, 15:50, 17:20)",
    );
  }

  const hasTeacherBreakViolation = sameDayRows.some((row) => {
    if (row.teacherId !== parsed.data.teacherId) return false;
    const sameSharedSlot =
      row.dayOfWeek === parsed.data.dayOfWeek &&
      timeValueToMinutes(row.startTime) === startMinute &&
      timeValueToMinutes(row.endTime) === endMinute &&
      row.subjectId === parsed.data.subjectId &&
      row.room === parsed.data.room &&
      row.class.year === targetClass.year;
    if (sameSharedSlot) return false;
    const rowStart = timeValueToMinutes(row.startTime);
    const rowEnd = timeValueToMinutes(row.endTime);
    return startMinute < rowEnd + BREAK_MINUTES && endMinute + BREAK_MINUTES > rowStart;
  });
  if (hasTeacherBreakViolation) {
    softWarnings.push(
      `Teacher already has another lesson too close (less than ${BREAK_MINUTES} minutes break), or overlapping`,
    );
  }

  const roomRows = await prisma.scheduleItem.findMany({
    where: { dayOfWeek: parsed.data.dayOfWeek, room: parsed.data.room },
    select: {
      startTime: true,
      endTime: true,
      subjectId: true,
      teacherId: true,
      class: { select: { year: true } },
    },
  });
  const hasRoomConflict = roomRows.some((row) => {
    const rowStart = timeValueToMinutes(row.startTime);
    const rowEnd = timeValueToMinutes(row.endTime);
    const overlaps = startMinute < rowEnd + BREAK_MINUTES && endMinute + BREAK_MINUTES > rowStart;
    if (!overlaps) return false;
    const isSameSharedLesson =
      rowStart === startMinute &&
      rowEnd === endMinute &&
      row.subjectId === parsed.data.subjectId &&
      row.teacherId === parsed.data.teacherId &&
      row.class.year === targetClass.year;
    return !isSameSharedLesson;
  });
  if (hasRoomConflict) {
    softWarnings.push("Room is already occupied for another class at this time (or break overlap)");
  }

  const sharedRowsForSlot = await prisma.scheduleItem.findMany({
    where: {
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      subjectId: parsed.data.subjectId,
      teacherId: parsed.data.teacherId,
      room: parsed.data.room,
      class: { year: targetClass.year },
    },
    select: { id: true },
  });
  if (sharedRowsForSlot.length >= MAX_SHARED_GROUPS_PER_LESSON) {
    softWarnings.push(`Shared lesson limit reached (max ${MAX_SHARED_GROUPS_PER_LESSON} groups in one slot)`);
  }

  if (softWarnings.length && !confirmAdminOverrides) {
    return failNeedsConfirmation(
      "Scheduling guidelines would be violated. Confirm if you still want to save.",
      softWarnings,
    );
  }

  const created = await prisma.scheduleItem.create({
    data: {
      classId: parsed.data.classId,
      subjectId: parsed.data.subjectId,
      teacherId: parsed.data.teacherId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      room: parsed.data.room,
      changeNote: parsed.data.changeNote ?? null,
    },
  });
  await ensureTeacherAttachedToClass(parsed.data.classId, parsed.data.teacherId);

  const [clsForNotify, subjectForNotify, teacherUserIds] = await Promise.all([
    prisma.class.findUnique({
      where: { id: parsed.data.classId },
      select: { name: true },
    }),
    prisma.subject.findUnique({
      where: { id: parsed.data.subjectId },
      select: { name: true },
    }),
    teacherUserIdsFromTeacherIds([parsed.data.teacherId]),
  ]);
  const slotLabel = `${DAY_LABELS[parsed.data.dayOfWeek]} • ${parsed.data.startTime}–${parsed.data.endTime} • Room ${parsed.data.room}`;
  await notifyScheduleStakeholders({
    classIds: [parsed.data.classId],
    teacherUserIds,
    title: "Schedule update",
    message: clsForNotify
      ? `Lesson added for class "${clsForNotify.name}": ${subjectForNotify?.name ?? "Subject"} (${slotLabel}).`
      : `New lesson added: ${subjectForNotify?.name ?? "Subject"} (${slotLabel}).`,
    link: null,
  });

  const createdLessonsCountForDay = classLessonsCountForDay + 1;
  return ok(
    {
      ...created,
      distributionHint:
        createdLessonsCountForDay <= MIN_LESSONS_PER_DAY_HINT
          ? `This day currently has ${createdLessonsCountForDay} lessons. Target is around ${TARGET_LESSONS_PER_DAY}.`
          : null,
    },
    201,
  );
}
