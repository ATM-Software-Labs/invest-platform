import { AssetTerminal } from "@/components/AssetTerminal";
import { Suspense } from "react";

export default function AssetPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-slate-500">Cargando…</div>
      }
    >
      <AssetTerminal />
    </Suspense>
  );
}
