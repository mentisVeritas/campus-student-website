import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  const updated = await prisma.notification.updateMany({
    where: { userId: session.userId, read: false },
    data: { read: true },
  });

  return ok({ updated: updated.count });
}
