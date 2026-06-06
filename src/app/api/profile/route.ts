import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Forbidden", 403);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
  if (!user) return fail("User not found", 404);
  return ok(user);
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: parsed.data,
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  return ok(updated);
}
