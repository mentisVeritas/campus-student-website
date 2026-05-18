import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session) {
    return fail("Unauthorized", 401);
  }
  const { id } = await context.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.userId },
  });
  if (!notification) {
    return fail("Notification not found", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return ok(updated);
}
