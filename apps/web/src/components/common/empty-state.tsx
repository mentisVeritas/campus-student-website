import Link from "next/link";
import { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <Icon className="h-6 w-6 text-indigo-600" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
