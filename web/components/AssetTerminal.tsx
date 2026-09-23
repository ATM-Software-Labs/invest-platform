"use client";

import { InvestAssetView } from "@/components/InvestAssetView";
import { loadTerminal } from "@/lib/api";
import { displayName } from "@/lib/catalog";
import { hydrateSiemensAnalysis } from "@/lib/siemens";
import type { InstitutionalAnalysis, UnifiedAssetPayload } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function identifierFromUrl(queryId: string | null): string {
  if (queryId?.trim()) return queryId.trim();
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] === "asset" && parts[1] && parts[1] !== "_") {
    return parts.slice(1).map(decodeURIComponent).join("/");
  }
  return "";
}

export function AssetTerminal() {
  const params = useSearchParams();
  const identifier = identifierFromUrl(params.get("id"));

  const [asset, setAsset] = useState<UnifiedAssetPayload | null>(null);
  const [analysis, setAnalysis] = useState<InstitutionalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) {
      setError("Identificador vacío");
      return;
    }
    let cancelled = false;
    setError(null);
    setAsset(null);
    setAnalysis(null);
    loadTerminal(identifier)
      .then((data) => {
        if (cancelled) return;
        setAsset(data.asset);
        setAnalysis(hydrateSiemensAnalysis(data.asset, data.analysis));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error de carga");
      });
    return () => {
      cancelled = true;
    };
  }, [identifier]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400">Fallo de mesa</div>
        <h1 className="mt-3 text-2xl text-slate-100">{identifier || "Sin identificador"}</h1>
        <p className="mt-3 font-mono text-[13px] text-slate-500">{error}</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500">
          Volver a la búsqueda
        </Link>
      </div>
    );
  }

  if (!asset || !analysis) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-5 py-8">
        <div className="h-32 animate-pulse rounded-xl border border-slate-800/80 bg-slate-900/60" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-800/80 bg-slate-900/60" />
          ))}
        </div>
        <p className="text-sm text-slate-500">Cargando {identifier}…</p>
      </div>
    );
  }

  return (
    <InvestAssetView
      asset={asset}
      analysis={analysis}
      displayName={displayName(asset.resolved.canonicalTicker, asset.resolved.localTicker, asset.identifier)}
    />
  );
}
