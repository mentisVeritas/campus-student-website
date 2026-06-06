import { prisma } from "../src/lib/prisma";

async function main() {
  const parentRows = (await prisma.$queryRawUnsafe(
    'SELECT id FROM "User" WHERE role::text = \'PARENT\'',
  )) as Array<{ id: string }>;
  const parentUserIds = parentRows.map((row) => row.id);

  await prisma.$executeRawUnsafe(
    'UPDATE "Announcement" SET "targetRole" = NULL WHERE "targetRole"::text = \'PARENT\'',
  );

  if (!parentUserIds.length) {
    return;
  }

  const userIdList = parentUserIds.map((id) => `'${id}'`).join(",");

  await prisma.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "userId" IN (${userIdList})`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Announcement" WHERE "authorId" IN (${userIdList})`);
  await prisma.$executeRawUnsafe(`DELETE FROM "LostFoundItem" WHERE "reportedBy" IN (${userIdList})`);
  await prisma.$executeRawUnsafe(`DELETE FROM "BulletinPost" WHERE "authorId" IN (${userIdList})`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Parent" WHERE "userId" IN (${userIdList})`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" IN (${userIdList})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
