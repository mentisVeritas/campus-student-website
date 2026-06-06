import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { buildAnnouncementWhereForUser } from "@/lib/announcement-visibility";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const markReadSchema = z.object({
  announcementIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const where = await buildAnnouncementWhereForUser({
    role: session.role as Role,
    userId: session.userId,
    scope: request.nextUrl.searchParams.get("scope"),
  });
  const allowed = await prisma.announcement.findMany({
    where: {
      AND: [
        where ?? {},
        parsed.data.announcementIds?.length
          ? { id: { in: parsed.data.announcementIds } }
          : {},
      ],
    },
    select: { id: true },
  });
  if (!allowed.length) return ok({ marked: 0 });

  try {
    await prisma.announcementRead.createMany({
      data: allowed.map((a) => ({
        announcementId: a.id,
        userId: session.userId,
      })),
      skipDuplicates: true,
    });
  } catch {
    return ok({ marked: 0 });
  }

  return ok({ marked: allowed.length });
}
