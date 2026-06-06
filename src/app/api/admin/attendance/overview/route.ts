import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { fail } from "@/lib/api-response";
import { attendanceOverviewGet } from "@/server/attendance-overview-get";

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) return fail("Forbidden", 403);
  return attendanceOverviewGet(request.nextUrl.searchParams, { mode: "admin" });
}
