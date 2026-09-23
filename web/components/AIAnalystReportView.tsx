"use client";

import { Panel } from "@/components/ui";
import { ARCHETYPE_COPY } from "@/lib/affinity";
import { MOAT_LABEL, RISK_LABEL, STANCE_LABEL, clsx, compactNumber, price } from "@/lib/format";
import type { InstitutionalAnalysis } from "@/lib/types";
import { useState } from "react";

type Tab = "veredicto" | "moat" | "riesgos" | "valoracion";

export function AIAnalystReportView({ analysis }: { analysis: InstitutionalAnalysis }) {
  const [tab, setTab] = useState<Tab>("veredicto");
  const q = analysis.qualitative;
  const fv = analysis.fairValueScenarios;
  const best = analysis.scoring.bestFit;
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "veredicto", label: "Veredicto" },
    { id: "moat", label: "Moat" },
    { id: "riesgos", label: "Riesgos" },
    { id: "valoracion", label: "Valoración" },
  ];

  return (
    <Panel>
      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-full border border-slate-800/80 bg-slate-950/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150",
              tab === t.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "veredicto" && (
        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <p>
            {q?.executiveSummary ??
              `Máxima afinidad en ${ARCHETYPE_COPY[best].short} (${analysis.scoring.archetypes[best].affinity}/${analysis.scoring.archetypes[best].maxPoints || 100}). ${ARCHETYPE_COPY[best].thesis}.`}
          </p>
          {q?.capitalAllocationVerdict && (
            <p className="text-slate-500">
              {STANCE_LABEL[q.capitalAllocationVerdict.stance]}. {q.capitalAllocationVerdict.rationale}
            </p>
          )}
        </div>
      )}

      {tab === "moat" && (
        <p className="text-sm leading-relaxed text-slate-300">
          {q
            ? `${MOAT_LABEL[q.moatAnalysis.type]}. ${q.moatAnalysis.rationale}`
            : "La taxonomía de foso es cualitativa; el motor entrega ROIC, márgenes y dilución."}
        </p>
      )}

      {tab === "riesgos" && (
        <ul className="space-y-3 text-sm">
          {(q?.keyRisks ?? []).map((r, i) => (
            <li key={`${r.code}-${i}`}>
              <span className="text-slate-200">{RISK_LABEL[r.code]}</span>
              <span className="text-slate-500"> · {r.detail}</span>
            </li>
          ))}
          {!q && (
            <li className="text-slate-500">Sin notas cualitativas. Revise los factores en rojo del panel de afinidad.</li>
          )}
        </ul>
      )}

      {tab === "valoracion" && (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            {fv.method === "historical_fcf_multiples"
              ? "FCF trailing × 12 / 18 / 25. El modelo no recalcula."
              : "Este activo no se valora por múltiplos de FCF."}
          </p>
          <ul className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800/80">
            {(["pessimistic", "base", "optimistic"] as const).map((k) => {
              const row = fv[k];
              const label = k === "pessimistic" ? "Pesimista" : k === "base" ? "Base" : "Optimista";
              const px = row.impliedPrice != null ? price(row.impliedPrice, fv.currency) : null;
              const eq = row.impliedEquityValue != null ? compactNumber(row.impliedEquityValue, fv.currency) : null;
              return (
                <li key={k} className="flex items-baseline justify-between bg-slate-950/30 px-4 py-2.5 text-sm">
                  <span className="text-slate-500">
                    {label}
                    {row.fcfMultiple != null ? ` · ${row.fcfMultiple}×` : ""}
                  </span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {px ?? "Sin dato"}
                    {eq ? <span className="ml-3 text-slate-500">{eq}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
