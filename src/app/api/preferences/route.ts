import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  darkMode: z.boolean(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const pref = await prisma.userPreference.findUnique({
    where: { userId: session.userId },
    select: { darkMode: true },
  });
  return ok({ darkMode: pref?.darkMode ?? false });
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  const pref = await prisma.userPreference.upsert({
    where: { userId: session.userId },
    update: { darkMode: parsed.data.darkMode },
    create: { userId: session.userId, darkMode: parsed.data.darkMode },
  });
  return ok(pref);
}
