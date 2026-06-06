import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail, ok } from "@/lib/api-response";
import { setSystemLockState, getSystemLockState } from "@/lib/system-lock";

const schema = z.object({
  locked: z.boolean(),
  reason: z.string().max(300).optional().nullable(),
  hours: z.number().int().min(1).max(24 * 30).optional(),
  minutes: z.number().int().min(1).max(24 * 30 * 60).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);
  const state = await getSystemLockState();
  return ok(state);
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request body", 400);

  if (!parsed.data.locked) {
    await setSystemLockState({ locked: false });
    return ok({ locked: false });
  }

  const totalMinutes =
    typeof parsed.data.minutes === "number"
      ? parsed.data.minutes
      : typeof parsed.data.hours === "number"
        ? parsed.data.hours * 60
        : null;
  const lockedUntil = typeof totalMinutes === "number" ? new Date(Date.now() + totalMinutes * 60 * 1000).toISOString() : null;
  await setSystemLockState({
    locked: true,
    reason: parsed.data.reason ?? null,
    lockedUntil,
  });
  return ok({ locked: true, reason: parsed.data.reason ?? null, lockedUntil });
}
