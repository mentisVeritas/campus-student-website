"use client";

import { usePathname, useRouter } from "next/navigation";

type RoleOption = {
  value: string;
  label: string;
};

type ClassOption = {
  id: string;
  name: string;
};

type DepartmentOption = {
  department: string;
};

type Props = {
  roleOptions: RoleOption[];
  role: string;
  q: string;
  year: string;
  classId: string;
  department: string;
  homeroom: string;
  sort: string;
  classes: ClassOption[];
  departments: DepartmentOption[];
};

export default function UsersFilters({
  roleOptions,
  role,
  q,
  year,
  classId,
  department,
  homeroom,
  sort,
  classes,
  departments,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const isStudentRole = role === "STUDENT";
  const isTeacherRole = role === "TEACHER";

  const sanitizeByRole = (input: {
    role: string;
    q: string;
    year: string;
    classId: string;
    department: string;
    homeroom: string;
    sort: string;
  }) => {
    if (input.role !== "STUDENT") {
      input.year = "ALL";
      input.classId = "ALL";
    }
    if (input.role !== "TEACHER") {
      input.department = "ALL";
      input.homeroom = "ALL";
    }
    return input;
  };

  const update = (next: Partial<Record<"role" | "q" | "year" | "classId" | "department" | "homeroom" | "sort", string>>) => {
    const state = sanitizeByRole({
      role,
      q,
      year,
      classId,
      department,
      homeroom,
      sort,
      ...next,
    });

    const params = new URLSearchParams();
    if (state.role !== "ALL") params.set("role", state.role);
    if (state.q.trim()) params.set("q", state.q.trim());
    if (state.year !== "ALL") params.set("year", state.year);
    if (state.classId !== "ALL") params.set("classId", state.classId);
    if (state.department !== "ALL") params.set("department", state.department);
    if (state.homeroom !== "ALL") params.set("homeroom", state.homeroom);
    if (state.sort !== "name_asc") params.set("sort", state.sort);

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {roleOptions.map((option) => {
          const isActive = role === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update({ role: option.value })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-indigo-500 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
          <input
            value={q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Search name, email, code..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />

          {isStudentRole ? (
            <select
              value={year}
              onChange={(event) => update({ year: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All courses</option>
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={String(value)}>
                  {value} course
                </option>
              ))}
            </select>
          ) : null}

          {isStudentRole ? (
            <select
              value={classId}
              onChange={(event) => update({ classId: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All groups</option>
              {classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : null}

          {isTeacherRole ? (
            <select
              value={department}
              onChange={(event) => update({ department: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All departments</option>
              {departments.map((item) => (
                <option key={item.department} value={item.department}>
                  {item.department}
                </option>
              ))}
            </select>
          ) : null}

          {isTeacherRole ? (
            <select
              value={homeroom}
              onChange={(event) => update({ homeroom: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">Homeroom: all</option>
              <option value="HAS">Has homeroom</option>
              <option value="NO">No homeroom</option>
            </select>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="name_asc">Sort: A-Z</option>
            <option value="name_desc">Sort: Z-A</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
          <button
            type="button"
            onClick={() =>
              update({
                role: "ALL",
                q: "",
                year: "ALL",
                classId: "ALL",
                department: "ALL",
                homeroom: "ALL",
                sort: "name_asc",
              })
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
