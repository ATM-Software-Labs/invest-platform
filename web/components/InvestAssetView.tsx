"use client";

import { AddToMesaButton } from "@/components/AddToMesaButton";
import { AIAnalystReportView } from "@/components/AIAnalystReportView";
import { AssetHeader } from "@/components/AssetHeader";
import { MoatAndCapitalMatrix } from "@/components/MoatAndCapitalMatrix";
import { RegulatoryBanner } from "@/components/RegulatoryBanner";
import { StyleAffinityPanel } from "@/components/StyleAffinityPanel";
import { VerdictCard } from "@/components/VerdictCard";
import { listingDomain } from "@/lib/catalog";
import { mesaHas, readMesa, subscribeMesa } from "@/lib/mesa";
import type { InvestAssetViewModel } from "@/lib/types";
import { plainVerdict } from "@/lib/verdict";
import { useEffect, useState } from "react";

export function InvestAssetView(model: InvestAssetViewModel) {
  const { asset, analysis, displayName } = model;
  const verdict = plainVerdict(model);
  const ticker = asset.resolved.canonicalTicker || asset.identifier;
  const [onMesa, setOnMesa] = useState(false);

  useEffect(() => {
    const sync = () => setOnMesa(mesaHas(ticker, readMesa()));
    sync();
    return subscribeMesa(sync);
  }, [ticker]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-5 py-8">
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <AssetHeader asset={asset} displayName={displayName} verdict={verdict} onMesa={onMesa} />
          </div>
          <AddToMesaButton
            item={{
              id: ticker,
              name: displayName,
              sleeve: asset.assetClass === "forex" ? "forex" : asset.assetClass,
              venue: asset.resolved.exchange,
              country: asset.resolved.country || "GL",
              countryName: asset.resolved.country || "Global",
              kind: asset.assetClass === "equity" ? "stock" : asset.assetClass,
              sector: asset.resolved.assetClass === "equity" ? "Equity" : "Otros",
              domain: listingDomain(ticker),
            }}
          />
        </div>
        <div className="mt-5">
          <RegulatoryBanner compact />
        </div>
      </section>

      <VerdictCard verdict={verdict} />
      <MoatAndCapitalMatrix derived={analysis.scoring.derived} asset={asset} />
      <StyleAffinityPanel archetypes={analysis.scoring.archetypes} bestFit={analysis.scoring.bestFit} />
      <AIAnalystReportView analysis={analysis} />
    </div>
  );
}

export default InvestAssetView;
