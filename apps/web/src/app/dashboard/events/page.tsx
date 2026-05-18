import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/session";

/** Legacy URL from older nav maps — student calendar and list live here. */
export default async function DashboardEventsRedirectPage() {
  await requireCurrentUser();
  redirect("/dashboard/student/events");
}
