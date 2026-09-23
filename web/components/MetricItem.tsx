export interface MetricItemProps {
  label: string;
  value: string | null;
  hint?: string;
}

export function MetricItem({ label, value, hint }: MetricItemProps) {
  return (
    <div className="min-w-0" title={hint}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      {value ? (
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-slate-50">{value}</p>
      ) : (
        <p className="mt-2 font-mono text-xl tabular-nums tracking-tight text-slate-500">N/D</p>
      )}
      {hint ? <p className="sr-only">{hint}</p> : null}
    </div>
  );
}

