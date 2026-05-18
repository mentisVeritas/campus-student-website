import { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
    },
  });
}

/** Notifies all students in the given classes and listed teachers (by userId). Duplicate userIds are merged. */
export async function notifyScheduleStakeholders(params: {
  classIds: string[];
  teacherUserIds: string[];
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  const uniqueClassIds = [...new Set(params.classIds.filter(Boolean))];
  const studentRows =
    uniqueClassIds.length === 0
      ? []
      : await prisma.student.findMany({
          where: { classId: { in: uniqueClassIds } },
          select: { userId: true },
        });

  const ids = new Set<string>();
  for (const row of studentRows) {
    ids.add(row.userId);
  }
  for (const uid of params.teacherUserIds) {
    if (uid) ids.add(uid);
  }

  const userIds = [...ids];
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: NotificationType.SCHEDULE_CHANGE,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    })),
  });
}

export async function teacherUserIdsFromTeacherIds(teacherIds: string[]): Promise<string[]> {
  const uniq = [...new Set(teacherIds.filter(Boolean))];
  if (uniq.length === 0) return [];
  const rows = await prisma.teacher.findMany({
    where: { id: { in: uniq } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
