export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-400">—</span>;

  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
      : pct >= 70
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}
