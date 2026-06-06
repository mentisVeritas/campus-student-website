import { redirect } from "next/navigation";

/** Analytics are integrated into the main attendance page (same as admin). */
export default function TeacherAttendanceAnalyticsRedirectPage() {
  redirect("/dashboard/teacher/attendance");
}
