import { prisma } from "@/lib/prisma";

export const SYSTEM_LOCK_KEY = "SYSTEM_LOCK";

export type SystemLockState = {
  locked: boolean;
  reason: string | null;
  lockedUntil: string | null;
};

export async function getSystemLockState(): Promise<SystemLockState> {
  const setting = await prisma.appSetting.findUnique({ where: { key: SYSTEM_LOCK_KEY } });
  if (!setting) return { locked: false, reason: null, lockedUntil: null };
  try {
    const parsed = JSON.parse(setting.value) as { locked?: boolean; reason?: string | null; lockedUntil?: string | null };
    const lockedUntil = parsed.lockedUntil ?? null;
    if (lockedUntil && Number.isFinite(Date.parse(lockedUntil)) && Date.parse(lockedUntil) <= Date.now()) {
      await prisma.appSetting.delete({ where: { key: SYSTEM_LOCK_KEY } }).catch(() => {});
      return { locked: false, reason: null, lockedUntil: null };
    }
    return {
      locked: Boolean(parsed.locked),
      reason: parsed.reason ?? null,
      lockedUntil,
    };
  } catch {
    return { locked: false, reason: null, lockedUntil: null };
  }
}

export async function setSystemLockState(payload: { locked: boolean; reason?: string | null; lockedUntil?: string | null }) {
  if (!payload.locked) {
    await prisma.appSetting.deleteMany({ where: { key: SYSTEM_LOCK_KEY } });
    return;
  }
  await prisma.appSetting.upsert({
    where: { key: SYSTEM_LOCK_KEY },
    create: {
      key: SYSTEM_LOCK_KEY,
      value: JSON.stringify({
        locked: true,
        reason: payload.reason ?? null,
        lockedUntil: payload.lockedUntil ?? null,
      }),
    },
    update: {
      value: JSON.stringify({
        locked: true,
        reason: payload.reason ?? null,
        lockedUntil: payload.lockedUntil ?? null,
      }),
    },
  });
}
