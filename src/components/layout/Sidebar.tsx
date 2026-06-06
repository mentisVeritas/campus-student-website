"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Bell, BookOpen, Calendar, FileText, LayoutDashboard, Newspaper, Trophy, User, Utensils, Users } from "lucide-react";
import type { UserRole } from "@/lib/auth";

type SidebarProps = {
  role: UserRole;
  unreadCount: number;
  unreadAnnouncementCount: number;
  compact?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function studentSections(unreadCount: number, unreadAnnouncementCount: number): NavSection[] {
  return [
    {
      title: "ACADEMIC",
      items: [
        { href: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/student/schedule", label: "Schedule", icon: Calendar },
        { href: "/dashboard/student/grades", label: "Grades", icon: BookOpen },
        { href: "/dashboard/student/gradebook", label: "Gradebook", icon: BookOpen },
        { href: "/dashboard/student/attendance", label: "Attendance", icon: Calendar },
      ],
    },
    {
      title: "CAMPUS",
      items: [
        { href: "/dashboard/student/news", label: "News", icon: Newspaper },
        {
          href: "/dashboard/student/announcements",
          label: "Announcements",
          icon: Newspaper,
          badge: unreadAnnouncementCount > 0 ? String(unreadAnnouncementCount) : undefined,
        },
        { href: "/dashboard/student/events", label: "Events", icon: Calendar },
        { href: "/dashboard/student/sports", label: "Club", icon: Trophy },
        { href: "/dashboard/student/portfolio", label: "Portfolio", icon: Trophy },
        { href: "/dashboard/student/canteen", label: "Canteen", icon: Utensils },
        { href: "/dashboard/student/teachers", label: "Teachers", icon: Users },
      ],
    },
    {
      title: "SERVICES",
      items: [
        { href: "/dashboard/student/documents", label: "Documents", icon: FileText },
        {
          href: "/dashboard/student/notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
        },
        { href: "/dashboard/student/lost-found", label: "Lost & Found", icon: FileText },
        { href: "/dashboard/student/bulletin", label: "Bulletin", icon: Newspaper },
        { href: "/dashboard/student/rankings", label: "Rankings", icon: Trophy },
      ],
    },
  ];
}

function adminSections(unreadCount: number, unreadAnnouncementCount: number): NavSection[] {
  return [
    {
      title: "MANAGEMENT",
      items: [
        { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/admin/users", label: "Users", icon: User },
        { href: "/dashboard/admin/classes", label: "Classes", icon: Calendar },
        { href: "/dashboard/admin/subjects", label: "Subjects", icon: BookOpen },
        { href: "/dashboard/admin/schedule", label: "Schedule", icon: Calendar },
        { href: "/dashboard/admin/attendance", label: "Attendance", icon: Calendar },
        { href: "/dashboard/admin/lost-found", label: "Lost & Found", icon: FileText },
        { href: "/dashboard/admin/document-requests", label: "Document Requests", icon: FileText },
        { href: "/dashboard/admin/news", label: "News", icon: Newspaper },
        {
          href: "/dashboard/admin/notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
        },
        {
          href: "/dashboard/admin/announcements",
          label: "Announcements",
          icon: Newspaper,
          badge: unreadAnnouncementCount > 0 ? String(unreadAnnouncementCount) : undefined,
        },
      ],
    },
    {
      title: "CAMPUS",
      items: [{ href: "/dashboard/admin/canteen", label: "Canteen", icon: Utensils }],
    },
    {
      title: "ACCOUNT",
      items: [],
    },
  ];
}

function roleSections(role: UserRole, unreadCount: number, unreadAnnouncementCount: number): NavSection[] {
  if (role === "ADMIN") return adminSections(unreadCount, unreadAnnouncementCount);
  if (role === "STUDENT") return studentSections(unreadCount, unreadAnnouncementCount);
  if (role === "TEACHER") {
    return [
      {
        title: "TEACHING",
        items: [
          { href: "/dashboard/teacher", label: "Dashboard", icon: LayoutDashboard },
          { href: "/dashboard/teacher/schedule", label: "Schedule", icon: Calendar },
          { href: "/dashboard/teacher/attendance", label: "Attendance", icon: Calendar },
          { href: "/dashboard/teacher/my-classes", label: "My Classes", icon: Calendar },
          { href: "/dashboard/teacher/grades", label: "Grades", icon: BookOpen },
          { href: "/dashboard/teacher/lost-found", label: "Lost & Found", icon: FileText },
          {
            href: "/dashboard/teacher/notifications",
            label: "Notifications",
            icon: Bell,
            badge: unreadCount > 0 ? String(unreadCount) : undefined,
          },
          {
            href: "/dashboard/teacher/announcements",
            label: "Announcements",
            icon: Newspaper,
            badge: unreadAnnouncementCount > 0 ? String(unreadAnnouncementCount) : undefined,
          },
          { href: "/dashboard/teacher/documents", label: "Documents", icon: FileText },
        ],
      },
      {
        title: "CAMPUS",
        items: [{ href: "/dashboard/teacher/canteen", label: "Canteen", icon: Utensils }],
      },
      {
        title: "ACCOUNT",
        items: [],
      },
    ];
  }
  if (role === "CANTEEN_STAFF") {
    return [
      {
        title: "CANTEEN",
        items: [
          { href: "/dashboard/canteen", label: "Dashboard", icon: LayoutDashboard },
          { href: "/dashboard/canteen/menu", label: "Menu Manager", icon: Calendar },
          { href: "/dashboard/canteen/lost-found", label: "Lost & Found", icon: FileText },
          {
            href: "/dashboard/canteen/notifications",
            label: "Notifications",
            icon: Bell,
            badge: unreadCount > 0 ? String(unreadCount) : undefined,
          },
          { href: "/dashboard/canteen/documents", label: "Documents", icon: FileText },
        ],
      },
      {
        title: "ACCOUNT",
        items: [],
      },
    ];
  }
  return [];
}

function profileHrefByRole(role: UserRole): string {
  if (role === "STUDENT") return "/dashboard/student/profile";
  if (role === "TEACHER") return "/dashboard/teacher/profile";
  return "/dashboard/profile";
}

export default function Sidebar({
  role,
  unreadCount,
  unreadAnnouncementCount,
  compact = false,
}: SidebarProps) {
  const pathname = usePathname();
  const sections = roleSections(role, unreadCount, unreadAnnouncementCount);
  const visibleSections = sections.filter((section) => section.items.length > 0);
  const profileHref = profileHrefByRole(role);
  const isProfileActive = pathname === profileHref || pathname.startsWith(`${profileHref}/`);
  const allItems = sections.flatMap((section) => section.items);
  const activeHref = isProfileActive
    ? null
    : allItems
        .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <aside className="relative flex h-full w-full flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs font-bold uppercase tracking-widest text-slate-400 transition-all duration-200 ${
              compact
                ? "rounded-md bg-slate-100 px-2 py-1 text-[10px] dark:bg-slate-800"
                : ""
            }`}
          >
            {compact ? "CP" : "Campus Portal"}
          </p>
        </div>
        <p
          className={`mt-1 text-sm font-semibold text-slate-900 transition-all duration-200 dark:text-slate-100 ${
            compact ? "max-h-0 overflow-hidden opacity-0 group-hover/sidebar:max-h-8 group-hover/sidebar:opacity-100" : ""
          }`}
        >
          {role.replace("_", " ")}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.title}>
            <p
              className={`px-3 mt-5 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all duration-200 ${
                compact ? "max-h-0 overflow-hidden opacity-0 group-hover/sidebar:max-h-6 group-hover/sidebar:opacity-100" : ""
              }`}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeHref === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span
                      className={`flex-1 whitespace-nowrap transition-all duration-200 ${
                        compact ? "w-0 overflow-hidden opacity-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span
                        className={`rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 transition-all duration-200 ${
                          compact ? "hidden group-hover/sidebar:inline-flex" : "inline-flex"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            {sectionIndex < visibleSections.length - 1 ? <div className="my-2 border-t border-slate-100 dark:border-slate-700" /> : null}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-2 dark:border-slate-700">
        <Link
          href={profileHref}
          aria-current={isProfileActive ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
            isProfileActive
              ? "border-violet-500 bg-violet-600 text-white shadow-sm dark:border-violet-400 dark:bg-violet-500 dark:text-white"
              : "border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50"
          }`}
        >
          <User className="h-5 w-5" />
          <span
            className={`flex-1 whitespace-nowrap transition-all duration-200 ${
              compact ? "w-0 overflow-hidden opacity-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100" : ""
            }`}
          >
            Profile
          </span>
        </Link>
      </div>
    </aside>
  );
}
