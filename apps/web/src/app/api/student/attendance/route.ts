import { AttendanceStatus, DayOfWeek, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Bucket = { total: number; present: number; absent: number; late: number };

function emptyBucket(): Bucket {
  return { total: 0, present: 0, absent: 0, late: 0 };
}

function addStatus(bucket: Bucket, status: AttendanceStatus) {
  bucket.total += 1;
  if (status === "PRESENT") bucket.present += 1;
  if (status === "ABSENT") bucket.absent += 1;
  if (status === "LATE") bucket.late += 1;
}

function rateFromBucket(bucket: Bucket): number {
  return bucket.total ? Number((((bucket.present + bucket.late * 0.5) / bucket.total) * 100).toFixed(1)) : 0;
}

function dateToDayOfWeek(date: Date): DayOfWeek | null {
  const map: Record<number, DayOfWeek> = {
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
  };
  return map[date.getDay()] ?? null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function prismaDateOnlyToIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function semesterRange(startYear: number, semester: 1 | 2): { gte: Date; lte: Date } {
  if (semester === 1) {
    return {
      gte: new Date(startYear, 8, 1),
      lte: new Date(startYear + 1, 0, 31),
    };
  }
  return {
    gte: new Date(startYear + 1, 1, 1),
    lte: new Date(startYear + 1, 7, 31),
  };
}

/** From calendar month Y-M: academic year starts Sep */
function academicYearStartFromMonth(y: number, monthNum: number): number {
  const ref = new Date(y, monthNum - 1, 1);
  return ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1;
}

/** S1 Sep–Jan, S2 Feb–Aug */
function semesterFromMonth(monthNum: number): 1 | 2 {
  if (monthNum >= 9 || monthNum <= 1) return 1;
  return 2;
}

function parseDateFilterFromMonth(y: number, monthNum: number): { gte: Date; lte: Date } | null {
  const ay = academicYearStartFromMonth(y, monthNum);
  const sem = semesterFromMonth(monthNum);
  return semesterRange(ay, sem);
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["STUDENT"])) return fail("Forbidden", 403);

  const dateRef = request.nextUrl.searchParams.get("date")?.trim();
  const monthParamRaw = request.nextUrl.searchParams.get("month")?.trim();
  const monthParam =
    monthParamRaw ??
    (dateRef && /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateRef) ? dateRef.slice(0, 7) : null);

  if (!monthParam) {
    return fail("Provide month (YYYY-MM) or date (YYYY-MM-DD)", 400);
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!monthMatch) return fail("month must be YYYY-MM", 400);

  const y = Number(monthMatch[1]);
  const mNum = Number(monthMatch[2]);
  const monthStart = new Date(y, mNum - 1, 1);
  const lastDay = new Date(y, mNum, 0).getDate();

  const dateFilter = parseDateFilterFromMonth(y, mNum);
  let matrixDateFilter: Prisma.DateTimeFilter = { gte: monthStart, lt: new Date(y, mNum, 1) };
  if (dateFilter) {
    const monthLast = new Date(y, mNum - 1, lastDay);
    const gte = monthStart > dateFilter.gte ? monthStart : dateFilter.gte;
    const lte = monthLast < dateFilter.lte ? monthLast : dateFilter.lte;
    if (gte > lte) {
      matrixDateFilter = { gte: monthStart, lt: monthStart };
    } else {
      matrixDateFilter = { gte, lte };
    }
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!student) return fail("Student profile not found", 404);

  const ayLabel = academicYearStartFromMonth(y, mNum);
  const semLabel = semesterFromMonth(mNum);

  if (!student.classId) {
    return ok({
      month: monthParam,
      academicYearStart: ayLabel,
      semester: semLabel,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      overall: { ...emptyBucket(), attendanceRate: 0 },
      classOverall: null,
      days: [],
      matrix: [],
    });
  }

  const scheduleItems = await prisma.scheduleItem.findMany({
    where: { classId: student.classId },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      subject: { select: { name: true } },
    },
    orderBy: [{ subject: { name: "asc" } }, { startTime: "asc" }],
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      date: matrixDateFilter,
    },
    select: {
      id: true,
      date: true,
      status: true,
      scheduleItemId: true,
    },
  });

  const cellMap = new Map<string, { attendanceId: string; status: AttendanceStatus }>();
  for (const row of attendanceRows) {
    const dateStr =
      row.date instanceof Date ? prismaDateOnlyToIso(row.date) : String(row.date).slice(0, 10);
    cellMap.set(`${student.id}__${dateStr}__${row.scheduleItemId}`, {
      attendanceId: row.id,
      status: row.status,
    });
  }

  const studentBucket = emptyBucket();
  for (const row of attendanceRows) addStatus(studentBucket, row.status);

  const classAttendanceMonth = await prisma.attendance.findMany({
    where: {
      classId: student.classId,
      date: matrixDateFilter,
    },
    select: { status: true },
  });
  const classBucket = emptyBucket();
  for (const row of classAttendanceMonth) addStatus(classBucket, row.status);

  const daysMeta: Array<{
    date: string;
    dayOfMonth: number;
    weekday: string;
    hasLesson: boolean;
  }> = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const copy = new Date(y, mNum - 1, day);
    const iso = `${y}-${pad2(mNum)}-${pad2(day)}`;
    const dow = dateToDayOfWeek(copy);
    const slotsForDay = dow ? scheduleItems.filter((item) => item.dayOfWeek === dow) : [];
    daysMeta.push({
      date: iso,
      dayOfMonth: copy.getDate(),
      weekday: copy.toLocaleDateString(undefined, { weekday: "short" }),
      hasLesson: slotsForDay.length > 0,
    });
  }

  type MatrixCell =
    | { date: string; kind: "no_lesson" }
    | {
        date: string;
        kind: "lesson";
        scheduleItemId: string;
        attendanceId: string | null;
        status: AttendanceStatus | null;
      };

  const matrix = scheduleItems.map((item) => {
    const rowTitle = `${item.subject.name} · ${item.startTime}–${item.endTime}`;
    const cells: MatrixCell[] = daysMeta.map((day) => {
      const copy = new Date(y, mNum - 1, day.dayOfMonth);
      const dow = dateToDayOfWeek(copy);
      if (!dow || item.dayOfWeek !== dow) {
        return { date: day.date, kind: "no_lesson" as const };
      }
      const key = `${student.id}__${day.date}__${item.id}`;
      const existing = cellMap.get(key);
      return {
        date: day.date,
        kind: "lesson" as const,
        scheduleItemId: item.id,
        attendanceId: existing?.attendanceId ?? null,
        status: existing?.status ?? null,
      };
    });
    return {
      scheduleItemId: item.id,
      rowTitle,
      cells,
    };
  });

  return ok({
    month: monthParam,
    academicYearStart: ayLabel,
    semester: semLabel,
    studentName: `${student.user.firstName} ${student.user.lastName}`,
    overall: { ...studentBucket, attendanceRate: rateFromBucket(studentBucket) },
    classOverall: { ...classBucket, attendanceRate: rateFromBucket(classBucket) },
    days: daysMeta,
    matrix,
  });
}
