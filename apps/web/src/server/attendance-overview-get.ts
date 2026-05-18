import { AttendanceStatus, DayOfWeek, Prisma } from "@prisma/client";
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

/** Calendar YYYY-MM-DD from Prisma `@db.Date` (node-pg uses UTC midnight for DATE-only values). */
function prismaDateOnlyToIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Academic year N/N+1: Sep 1 (year N) … Aug 31 (year N+1) */
function academicYearRange(startYear: number): { gte: Date; lte: Date } {
  return {
    gte: new Date(startYear, 8, 1),
    lte: new Date(startYear + 1, 7, 31),
  };
}

/** Within that academic year: S1 Sep–Jan, S2 Feb–Aug */
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

function parseDateFilter(searchParams: URLSearchParams): { gte: Date; lte: Date } | null {
  const ay = searchParams.get("academicYearStart");
  const semRaw = searchParams.get("semester");
  if (!ay) return null;
  const startYear = Number(ay);
  if (!Number.isFinite(startYear)) return null;

  if (semRaw === "1" || semRaw === "2") {
    return semesterRange(startYear, Number(semRaw) as 1 | 2);
  }
  return academicYearRange(startYear);
}

function attendanceDateWhere(filter: { gte: Date; lte: Date } | null): Prisma.DateTimeFilter | undefined {
  if (!filter) return undefined;
  return { gte: filter.gte, lte: filter.lte };
}

export type AttendanceOverviewScope =
  | { mode: "admin" }
  | { mode: "teacher"; allowedClassIds: string[]; allowedSubjectIds: string[] };

