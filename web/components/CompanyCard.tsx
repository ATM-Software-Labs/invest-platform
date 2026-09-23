"use client";

import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { clsx, priceAmount, priceDigits } from "@/lib/format";
import { getTradingViewSymbol } from "@/lib/catalog";
import Link from "next/link";

export interface CompanyCardProps {
  id: string;
  name: string;
  href: string;
  domain?: string | null;
  priceValue?: number | null;
  currency?: string | null;
  changePercent?: number | null;
  meta?: string;
  rank?: string;
  onRemove?: () => void;
}

export function CompanyCard({
  id,
  name,
  href,
  domain,
  priceValue,
  currency,
  changePercent,
  meta,
  rank,
  onRemove,
}: CompanyCardProps) {
  const digits = priceValue != null ? (Math.abs(priceValue) < 10 ? 4 : priceDigits(priceValue)) : 2;
  const amount = priceAmount(priceValue ?? null, digits);

  return (
    <div className="group relative">
      <Link
        href={href}
        className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_8rem_4.75rem]"
      >
        <span className="flex min-w-0 items-center gap-3">
          {rank ? (
            <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-zinc-600">{rank}</span>
          ) : null}
          <CompanyLogo id={id} name={name} domain={domain} size={22} muted />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] text-zinc-100">{name}</span>
            <span className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-zinc-500">
              <a
                href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol(id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline cursor-pointer hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {id}
              </a>
              {meta ? <span className="hidden text-zinc-600 sm:inline"> · {meta}</span> : null}
            </span>
          </span>
        </span>
        <span className="hidden items-baseline justify-end gap-1.5 sm:flex">
          <span className="font-mono text-[13px] tabular-nums text-zinc-100">{amount}</span>
          {currency ? <span className="font-mono text-[11px] text-zinc-600">{currency}</span> : null}
        </span>
        <span className="flex flex-col items-end sm:block">
          <span className="font-mono text-[12px] tabular-nums text-zinc-100 sm:hidden">{amount}</span>
          <ChangeBadge value={changePercent} />
        </span>
      </Link>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            "absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 opacity-0 transition-opacity duration-150",
            "hover:text-zinc-300 group-hover:opacity-100",
          )}
          aria-label={`Quitar ${name} de la mesa`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}


