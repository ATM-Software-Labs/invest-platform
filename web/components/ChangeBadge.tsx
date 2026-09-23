import { clsx, signedPct } from "@/lib/format";

export function ChangeBadge({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value == null || Number.isNaN(value)) return null;
  const tone = value > 0 ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-slate-500";
  return (
    <span className={clsx("inline-block min-w-[4.5rem] text-right font-mono text-[13px] tabular-nums", tone, className)}>
      {signedPct(value)}
    </span>
  );
}
