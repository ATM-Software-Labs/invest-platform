"use client";

import { listingDomain } from "@/lib/catalog";
import { addToMesa, mesaHas, readMesa, removeFromMesa, subscribeMesa, type MesaItem } from "@/lib/mesa";
import { useEffect, useState } from "react";

export function AddToMesaButton({ item }: { item: MesaItem }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(mesaHas(item.id, readMesa()));
    sync();
    return subscribeMesa(sync);
  }, [item.id]);

  return (
    <button
      type="button"
      onClick={() => {
        if (on) removeFromMesa(item.id);
        else addToMesa({ ...item, domain: item.domain ?? listingDomain(item.id) });
      }}
      className={
        on
          ? "inline-flex shrink-0 items-center self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-400"
          : "inline-flex shrink-0 items-center self-start rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
      }
    >
      {on ? "En mesa" : "Añadir a mesa"}
    </button>
  );
}
