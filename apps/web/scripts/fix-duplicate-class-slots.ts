import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/csw?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  const rows = await prisma.scheduleItem.findMany({
    include: { class: { select: { name: true } } },
    orderBy: [{ classId: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }, { id: "asc" }],
  });

  const byClass = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = byClass.get(row.classId) ?? [];
    existing.push(row);
    byClass.set(row.classId, existing);
  }

  const toDelete: string[] = [];
  let classesWithDuplicates = 0;

  for (const [, classRows] of byClass.entries()) {
    const bySlot = new Map<string, typeof classRows>();
    for (const row of classRows) {
      const key = `${row.dayOfWeek}__${row.startTime}`;
      const existing = bySlot.get(key) ?? [];
      existing.push(row);
      bySlot.set(key, existing);
    }

    const duplicateGroups = Array.from(bySlot.values()).filter((slotRows) => slotRows.length > 1);
    if (duplicateGroups.length === 0) continue;
    classesWithDuplicates += 1;

    for (const slotRows of duplicateGroups) {
      const sorted = [...slotRows].sort((a, b) => a.id.localeCompare(b.id));
      const keep = sorted[0];
      const remove = sorted.slice(1);
      for (const row of remove) {
        toDelete.push(row.id);
      }
      console.log(
        `Class ${keep.class.name}: keeping ${keep.id} for ${keep.dayOfWeek} ${keep.startTime}, deleting ${remove.length} duplicate(s)`,
      );
    }
  }

  if (toDelete.length > 0) {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { scheduleItemId: { in: toDelete } } }),
      prisma.scheduleItem.deleteMany({ where: { id: { in: toDelete } } }),
    ]);
  }

  console.log(`Classes with duplicate slots: ${classesWithDuplicates}`);
  console.log(`Deleted duplicate lessons: ${toDelete.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
