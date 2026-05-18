import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { prisma } from "@/lib/prisma";
import { getSystemLockState } from "@/lib/system-lock";
import UsersFilters from "./UsersFilters";
import AdminUsersActions from "./AdminUsersActions";
import UserStatusAction from "./UserStatusAction";

type SearchParams = {
  role?: string;
  q?: string;
  year?: string;
  classId?: string;
  department?: string;
  homeroom?: string;
  sort?: string;
};

const roleOptions = [
  { value: "ALL", label: "All" },
  { value: "STUDENT", label: "Students" },
  { value: "TEACHER", label: "Teachers" },
  { value: "ADMIN", label: "Admins" },
  { value: "CANTEEN_STAFF", label: "Canteen" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const role = params.role ?? "ALL";
  const q = params.q?.trim() ?? "";
  const year = params.year ?? "ALL";
  const classId = params.classId ?? "ALL";
  const department = params.department ?? "ALL";
  const homeroom = params.homeroom ?? "ALL";
  const sort = params.sort ?? "name_asc";

  const [classes, departments, subjects, systemLock] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ year: "asc" }, { name: "asc" }],
      select: { id: true, name: true, year: true },
    }),
    prisma.teacher.findMany({
      distinct: ["department"],
      orderBy: { department: "asc" },
      select: { department: true },
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSystemLockState(),
  ]);

  const isStudentRole = role === "STUDENT";
  const isTeacherRole = role === "TEACHER";

  const where = {
    ...(role !== "ALL" ? { role: role as "ADMIN" | "TEACHER" | "STUDENT" | "CANTEEN_STAFF" } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { student: { studentCode: { contains: q, mode: "insensitive" as const } } },
            { teacher: { employeeId: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(isStudentRole && year !== "ALL"
      ? {
          student: {
            ...(classId !== "ALL" ? { classId } : {}),
            year: Number(year),
          },
        }
      : {}),
    ...(isStudentRole && year === "ALL" && classId !== "ALL"
      ? {
          student: {
            classId,
          },
        }
      : {}),
    ...(isTeacherRole && department !== "ALL"
      ? {
          teacher: {
            department,
          },
        }
      : {}),
    ...(isTeacherRole && homeroom === "HAS"
      ? {
          teacher: {
            ...(department !== "ALL" ? { department } : {}),
            classes: { some: { isHomeroom: true } },
          },
        }
      : {}),
    ...(isTeacherRole && homeroom === "NO"
      ? {
          teacher: {
            ...(department !== "ALL" ? { department } : {}),
            classes: { none: { isHomeroom: true } },
          },
        }
      : {}),
  };

  const orderBy =
    sort === "name_desc"
      ? [{ firstName: "desc" as const }, { lastName: "desc" as const }]
      : sort === "newest"
      ? [{ createdAt: "desc" as const }]
      : sort === "oldest"
      ? [{ createdAt: "asc" as const }]
      : [{ firstName: "asc" as const }, { lastName: "asc" as const }];

  const users = await prisma.user.findMany({
    where,
    orderBy,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      blockedUntil: true,
      blockReason: true,
      createdAt: true,
      student: {
        select: {
          classId: true,
          year: true,
          studentCode: true,
          class: { select: { name: true } },
        },
      },
      teacher: {
        select: {
          employeeId: true,
          department: true,
          subjects: {
            select: { subjectId: true, subject: { select: { id: true, name: true } } },
          },
          classes: {
            select: { classId: true, isHomeroom: true, class: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Manage accounts and roles." />
      <UsersFilters
        roleOptions={roleOptions.map((item) => ({ value: item.value, label: item.label }))}
        role={role}
        q={q}
        year={year}
        classId={classId}
        department={department}
        homeroom={homeroom}
        sort={sort}
        classes={classes.map((item) => ({ id: item.id, name: item.name }))}
        departments={departments}
      />
      <AdminUsersActions
        classes={classes.map((item) => ({ id: item.id, name: item.name, year: item.year }))}
        subjects={subjects}
        systemLockedInitial={systemLock.locked}
        systemLockedUntilInitial={systemLock.lockedUntil}
      />
      <DataTable headers={["Name", "Email", "Role", "Group", "Course", "Actions"]}>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
            <td className="px-4 py-3">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {user.firstName} {user.lastName}
              </p>
              {user.student ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.student.class?.name ?? "No group"} • {user.student.year} course • {user.student.studentCode}
                </p>
              ) : null}
              {user.teacher ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.teacher.department} • ID: {user.teacher.employeeId}
                  {user.teacher.classes.length ? ` • Homeroom: ${user.teacher.classes.map((item) => item.class.name).join(", ")}` : ""}
                </p>
              ) : null}
            </td>
            <td className="px-4 py-3">{user.email}</td>
            <td className="px-4 py-3">{user.role}</td>
            <td className="px-4 py-3">{user.student?.class?.name ?? "—"}</td>
            <td className="px-4 py-3">{user.student?.year ? `${user.student.year} course` : "—"}</td>
            <td className="px-4 py-3">
              <UserStatusAction
                userId={user.id}
                isBlocked={!user.isActive || Boolean(user.blockedUntil)}
                initialEmail={user.email}
                initialFirstName={user.firstName}
                initialLastName={user.lastName}
                initialRole={user.role}
                initialStudentYear={user.student?.year ?? null}
                initialStudentClassId={user.student?.classId ?? null}
                initialTeacherDepartment={user.teacher?.department ?? null}
                initialTeacherSubjectIds={user.teacher?.subjects.map((item) => item.subjectId) ?? []}
                initialTeacherClassIds={user.teacher?.classes.map((item) => item.classId) ?? []}
                initialHomeroomClassId={user.teacher?.classes.find((item) => item.isHomeroom)?.classId ?? null}
                classes={classes.map((item) => ({ id: item.id, name: item.name, year: item.year }))}
                subjects={subjects}
              />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
