"use client";

import AdminAttendancePage from "@/app/dashboard/admin/attendance/page";

export default function TeacherAttendancePage() {
  return (
    <AdminAttendancePage
      overviewApiPath="/api/teacher/attendance/overview"
      cellApiPath="/api/teacher/attendance/cell"
      pageTitle="Attendance"
      pageDescription="Same workflow as admin: groups → subjects → monthly matrix. You only see classes and subjects assigned to you (My Classes + Teacher subjects)."
    />
  );
}
