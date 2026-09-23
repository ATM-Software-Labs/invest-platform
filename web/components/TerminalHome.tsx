"use client";

import { CompanyCard } from "@/components/CompanyCard";
import { fetchDirectoryStats, fetchUniverse, type DirectoryStats, type UniverseBoard, type UniverseRow } from "@/lib/api";
import { ARCHETYPE_COPY } from "@/lib/affinity";
import { KIND_LABEL, assetHref, listingDomain } from "@/lib/catalog";
import { COUNTRY_FLAG } from "@/lib/format";
import { DEFAULT_MESA, readMesa, removeFromMesa, resetMesa, subscribeMesa, type MesaItem } from "@/lib/mesa";
import type { ArchetypeId } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export function TerminalHome() {
  const [board, setBoard] = useState<UniverseBoard | null>(null);
  const [stats, setStats] = useState<DirectoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState("");
  const [sector, setSector] = useState("");
  const [mesa, setMesa] = useState<MesaItem[]>(DEFAULT_MESA);

  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [qMarket, setQMarket] = useState("");
  const [qStyle, setQStyle] = useState("");
  const [qSector, setQSector] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem("invest_onboarding");
      if (done) setOnboardingDone(true);
    }
  }, []);

  const completeOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("invest_onboarding", "true");
    }
    setOnboardingDone(true);
    
    // Auto-filter based on answers (basic matching for the requested functionality)
    if (qMarket === "España") setCountry("ES");
    if (qMarket === "EE.UU.") setCountry("US");
    if (qSector === "Tecnología") setSector("Tecnología");
    if (qSector === "Financiero/Energía") setSector("Financiero"); // Approximation
  };


  useEffect(() => {
    const sync = () => setMesa(readMesa());
    sync();
    return subscribeMesa(sync);
  }, []);

  useEffect(() => {
    fetchUniverse()
      .then(setBoard)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error"));
    fetchDirectoryStats()
      .then(setStats)
      .catch(() => undefined);
  }, []);

  
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { price: number; changePercent: number; currency: string }>>({});

  useEffect(() => {
    if (!board) return;
    const tickers = [...new Set([...(board.mesa || []).map(r => r.id), ...(board.assets || []).map(r => r.id)])].join(',');
    if (!tickers) return;
    fetch(`/api/v1/quotes?tickers=${tickers}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setLiveQuotes(data);
      })
      .catch(console.error);
  }, [board]);

  const quoteById = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of board?.mesa ?? []) map.set(row.id.toUpperCase(), { ...row, ...liveQuotes[row.id] });
    for (const row of board?.assets ?? []) map.set(row.id.toUpperCase(), { ...row, ...liveQuotes[row.id] });
    return map;
  }, [board, liveQuotes]);


  const cards = useMemo(() => {
    return mesa.filter((row) => {
      if (country && row.country !== country) return false;
      if (kind && row.kind !== kind) return false;
      if (sector && row.sector !== sector) return false;
      return true;
    });
  }, [mesa, country, kind, sector]);

  const grouped = useMemo(() => {
    const byCountry = new Map<string, MesaItem[]>();
    for (const row of cards) {
      const key = row.countryName || "Global";
      const list = byCountry.get(key) ?? [];
      list.push(row);
      byCountry.set(key, list);
    }
    return [...byCountry.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [cards]);

  const countryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of mesa) seen.set(row.country, `${COUNTRY_FLAG[row.country] ?? ""} ${row.countryName}`.trim());
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [mesa]);

  const sectorOptions = useMemo(() => {
    const seen = [...new Set(mesa.map((row) => row.sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    return seen.map((id) => ({ id, label: id }));
  }, [mesa]);

  const kindOptions = useMemo(() => {
    const seen = [...new Set(mesa.map((row) => row.kind))];
    return seen.map((id) => ({ id, label: KIND_LABEL[id] ?? id }));
  }, [mesa]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      
      {!onboardingDone ? (
        <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Configura tu Perfil de Inversión</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">1. ¿Mercado preferido?</label>
              <select value={qMarket} onChange={(e) => setQMarket(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="España">España</option>
                <option value="Europa">Europa</option>
                <option value="EE.UU.">EE.UU.</option>
                <option value="Global">Global</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">2. ¿Estilo de inversión?</label>
              <select value={qStyle} onChange={(e) => setQStyle(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="Calidad">Calidad/Buffett</option>
                <option value="Dividendos">Dividendos</option>
                <option value="Crecimiento">Crecimiento/Tech</option>
                <option value="Valor">Valor Profundo</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">3. ¿Sector de interés?</label>
              <select value={qSector} onChange={(e) => setQSector(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="Defensa">Defensa/Industria</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Financiero/Energía">Financiero/Energía</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={completeOnboarding} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Ver Recomendaciones</button>
          </div>
        </div>
      ) : null}

      {onboardingDone && !showFull ? (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-zinc-400">Mostrando selección destacada basada en tu perfil.</p>
          <button onClick={() => setShowFull(true)} className="text-sm text-blue-400 hover:underline">Explorar universo completo (50+)</button>
        </div>
      ) : null}

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-medium tracking-tight text-zinc-100">50 empresas</h1>
        <div className="flex flex-wrap items-center gap-1">
          <Facet value={country} onChange={setCountry} options={countryOptions} placeholder="País" />
          <Facet value={kind} onChange={setKind} options={kindOptions} placeholder="Tipo" />
          <Facet value={sector} onChange={setSector} options={sectorOptions} placeholder="Sector" />
          <button
            type="button"
            onClick={() => setMesa(resetMesa())}
            className="px-2 py-1 text-[12px] text-zinc-500 transition-colors duration-150 hover:text-zinc-200"
          >
            Reset
          </button>
        </div>
      </header>

      <p className="mb-6 font-mono text-[11px] tabular-nums text-zinc-600">
        {cards.length}/{mesa.length}
        {stats ? ` · ${stats.count.toLocaleString("es-ES")}` : ""}
      </p>

      {error ? <p className="mb-6 font-mono text-sm text-rose-400">{error}</p> : null}

      <section>
        {grouped.map(([countryName, list]) => (
          <div key={countryName} className="mb-8">
            <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              {COUNTRY_FLAG[list[0]?.country ?? ""] ?? ""} {countryName}
              <span className="ml-2 font-mono tabular-nums">{list.length}</span>
            </p>
            
            {list.slice(0, (!showFull && onboardingDone) ? 4 : list.length).map((row) => {

              const quote = quoteById.get(row.id.toUpperCase());
              return (
                <CompanyCard
                  key={row.id}
                  id={row.id}
                  name={row.name}
                  href={assetHref(row.id)}
                  domain={row.domain ?? listingDomain(row.id)}
                  priceValue={quote?.price}
                  currency={quote?.currency}
                  changePercent={quote?.changePercent}
                  meta={row.sector}
                  onRemove={() => setMesa(removeFromMesa(row.id))}
                />
              );
            })}
          </div>
        ))}
      </section>

      <section className="mt-4">
        <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-zinc-600">Top 5</p>
        {!board ? <p className="text-[13px] text-zinc-600">…</p> : null}
        {(board?.top5 ?? []).map((row, i) => (
          <CompanyCard
            key={row.id}
            id={row.id}
            name={row.name}
            href={assetHref(row.id)}
            domain={listingDomain(row.id)}
            priceValue={row.price}
            currency={row.currency}
            changePercent={row.changePercent}
            rank={String(i + 1).padStart(2, "0")}
            meta={
              row.bestFit && row.bestFit in ARCHETYPE_COPY
                ? `${ARCHETYPE_COPY[row.bestFit as ArchetypeId].short} ${row.affinity}`
                : String(row.affinity)
            }
          />
        ))}
      </section>
    </div>
  );
}

function Facet({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className="bg-transparent px-1.5 py-1 text-[12px] text-zinc-400 outline-none transition-colors duration-150 hover:text-zinc-200"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
