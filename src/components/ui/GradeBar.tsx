type GradeBarProps = {
  score: number;
};

export default function GradeBar({ score }: GradeBarProps) {
  const colorClass = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${Math.max(8, Math.min(score, 100))}%` }} />
    </div>
  );
}
