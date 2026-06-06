"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Newspaper,
  Trophy,
  User,
  Users,
  Utensils,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { dashboardNavItems } from "@/lib/navigation";

type NavSection = "must" | "should" | "could";

const sectionTitle: Record<NavSection, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
};

const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/profile": User,
  "/dashboard/schedule": Calendar,
  "/dashboard/grades": GraduationCap,
  "/dashboard/gradebook": BookOpen,
  "/dashboard/news": Newspaper,
  "/dashboard/teachers": Users,
  "/dashboard/canteen": Utensils,
  "/dashboard/events": Calendar,
  "/dashboard/documents": FileText,
  "/dashboard/notifications": Bell,
  "/dashboard/bulletin": ClipboardList,
  "/dashboard/event-registration": ClipboardList,
  "/dashboard/portfolio": Trophy,
  "/dashboard/lost-found": FileText,
  "/dashboard/sports-schedule": Calendar,
  "/dashboard/sports-registration": Trophy,
  "/dashboard/dark-mode": Moon,
};

const grouped = {
  must: dashboardNavItems.filter((item) => item.section === "must"),
  should: dashboardNavItems.filter((item) => item.section === "should"),
  could: dashboardNavItems.filter((item) => item.section === "could"),
};

function NavRow({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const Icon = iconByHref[href] ?? LayoutDashboard;

  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
      <span>{label}</span>
    </Link>
  );
}

export default function SidebarNav() {
  return (
    <nav className="mt-6 space-y-5">
      <NavRow href="/dashboard" label="Dashboard" />
      {(Object.keys(grouped) as NavSection[]).map((section) => (
        <div key={section}>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {sectionTitle[section]}
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-1">
            {grouped[section].map((item) => (
              <NavRow key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
