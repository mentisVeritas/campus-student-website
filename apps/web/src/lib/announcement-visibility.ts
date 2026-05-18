import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function buildAnnouncementWhereForUser(params: {
  role: Role;
  userId: string;
  scope?: string | null;
}): Promise<Prisma.AnnouncementWhereInput | undefined> {
  const { role, userId, scope } = params;

  if (role === Role.ADMIN && scope === "all") {
    return undefined;
  }

  if (role === Role.TEACHER) {
    return {
      OR: [
        { authorId: userId },
        {
          author: { is: { role: Role.ADMIN } },
          OR: [{ targetRole: null }, { targetRole: Role.TEACHER }],
        },
        {
          classId: null,
          OR: [{ targetRole: null }, { targetRole: Role.TEACHER }],
        },
      ],
    };
  }

  if (role === Role.STUDENT) {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { classId: true },
    });
    return {
      OR: [
        { classId: null, OR: [{ targetRole: null }, { targetRole: Role.STUDENT }] },
        ...(student?.classId ? [{ classId: student.classId, targetRole: Role.STUDENT }] : []),
      ],
    };
  }

  return {
    OR: [{ targetRole: null }, { targetRole: role }],
  };
}
