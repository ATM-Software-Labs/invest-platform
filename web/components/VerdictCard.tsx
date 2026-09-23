"use client";

import { Badge, Panel } from "@/components/ui";
import { clsx } from "@/lib/format";
import type { PlainVerdict } from "@/lib/verdict";
import { useState } from "react";

type Tab = "veredicto" | "hold" | "buy";

export function VerdictCard({ verdict }: { verdict: PlainVerdict }) {
  const [tab, setTab] = useState<Tab>("veredicto");
  const body = tab === "veredicto" ? verdict.whatIs : tab === "hold" ? verdict.ifYouOwn : verdict.buyMore;
  const tone = verdict.light === "green" ? "up" : "warn";

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{verdict.lightLabel}</Badge>
      </div>
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-slate-800/80 bg-slate-950/40 p-1">
        {(
          [
            { id: "veredicto", label: "Veredicto" },
            { id: "hold", label: "Si la tienes" },
            { id: "buy", label: "Comprar más" },
          ] as const
        ).map((t) => (
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
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400">{body}</p>
    </Panel>
  );
}
