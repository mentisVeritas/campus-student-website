import { RequestStatus } from "@prisma/client";

type StatusBadgeProps = {
  status: RequestStatus | "READ" | "UNREAD";
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "pending"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : normalized === "in_progress"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : normalized === "done" || normalized === "read"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {status.replace("_", " ")}
    </span>
  );
}
