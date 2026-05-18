"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/auth";
import Sidebar from "./Sidebar";

type DashboardShellProps = {
  role: UserRole;
  unreadCount: number;
  unreadAnnouncementCount: number;
  children: ReactNode;
};

export default function DashboardShell({ role, unreadCount, unreadAnnouncementCount, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fromStorage = localStorage.getItem("csw_dark_mode") === "1";
    document.documentElement.classList.toggle("dark", fromStorage);

    fetch("/api/preferences")
      .then((response) => response.json())
      .then((payload) => {
        const enabled = Boolean(payload.data?.darkMode);
        localStorage.setItem("csw_dark_mode", enabled ? "1" : "0");
        document.documentElement.classList.toggle("dark", enabled);
      });
  }, []);

  return (
    <div data-shell-root className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex h-full w-full max-w-[1440px] gap-4 p-4 md:p-6">
        <div className="group/sidebar hidden h-[calc(100vh-3rem)] w-[76px] shrink-0 overflow-hidden transition-all duration-300 hover:w-[285px] lg:block">
          <aside className="z-30 h-full w-full rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Sidebar
              role={role}
              unreadCount={unreadCount}
              unreadAnnouncementCount={unreadAnnouncementCount}
              compact
            />
          </aside>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="h-full w-[290px] bg-white dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
              <Sidebar
                role={role}
                unreadCount={unreadCount}
                unreadAnnouncementCount={unreadAnnouncementCount}
                compact={false}
              />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Toggle sidebar"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