export async function attendanceOverviewGet(
  searchParams: URLSearchParams,
  scope: AttendanceOverviewScope,
): Promise<Response> {
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const monthParam = searchParams.get("month");
  const expandStudentId = searchParams.get("expandStudent");

  const allowed =
    scope.mode === "teacher" ? scope.allowedClassIds : null;
  const teacherSubjects =
    scope.mode === "teacher" ? scope.allowedSubjectIds : null;

  if (scope.mode === "teacher" && classId && allowed && !allowed.includes(classId)) {
    return fail("Forbidden", 403);
  }

  if (scope.mode === "teacher" && subjectId && teacherSubjects && !teacherSubjects.includes(subjectId)) {
    return fail("Forbidden", 403);
  }

  const dateFilter = parseDateFilter(searchParams);
  const dateWhere = attendanceDateWhere(dateFilter);

  const classListWhere: Prisma.ClassWhereInput =
    scope.mode === "teacher"
      ? allowed?.length
        ? { id: { in: allowed } }
        : { id: { in: [] } }
      : {};

  const allClasses = await prisma.class.findMany({
    where: classListWhere,
    orderBy: [{ year: "asc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const attendanceScopeWhere: Prisma.AttendanceWhereInput =
    scope.mode === "teacher"
      ? {
          ...(allowed?.length ? { classId: { in: allowed } } : { classId: { in: [] } }),
          ...(teacherSubjects?.length ? { subjectId: { in: teacherSubjects } } : { subjectId: { in: [] } }),
        }
      : {};

  if (expandStudentId && classId) {
    if (scope.mode === "teacher" && allowed && !allowed.includes(classId)) {
      return fail("Forbidden", 403);
    }
    const rows = await prisma.attendance.findMany({
      where: {
        studentId: expandStudentId,
        classId,
        ...(dateWhere ? { date: dateWhere } : {}),
        ...(scope.mode === "teacher"
          ? teacherSubjects?.length
            ? { subjectId: { in: teacherSubjects } }
            : { subjectId: { in: [] } }
          : {}),
      },
      include: { subject: { select: { id: true, name: true } } },
    });
    const subjectMap = new Map<string, Bucket & { subjectId: string; subjectName: string }>();
    for (const row of rows) {
      if (!subjectMap.has(row.subjectId)) {
        subjectMap.set(row.subjectId, { ...emptyBucket(), subjectId: row.subject.id, subjectName: row.subject.name });
      }
      addStatus(subjectMap.get(row.subjectId)!, row.status);
    }
    const studentSubjects = Array.from(subjectMap.values()).map((b) => ({
      ...b,
      attendanceRate: rateFromBucket(b),
    }));
    studentSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    return ok({ expandStudentId, studentSubjects });
  }

  const allAttendance = await prisma.attendance.findMany({
    where: {
      ...(dateWhere ? { date: dateWhere } : {}),
      ...attendanceScopeWhere,
    },
    select: { status: true, classId: true },
  });

  const overallBucket = emptyBucket();
  for (const row of allAttendance) addStatus(overallBucket, row.status);

  const byClass = new Map<string, Bucket>();
  for (const row of allAttendance) {
    if (!byClass.has(row.classId)) byClass.set(row.classId, emptyBucket());
    addStatus(byClass.get(row.classId)!, row.status);
  }

  const groupsSummary = allClasses.map((item) => {
    const bucket = byClass.get(item.id) ?? emptyBucket();
    return {
      id: item.id,
      name: item.name,
      course: item.year,
      ...bucket,
      attendanceRate: rateFromBucket(bucket),
    };
  });

  if (!classId) {
    return ok({
      overall: { ...overallBucket, attendanceRate: rateFromBucket(overallBucket) },
      groups: groupsSummary,
    });
  }

  const cls = allClasses.find((item) => item.id === classId);
  if (!cls) return fail("Class not found", 404);

  const classRows = await prisma.attendance.findMany({
    where: {
      classId,
      ...(dateWhere ? { date: dateWhere } : {}),
      ...(scope.mode === "teacher"
        ? teacherSubjects?.length
          ? { subjectId: { in: teacherSubjects } }
          : { subjectId: { in: [] } }
        : {}),
    },
    select: { status: true, subjectId: true, studentId: true },
  });

  const classOverall = emptyBucket();
  for (const row of classRows) addStatus(classOverall, row.status);

  const classSubjectsScheduled = await prisma.classSubject.findMany({
    where: {
      classId,
      ...(scope.mode === "teacher"
        ? teacherSubjects?.length
          ? { subjectId: { in: teacherSubjects } }
          : { subjectId: { in: [] } }
        : {}),
    },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  const subjectBuckets = new Map<string, Bucket & { subjectId: string; subjectName: string }>();
  for (const cs of classSubjectsScheduled) {
    subjectBuckets.set(cs.subjectId, {
      ...emptyBucket(),
      subjectId: cs.subject.id,
      subjectName: cs.subject.name,
    });
  }

  const classAttendanceOnly = await prisma.attendance.findMany({
    where: {
      classId,
      ...(dateWhere ? { date: dateWhere } : {}),
      ...(scope.mode === "teacher"
        ? teacherSubjects?.length
          ? { subjectId: { in: teacherSubjects } }
          : { subjectId: { in: [] } }
        : {}),
    },
    include: { subject: { select: { id: true, name: true } } },
  });
  for (const row of classAttendanceOnly) {
    if (!subjectBuckets.has(row.subjectId)) {
      subjectBuckets.set(row.subjectId, {
        ...emptyBucket(),
        subjectId: row.subject.id,
        subjectName: row.subject.name,
      });
    }
    addStatus(subjectBuckets.get(row.subjectId)!, row.status);
  }

  const subjectsSummary = Array.from(subjectBuckets.values()).map((b) => ({
    subjectId: b.subjectId,
    subjectName: b.subjectName,
    total: b.total,
    present: b.present,
    absent: b.absent,
    late: b.late,
    attendanceRate: rateFromBucket(b),
  }));
  subjectsSummary.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  if (!subjectId) {
    return ok({
      class: { id: cls.id, name: cls.name, course: cls.year },
      classOverall: { ...classOverall, attendanceRate: rateFromBucket(classOverall) },
      subjects: subjectsSummary,
    });
  }

  const students = await prisma.student.findMany({
    where: { classId },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { studentCode: "asc" },
  });

  const subjectRows = classAttendanceOnly.filter((row) => row.subjectId === subjectId);
  const studentBuckets = new Map<string, Bucket & { studentId: string; studentName: string }>();
  for (const s of students) {
    studentBuckets.set(s.id, {
      ...emptyBucket(),
      studentId: s.id,
      studentName: `${s.user.firstName} ${s.user.lastName}`,
    });
  }
  for (const row of subjectRows) {
    if (!studentBuckets.has(row.studentId)) continue;
    addStatus(studentBuckets.get(row.studentId)!, row.status);
  }

  const studentsSummary = Array.from(studentBuckets.values()).map((b) => ({
    studentId: b.studentId,
    studentName: b.studentName,
    total: b.total,
    present: b.present,
    absent: b.absent,
    late: b.late,
    attendanceRate: rateFromBucket(b),
  }));

  const subjectMeta = subjectsSummary.find((item) => item.subjectId === subjectId);
  if (!subjectMeta && !classSubjectsScheduled.find((item) => item.subjectId === subjectId)) {
    return fail("Subject not found for this class", 404);
  }

  if (!monthParam) {
    return ok({
      class: { id: cls.id, name: cls.name, course: cls.year },
      subject: subjectMeta ?? { subjectId, subjectName: "—", total: 0, present: 0, absent: 0, late: 0, attendanceRate: 0 },
      students: studentsSummary,
    });
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!monthMatch) return fail("month must be YYYY-MM", 400);
  const y = Number(monthMatch[1]);
  const m = Number(monthMatch[2]);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);
  const lastDay = new Date(y, m, 0).getDate();

  const scheduleItems = await prisma.scheduleItem.findMany({
    where: { classId, subjectId },
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true, teacherId: true },
    orderBy: { startTime: "asc" },
  });

  let matrixDateFilter: Prisma.DateTimeFilter = { gte: monthStart, lt: monthEnd };
  if (dateFilter) {
    const monthLast = new Date(y, m - 1, lastDay);
    const gte = monthStart > dateFilter.gte ? monthStart : dateFilter.gte;
    const lte = monthLast < dateFilter.lte ? monthLast : dateFilter.lte;
    if (gte > lte) {
      matrixDateFilter = { gte: monthStart, lt: monthStart };
    } else {
      matrixDateFilter = { gte, lte };
    }
  }

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      classId,
      subjectId,
      date: matrixDateFilter,
    },
    select: {
      id: true,
      studentId: true,
      date: true,
      status: true,
      scheduleItemId: true,
    },
  });

  const daysMeta: Array<{
    date: string;
    dayOfMonth: number;
    weekday: string;
    hasLesson: boolean;
    slotIds: string[];
  }> = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const copy = new Date(y, m - 1, day);
    const iso = `${y}-${pad2(m)}-${pad2(day)}`;
    const dow = dateToDayOfWeek(copy);
    const slotsForDay = dow ? scheduleItems.filter((item) => item.dayOfWeek === dow) : [];
    daysMeta.push({
      date: iso,
      dayOfMonth: copy.getDate(),
      weekday: copy.toLocaleDateString(undefined, { weekday: "short" }),
      hasLesson: slotsForDay.length > 0,
      slotIds: slotsForDay.map((s) => s.id),
    });
  }

  const cellMap = new Map<string, { attendanceId: string; status: AttendanceStatus }>();
  for (const row of attendanceRows) {
    const dateStr = row.date instanceof Date ? prismaDateOnlyToIso(row.date) : String(row.date).slice(0, 10);
    const key = `${row.studentId}__${dateStr}__${row.scheduleItemId}`;
    cellMap.set(key, { attendanceId: row.id, status: row.status });
  }

  const matrix = students.map((student) => {
    const cells = daysMeta.map((day) => {
      if (!day.hasLesson || !day.slotIds?.length) {
        return { date: day.date, kind: "no_lesson" as const };
      }
      const slots = day.slotIds.map((scheduleItemId) => {
        const lookupKey = `${student.id}__${day.date}__${scheduleItemId}`;
        const existing = cellMap.get(lookupKey);
        return {
          scheduleItemId,
          attendanceId: existing?.attendanceId ?? null,
          status: existing?.status ?? null,
        };
      });
      return {
        date: day.date,
        kind: "lesson" as const,
        slots,
      };
    });
    return {
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      cells,
    };
  });

  return ok({
    class: { id: cls.id, name: cls.name, course: cls.year },
    subject: subjectMeta ?? {
      subjectId,
      subjectName: subjectBuckets.get(subjectId)?.subjectName ?? "—",
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      attendanceRate: 0,
    },
    month: monthParam,
    days: daysMeta,
    students: studentsSummary,
    matrix,
  });
}
