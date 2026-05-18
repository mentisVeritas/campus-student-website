import { PrismaPg } from "@prisma/adapter-pg";
import { DayOfWeek, PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/csw?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter, log: ["error"] });

const WEEK_DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
const SLOT_END_BY_START: Record<string, string> = {
  "09:00": "10:20",
  "10:30": "11:50",
  "12:00": "13:20",
  "14:20": "15:40",
  "15:50": "17:10",
  "17:20": "18:40",
};
const MORNING_STARTS = ["09:00", "10:30", "12:00"];
const AFTERNOON_STARTS = ["14:20", "15:50", "17:20"];

const MAX_WEEKLY = 12;
const TARGET_SHARED_MIN = 2;
const TARGET_SHARED_MAX = 3;

type Lesson = {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  room: string;
  classYear: number;
  className: string;
};

type PlannedLesson = Lesson & { existingId?: string };
type SharedTemplate = {
  year: number;
  teacherId: string;
  subjectId: string;
  room: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function classShift(className: string, classYear: number): "MORNING" | "AFTERNOON" {
  const sum = `${className}${classYear}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return sum % 2 === 0 ? "MORNING" : "AFTERNOON";
}

function buildDayTargets(): Record<DayOfWeek, number> {
  // Exactly 12 lessons: usually 2-3 per day.
  const pattern = shuffle([2, 2, 2, 3, 3]);
  return {
    MON: pattern[0],
    TUE: pattern[1],
    WED: pattern[2],
    THU: pattern[3],
    FRI: pattern[4],
  };
}

async function main() {
  const rows = await prisma.scheduleItem.findMany({
    include: {
      class: { select: { id: true, name: true, year: true } },
    },
    orderBy: [{ classId: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const byClass = new Map<string, Lesson[]>();
  for (const row of rows) {
    const lesson: Lesson = {
      id: row.id,
      classId: row.classId,
      subjectId: row.subjectId,
      teacherId: row.teacherId,
      room: row.room,
      classYear: row.class.year,
      className: row.class.name,
    };
    const arr = byClass.get(row.classId) ?? [];
    arr.push(lesson);
    byClass.set(row.classId, arr);
  }

  const sharedCatalogByYear = new Map<number, SharedTemplate[]>();
  const updates: Array<{ id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }> = [];
  const creates: Array<{ classId: string; subjectId: string; teacherId: string; room: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }> = [];
  const deleteIds: string[] = [];
  const summary: Array<{ classId: string; className: string; total: number; kept: number; sharedPlaced: number; dayCounts: Record<DayOfWeek, number> }> = [];

  for (const [classId, allLessonsRaw] of byClass.entries()) {
    const allLessons = shuffle(allLessonsRaw);
    const baseLessons = allLessons.slice(0, MAX_WEEKLY);
    const lessons: PlannedLesson[] = baseLessons.map((lesson) => ({ ...lesson, existingId: lesson.id }));
    while (lessons.length < MAX_WEEKLY) {
      const seed = allLessons[Math.floor(Math.random() * allLessons.length)] ?? allLessons[0];
      if (!seed) break;
      lessons.push({ ...seed });
    }
    const shift = classShift(lessons[0]?.className ?? classId, lessons[0]?.classYear ?? 0);
    const starts = shift === "MORNING" ? MORNING_STARTS : AFTERNOON_STARTS;
    const targets = buildDayTargets();
    const dayCounts: Record<DayOfWeek, number> = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0 };
    let sharedPlaced = 0;
    const sharedTarget = Math.floor(Math.random() * (TARGET_SHARED_MAX - TARGET_SHARED_MIN + 1)) + TARGET_SHARED_MIN;
    const yearCatalog = sharedCatalogByYear.get(lessons[0]?.classYear ?? 0) ?? [];
    sharedCatalogByYear.set(lessons[0]?.classYear ?? 0, yearCatalog);

    for (const lesson of lessons.slice(0, MAX_WEEKLY)) {
      let chosenDay: DayOfWeek = WEEK_DAYS[0];
      let chosenStart = starts[0];

      const dayCandidates = shuffle(WEEK_DAYS.filter((day) => dayCounts[day] < targets[day]));
      if (dayCandidates.length > 0) {
        chosenDay = dayCandidates[0];
      } else {
        chosenDay = shuffle(WEEK_DAYS).sort((a, b) => dayCounts[a] - dayCounts[b])[0];
      }

      // Try to reuse shared template first (2-3 times weekly).
      if (sharedPlaced < sharedTarget) {
        const matchingTemplate = shuffle(yearCatalog).find(
          (tpl) => tpl.teacherId === lesson.teacherId && tpl.subjectId === lesson.subjectId && tpl.room === lesson.room,
        );
        if (matchingTemplate) {
          chosenDay = matchingTemplate.dayOfWeek;
          chosenStart = matchingTemplate.startTime;
          sharedPlaced += 1;
        } else {
          chosenStart = shuffle(starts)[0];
          yearCatalog.push({
            year: lesson.classYear,
            teacherId: lesson.teacherId,
            subjectId: lesson.subjectId,
            room: lesson.room,
            dayOfWeek: chosenDay,
            startTime: chosenStart,
          });
        }
      } else {
        chosenStart = shuffle(starts)[0];
      }

      if (lesson.existingId) {
        updates.push({
          id: lesson.existingId,
          dayOfWeek: chosenDay,
          startTime: chosenStart,
          endTime: SLOT_END_BY_START[chosenStart],
        });
      } else {
        creates.push({
          classId: lesson.classId,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          room: lesson.room,
          dayOfWeek: chosenDay,
          startTime: chosenStart,
          endTime: SLOT_END_BY_START[chosenStart],
        });
      }
      dayCounts[chosenDay] += 1;
    }

    const usedExistingIds = new Set(lessons.map((lesson) => lesson.existingId).filter(Boolean) as string[]);
    for (const original of allLessons) {
      if (!usedExistingIds.has(original.id)) {
        deleteIds.push(original.id);
      }
    }

    summary.push({
      classId,
      className: lessons[0]?.className ?? classId,
      total: allLessons.length,
      kept: MAX_WEEKLY,
      sharedPlaced,
      dayCounts,
    });
  }

  await prisma.$transaction([
    ...updates.map((item) =>
      prisma.scheduleItem.update({
        where: { id: item.id },
        data: { dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.endTime },
      }),
    ),
    ...creates.map((item) =>
      prisma.scheduleItem.create({
        data: {
          classId: item.classId,
          subjectId: item.subjectId,
          teacherId: item.teacherId,
          room: item.room,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          changeNote: null,
        },
      }),
    ),
  ]);

  const removed = deleteIds.length;
  if (deleteIds.length > 0) {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { scheduleItemId: { in: deleteIds } } }),
      prisma.scheduleItem.deleteMany({ where: { id: { in: deleteIds } } }),
    ]);
  }

  console.log(`Rebalanced classes: ${summary.length}`);
  console.log(`Updated lessons: ${updates.length}`);
  console.log(`Created lessons to reach weekly exact count: ${creates.length}`);
  console.log(`Removed extra lessons above weekly cap: ${removed}`);
  for (const item of summary) {
    console.log(
      `${item.className}: kept ${item.kept}/${item.total}, shared ${item.sharedPlaced} | MON ${item.dayCounts.MON}, TUE ${item.dayCounts.TUE}, WED ${item.dayCounts.WED}, THU ${item.dayCounts.THU}, FRI ${item.dayCounts.FRI}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
