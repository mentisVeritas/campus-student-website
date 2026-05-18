import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe('DELETE FROM "Parent"');
  await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE role::text = \'PARENT\'');
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
