import { prisma } from "@/lib/prisma";

export async function getScheduleItems() {
  const items = await prisma.scheduleItem.findMany({
    include: {
      subject: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const data = items.map((item) => ({
    id: item.id,
    day: item.dayOfWeek,
    time: `${item.startTime}-${item.endTime}`,
    room: item.room,
    subject: item.subject.name,
  }));

  return { data, source: "database" as const };
}
