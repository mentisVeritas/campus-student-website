import { DayOfWeek, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, failNeedsConfirmation, ok } from "@/lib/api-response";
import { notifyScheduleStakeholders, teacherUserIdsFromTeacherIds } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
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

const patchSchema = z.object({
  classId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI"]).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  room: z.string().min(1).optional(),
  changeNote: z.string().max(500).nullable().optional(),
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

function timeValueToHHMM(value: unknown): string {
  if (value instanceof Date) {
    const hh = value.getHours().toString().padStart(2, "0");
    const mm = value.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (typeof value === "string") {
    return value.slice(0, 5);
  }
  return "";
}

function getPreferredShift(className: string, classYear: number): "MORNING" | "AFTERNOON" {
  const sum = `${className}${classYear}`.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return sum % 2 === 0 ? "MORNING" : "AFTERNOON";
}

function schedulePayloadChanged(
  before: {
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: string;
    startTime: unknown;
    endTime: unknown;
    room: string;
    changeNote: string | null;
  },
  after: typeof before,
): boolean {
  return (
    before.classId !== after.classId ||
    before.subjectId !== after.subjectId ||
    before.teacherId !== after.teacherId ||
    before.dayOfWeek !== after.dayOfWeek ||
    timeValueToHHMM(before.startTime) !== timeValueToHHMM(after.startTime) ||
    timeValueToHHMM(before.endTime) !== timeValueToHHMM(after.endTime) ||
    before.room !== after.room ||
    (before.changeNote ?? "") !== (after.changeNote ?? "")
  );
}

async function ensureTeacherAttachedToClass(classId: string, teacherId: string) {
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });
}

async function detachTeacherFromClassIfNoLessons(classId: string, teacherId: string) {
  const lessonsCount = await prisma.scheduleItem.count({
    where: { classId, teacherId },
  });
  if (lessonsCount > 0) return;
  await prisma.classTeacher.deleteMany({
    where: {
      classId,
      teacherId,
      isHomeroom: false,
    },
  });
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const before = await prisma.scheduleItem.findUnique({
    where: { id },
    select: {
      classId: true,
      subjectId: true,
      teacherId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
      changeNote: true,
    },
  });
  if (!before) return fail("Schedule item not found", 404);

  const nextClassId = parsed.data.classId ?? before.classId;
  const nextTeacherId = parsed.data.teacherId ?? before.teacherId;
  const nextSubjectId = parsed.data.subjectId ?? before.subjectId;
  const nextDayOfWeek = parsed.data.dayOfWeek ?? before.dayOfWeek;
  const nextStartTime = parsed.data.startTime ?? timeValueToHHMM(before.startTime);
  const nextEndTime = parsed.data.endTime ?? timeValueToHHMM(before.endTime);
  const nextRoom = parsed.data.room ?? before.room;
  const nextStartMinute = toMinutes(nextStartTime);
  const nextEndMinute = toMinutes(nextEndTime);
  if (!Number.isFinite(nextStartMinute) || !Number.isFinite(nextEndMinute) || nextEndMinute <= nextStartMinute) {
    return fail("End time must be later than start time", 400);
  }
  if (nextStartMinute < LESSON_START_MINUTE || nextEndMinute > LESSON_END_MINUTE) {
    return fail("Lessons must be within 09:00 - 19:00", 400);
  }
  if (!(nextStartTime in ALLOWED_SLOTS)) {
    return fail("Invalid lesson start time. Use strict slot starts: 09:00, 10:30, 12:00, 14:20, 15:50, 17:20", 400);
  }
  if (ALLOWED_SLOTS[nextStartTime] !== nextEndTime) {
    return fail("Invalid lesson end time for selected slot", 400);
  }
  if (nextEndMinute - nextStartMinute !== LESSON_DURATION_MINUTES) {
    return fail(`Lesson duration must be ${LESSON_DURATION_MINUTES} minutes`, 400);
  }

  const sameDayRows = await prisma.scheduleItem.findMany({
    where: {
      id: { not: id },
      dayOfWeek: nextDayOfWeek,
      OR: [{ classId: nextClassId }, { teacherId: nextTeacherId }],
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
    where: { id: nextClassId },
    select: { year: true, name: true },
  });
  if (!targetClass) {
    return fail("Class not found", 404);
  }

  const confirmAdminOverrides = parsed.data.confirmAdminOverrides === true;

  const classLessonsCountForDay = sameDayRows.filter((row) => row.classId === nextClassId).length;
  const softWarnings: string[] = [];

  if (classLessonsCountForDay >= MAX_LESSONS_PER_DAY) {
    softWarnings.push(`Class can have maximum ${MAX_LESSONS_PER_DAY} lessons per day`);
  }

  const weekRowsForClass = await prisma.scheduleItem.findMany({
    where: { id: { not: id }, classId: nextClassId },
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
    preferredShift === "MORNING" ? MORNING_STARTS.has(nextStartTime) : AFTERNOON_STARTS.has(nextStartTime);
  if (!isShiftValid) {
    softWarnings.push(
      preferredShift === "MORNING"
        ? "This group is usually assigned morning shift (09:00, 10:30, 12:00)"
        : "This group is usually assigned afternoon shift (14:20, 15:50, 17:20)",
    );
  }

  const hasTeacherBreakViolation = sameDayRows.some((row) => {
    if (row.teacherId !== nextTeacherId) return false;
    const sameSharedSlot =
      row.dayOfWeek === nextDayOfWeek &&
      timeValueToMinutes(row.startTime) === nextStartMinute &&
      timeValueToMinutes(row.endTime) === nextEndMinute &&
      row.subjectId === nextSubjectId &&
      row.room === nextRoom &&
      row.class.year === targetClass.year;
    if (sameSharedSlot) return false;
    const rowStart = timeValueToMinutes(row.startTime);
    const rowEnd = timeValueToMinutes(row.endTime);
    return nextStartMinute < rowEnd + BREAK_MINUTES && nextEndMinute + BREAK_MINUTES > rowStart;
  });
  if (hasTeacherBreakViolation) {
    softWarnings.push(
      `Teacher already has another lesson too close (less than ${BREAK_MINUTES} minutes break), or overlapping`,
    );
  }

  const roomRows = await prisma.scheduleItem.findMany({
    where: { id: { not: id }, dayOfWeek: nextDayOfWeek, room: nextRoom },
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
    const overlaps = nextStartMinute < rowEnd + BREAK_MINUTES && nextEndMinute + BREAK_MINUTES > rowStart;
    if (!overlaps) return false;
    const isSameSharedLesson =
      rowStart === nextStartMinute &&
      rowEnd === nextEndMinute &&
      row.subjectId === nextSubjectId &&
      row.teacherId === nextTeacherId &&
      row.class.year === targetClass.year;
    return !isSameSharedLesson;
  });
  if (hasRoomConflict) {
    softWarnings.push("Room is already occupied for another class at this time (or break overlap)");
  }

  const sharedRowsForSlot = await prisma.scheduleItem.findMany({
    where: {
      id: { not: id },
      dayOfWeek: nextDayOfWeek,
      startTime: nextStartTime,
      endTime: nextEndTime,
      subjectId: nextSubjectId,
      teacherId: nextTeacherId,
      room: nextRoom,
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

  const { confirmAdminOverrides: _confirm, ...patchFields } = parsed.data;
  const updated = await prisma.scheduleItem.update({
    where: { id },
    data: patchFields,
  });
  await ensureTeacherAttachedToClass(updated.classId, updated.teacherId);
  if (before.classId !== updated.classId || before.teacherId !== updated.teacherId) {
    await detachTeacherFromClassIfNoLessons(before.classId, before.teacherId);
  }

  if (schedulePayloadChanged(before, updated)) {
    const classIds = [...new Set([before.classId, updated.classId])];
    const subjectIds = [...new Set([before.subjectId, updated.subjectId])];
    const teacherUserIds = await teacherUserIdsFromTeacherIds([before.teacherId, updated.teacherId]);
    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      }),
    ]);
    const nameById = Object.fromEntries(classes.map((c) => [c.id, c.name]));
    const subjectNameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
    const label =
      classIds.length > 1
        ? classIds.map((cid) => nameById[cid] ?? cid).join(", ")
        : nameById[updated.classId] ?? "";
    const beforeLabel = `${subjectNameById[before.subjectId] ?? "Subject"} • ${DAY_LABELS[before.dayOfWeek as DayOfWeek]} • ${timeValueToHHMM(before.startTime)}–${timeValueToHHMM(before.endTime)} • Room ${before.room}`;
    const afterLabel = `${subjectNameById[updated.subjectId] ?? "Subject"} • ${DAY_LABELS[updated.dayOfWeek as DayOfWeek]} • ${timeValueToHHMM(updated.startTime)}–${timeValueToHHMM(updated.endTime)} • Room ${updated.room}`;

    await notifyScheduleStakeholders({
      classIds,
      teacherUserIds,
      title: "Schedule update",
      message:
        classIds.length > 1
          ? `Schedule updated (classes: ${label}). Was: ${beforeLabel}. Now: ${afterLabel}.`
          : `Class "${label}": schedule changed. Was: ${beforeLabel}. Now: ${afterLabel}.`,
      link: null,
    });
  }

  const updatedLessonsCountForDay = classLessonsCountForDay + 1;
  return ok({
    ...updated,
    distributionHint:
      updatedLessonsCountForDay <= MIN_LESSONS_PER_DAY_HINT
        ? `This day currently has ${updatedLessonsCountForDay} lessons. Target is around ${TARGET_LESSONS_PER_DAY}.`
        : null,
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);
  const { id } = await context.params;

  const existing = await prisma.scheduleItem.findUnique({
    where: { id },
    select: {
      classId: true,
      teacherId: true,
      subject: { select: { name: true } },
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
      class: { select: { name: true } },
    },
  });
  if (!existing) {
    return fail("Schedule item not found", 404);
  }

  try {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { scheduleItemId: id } }),
      prisma.scheduleItem.delete({ where: { id } }),
    ]);
    await detachTeacherFromClassIfNoLessons(existing.classId, existing.teacherId);

    const teacherUserIds = await teacherUserIdsFromTeacherIds([existing.teacherId]);
    await notifyScheduleStakeholders({
      classIds: [existing.classId],
      teacherUserIds,
      title: "Schedule update",
      message: existing.class
        ? `Removed from "${existing.class.name}" schedule: ${existing.subject.name} • ${DAY_LABELS[existing.dayOfWeek as DayOfWeek]} • ${timeValueToHHMM(existing.startTime)}–${timeValueToHHMM(existing.endTime)} • Room ${existing.room}.`
        : `Lesson removed: ${existing.subject.name} • ${DAY_LABELS[existing.dayOfWeek as DayOfWeek]} • ${timeValueToHHMM(existing.startTime)}–${timeValueToHHMM(existing.endTime)} • Room ${existing.room}.`,
      link: null,
    });

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("Schedule item not found", 404);
    }
    return fail("Failed to delete schedule slot", 400);
  }
}
