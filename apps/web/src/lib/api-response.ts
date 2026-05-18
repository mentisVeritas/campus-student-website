import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Admin schedule: soft-rule violations; client retries with confirmAdminOverrides: true */
export const ADMIN_SCHEDULE_CONFIRM_CODE = "ADMIN_SCHEDULE_CONFIRM" as const;

export function failNeedsConfirmation(error: string, warnings: string[]) {
  return NextResponse.json(
    { error, code: ADMIN_SCHEDULE_CONFIRM_CODE, warnings },
    { status: 409 },
  );
}
