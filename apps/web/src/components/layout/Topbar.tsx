import { Bell } from "lucide-react";

type TopbarProps = {
  title: string;
  subtitle?: string;
  userName: string;
};

export default function Topbar({ title, subtitle, userName }: TopbarProps) {
  return (
    <header className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-700 dark:text-slate-300">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {userName}
        </div>
      </div>
    </header>
  );
}
