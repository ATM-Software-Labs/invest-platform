"use client";

import { Badge, Panel, ProgressBar } from "@/components/ui";
import { ARCHETYPE_COPY, ARCHETYPE_ORDER } from "@/lib/affinity";
import { clsx } from "@/lib/format";
import type { ArchetypeId, ArchetypeScore } from "@/lib/types";
import { useState } from "react";

function barTone(affinity: number): "up" | "warn" | "down" | "info" {
  if (affinity >= 70) return "up";
  if (affinity >= 40) return "warn";
  if (affinity > 0) return "info";
  return "down";
}

export function StyleAffinityPanel({
  archetypes,
  bestFit,
}: {
  archetypes: Record<ArchetypeId, ArchetypeScore>;
  bestFit: ArchetypeId;
}) {
  const [open, setOpen] = useState<ArchetypeId>(bestFit);
  const selected = archetypes[open];
  const copy = ARCHETYPE_COPY[open];

  const totalAffinity = Object.values(archetypes).reduce((acc, a) => acc + (a?.affinity || 0), 0);
  
  if (totalAffinity === 0) {
    return (
      <Panel>
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Afinidad</p>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500"></div>
          <p className="text-sm font-medium text-slate-300">Calculando ratios...</p>
          <p className="mt-1 text-xs text-slate-500">Evaluando métricas para estilos de inversión</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Afinidad</p>
        <Badge tone="info">Mejor encaje · {ARCHETYPE_COPY[bestFit].short}</Badge>
      </div>
      <div className="space-y-1">
        {ARCHETYPE_ORDER.map((id) => {
          const a = archetypes[id];
          if (!a) return null;
          const on = open === id;
          const max = a.maxPoints || 100;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpen(id)}
              className={clsx(
                "w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                on ? "bg-slate-800/70" : "hover:bg-slate-800/40",
              )}
              aria-pressed={on}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className={clsx("text-[13px]", on ? "text-slate-100" : "text-slate-400")}>
                  {ARCHETYPE_COPY[id].short}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-slate-300">
                  {a.affinity}/{max}
                </span>
              </div>
              <ProgressBar value={a.affinity} max={max} tone={barTone(a.affinity)} />
            </button>
          );
        })}
      </div>
      {selected && copy ? (
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <p className="text-[13px] text-slate-300">{copy.full}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">{copy.thesis}</p>
          <ul className="mt-4 space-y-3">
            {selected.factors.map((f) => {
              const missing = f.passed === null;
              const tone = missing ? "neutral" : f.passed ? "up" : "down";
              return (
                <li key={f.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-slate-400">{f.label}</span>
                    {missing ? (
                      <span className="shrink-0 rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-500">
                        Sin dato
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-slate-300">
                        {f.awarded}/{f.maxPoints}
                      </span>
                    )}
                  </div>
                  <ProgressBar value={missing ? 0 : f.awarded} max={f.maxPoints} tone={tone} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
