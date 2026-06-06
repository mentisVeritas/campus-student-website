import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const { user } = await requireCurrentUser();
  const map = {
    ADMIN: "/dashboard/admin",
    TEACHER: "/dashboard/teacher",
    STUDENT: "/dashboard/student",
    CANTEEN_STAFF: "/dashboard/canteen",
  } as const;
  redirect(map[user.role]);
}
