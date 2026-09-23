import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge, TickerBadge } from "@/components/ui";
import { listingDomain } from "@/lib/catalog";
import { COUNTRY_FLAG, priceAmount, priceDigits } from "@/lib/format";
import type { UnifiedAssetPayload } from "@/lib/types";
import type { PlainVerdict } from "@/lib/verdict";

export function AssetHeader({
  asset,
  displayName,
  verdict,
  onMesa,
}: {
  asset: UnifiedAssetPayload;
  displayName: string;
  verdict?: PlainVerdict;
  onMesa?: boolean;
}) {
  const { resolved, quote } = asset;
  const ticker = resolved.canonicalTicker || asset.identifier;
  const amount =
    quote.price != null ? priceAmount(quote.price, priceDigits(quote.price)) : null;
  const country = resolved.country;
  const verdictTone = verdict?.light === "green" ? "up" : "warn";

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo id={ticker} name={displayName} domain={listingDomain(ticker)} size={40} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-50">{displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TickerBadge ticker={ticker} />
            {resolved.exchange ? (
              <Badge tone="neutral">{resolved.exchange}</Badge>
            ) : null}
            {country ? (
              <Badge tone="neutral">
                {COUNTRY_FLAG[country] ?? ""} {country}
              </Badge>
            ) : null}
            {verdict ? <Badge tone={verdictTone}>{verdict.lightLabel}</Badge> : null}
            {onMesa ? <Badge tone="up">En mesa</Badge> : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-baseline gap-3 lg:justify-end">
        {amount ? (
          <p className="font-mono text-3xl tabular-nums tracking-tight text-slate-50">{amount}</p>
        ) : (
          <p className="text-sm text-slate-500">Cotización no disponible</p>
        )}
        {quote.currency && amount ? <p className="font-mono text-sm text-slate-500">{quote.currency}</p> : null}
        {quote.changePercent != null ? <ChangeBadge value={quote.changePercent} className="text-sm" /> : null}
      </div>
    </div>
  );
}
