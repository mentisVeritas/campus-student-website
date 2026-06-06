import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  accentClass: string;
  icon?: ReactNode;
};

export default function StatCard({ label, value, accentClass, icon }: StatCardProps) {
  return (
    <article className={`rounded-xl border-l-4 bg-white p-5 shadow-sm dark:bg-slate-900 ${accentClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{icon}</div> : null}
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </article>
  );
}
