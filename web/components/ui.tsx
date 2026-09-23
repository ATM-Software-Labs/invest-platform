import { clsx } from "@/lib/format";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">{children}</div>
  );
}

export type BadgeTone = "up" | "down" | "warn" | "neutral" | "info";

const PILL: Record<BadgeTone, string> = {
  up: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  down: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

import { getTradingViewSymbol } from "@/lib/catalog";
export function TickerBadge({ ticker }: { ticker: string }) {
  const symbol = ticker.replace(/^\$/, "").toUpperCase();
  return (
    <a
      href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol(symbol)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      ${symbol}
    </a>
  );
}


export function ProgressBar({
  value,
  max = 100,
  tone = "info",
}: {
  value: number;
  max?: number;
  tone?: BadgeTone;
}) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill =
    tone === "up"
      ? "bg-emerald-400"
      : tone === "down"
        ? "bg-rose-400"
        : tone === "warn"
          ? "bg-amber-400"
          : "bg-blue-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90" aria-hidden>
      <div className={clsx("h-full rounded-full transition-[width] duration-300", fill)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function Mono({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  const color =
    tone === "up"
      ? "text-emerald-400"
      : tone === "down"
        ? "text-rose-400"
        : tone === "warn"
          ? "text-amber-400"
          : tone === "info"
            ? "text-blue-400"
            : "text-slate-100";
  return <span className={clsx("font-mono tabular-nums", color, className)}>{children}</span>;
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500",
        className,
      )}
    >
      {children}
    </button>
  );
}




