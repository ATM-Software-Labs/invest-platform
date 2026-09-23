import { MetricItem } from "@/components/MetricItem";
import { Panel } from "@/components/ui";
import { formatMultiple, formatPct, isPlaceholderZero } from "@/lib/format";
import type { DerivedQuant, UnifiedAssetPayload } from "@/lib/types";

export function MoatAndCapitalMatrix({
  derived,
  asset,
}: {
  derived: DerivedQuant;
  asset: UnifiedAssetPayload;
}) {
  const completeness = derived.dataCompleteness;
  const netDebtEbitda =
    derived.netDebtToEbitda ??
    (asset.assetClass === "equity"
      ? ((asset.metrics as { capitalStructure?: { netDebtToEbitda?: number | null } }).capitalStructure
          ?.netDebtToEbitda ?? null)
      : null);

  const items = [
    {
      label: "ROIC 5A",
      value: formatPct(clean(derived.roic5Y, completeness)),
      hint: "ROIC medio 5 años",
    },
    {
      label: "Dilución 3A",
      value: formatPct(clean(derived.netShareChange3Y, completeness), 2),
      hint: "Cambio neto de acciones 3 años",
    },
    {
      label: "SBC/FCF",
      value: formatPct(clean(derived.sbcToFcf, completeness), 1),
      hint: "Stock-based compensation / FCF",
    },
    {
      label: "Capex/OCF",
      value: formatMultiple(clean(derived.capexToOcf, completeness)),
      hint: "Capex / cash flow operativo",
    },
    {
      label: "FCF yield",
      value: formatPct(clean(derived.fcfYield, completeness), 2),
      hint: "Flujo de caja libre / capitalización",
    },
    {
      label: "ND/EBITDA",
      value: formatMultiple(clean(netDebtEbitda, completeness)),
      hint: "Deuda neta / EBITDA",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Panel key={item.label} className="p-4">
          <MetricItem label={item.label} value={item.value} hint={item.hint} />
        </Panel>
      ))}
    </section>
  );
}

function clean(value: number | null | undefined, completeness: number): number | null {
  if (isPlaceholderZero(value, completeness)) return null;
  return value ?? null;
}
