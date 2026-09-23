"use client";

import { CompanyLogo } from "@/components/CompanyLogo";
import { searchAssets, type DirectoryHit, type DirectoryStats } from "@/lib/api";
import { KIND_LABEL, assetHref, listingDomain } from "@/lib/catalog";
import { COUNTRY_FLAG } from "@/lib/format";
import { addToMesa, mesaHas, readMesa, removeFromMesa, subscribeMesa, type MesaItem } from "@/lib/mesa";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

export function GlobalAssetSearchBar({
  initial = "",
  stats,
  country,
  kind,
  sector,
}: {
  initial?: string;
  stats?: DirectoryStats | null;
  country?: string;
  kind?: string;
  sector?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<DirectoryHit[]>([]);
  const [total, setTotal] = useState<number | null>(stats?.count ?? null);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setPinned(readMesa().map((row) => row.id.toUpperCase()));
    sync();
    return subscribeMesa(sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      searchAssets(q, { limit: 48, country, kind, sector })
        .then((res) => {
          setHits(res.results);
          setTotal(res.count);
        })
        .catch(() => setHits([]));
    }, 160);
    return () => window.clearTimeout(t);
  }, [q, country, kind, sector]);

  const grouped = useMemo(() => {
    const map = new Map<string, DirectoryHit[]>();
    for (const h of hits) {
      const key = h.countryName || "Global";
      const list = map.get(key) ?? [];
      list.push(h);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [hits]);

  function go(id: string) {
    setOpen(false);
    router.push(assetHref(id));
  }

  function toggle(hit: DirectoryHit, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mesaHas(hit.id)) {
      removeFromMesa(hit.id);
      return;
    }
    addToMesa(hitToMesa(hit));
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 backdrop-blur-sm">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (hits[0] || q.trim())) go(hits[0]?.id ?? q.trim());
          }}
          placeholder={total ? `Buscar… ${total.toLocaleString("es-ES")}` : "Buscar"}
          className="w-full bg-transparent text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Búsqueda global de activos"
        />
        <kbd className="hidden shrink-0 rounded-md border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:block">
          ⌘K
        </kbd>
      </div>

      {open && grouped.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-900/95 backdrop-blur-sm">
          {grouped.map(([countryName, rows]) => (
            <div key={countryName}>
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                {COUNTRY_FLAG[rows[0]?.country ?? ""] ?? ""} {countryName}
              </div>
              {rows.map((a) => {
                const onMesa = pinned.includes(a.id.toUpperCase());
                return (
                  <div
                    key={`${a.kind}-${a.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <button type="button" onClick={() => go(a.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <CompanyLogo id={a.id} name={a.name} domain={listingDomain(a.id)} size={20} muted />
                      <span className="w-20 shrink-0 font-mono text-[12px] tabular-nums text-zinc-200">{a.id}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-400">{a.name}</span>
                      <span className="hidden shrink-0 text-[11px] text-zinc-600 sm:inline">
                        {KIND_LABEL[a.kind] ?? a.kind}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggle(a, e)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                        onMesa
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      }`}
                    >
                      {onMesa ? "En mesa" : "Añadir"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hitToMesa(hit: DirectoryHit): MesaItem {
  return {
    id: hit.id,
    name: hit.name,
    sleeve: hit.sleeve,
    venue: hit.venue,
    country: hit.country,
    countryName: hit.countryName,
    kind: hit.kind,
    sector: hit.sector,
    domain: listingDomain(hit.id),
  };
}
