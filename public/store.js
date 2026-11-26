const KEY = "invest-hub-v1";

export function emptyState() {
  return {
    version: 1,
    watchlist: [],
    zones: [],
    journal: {},
    streak: { last: "", count: 0 },
    checklist: { notes: "", levels: "" },
    alerts: [],
    simulator: { cash: 100000, positions: [], trades: [] },
  };
}

function cleanSymbol(s) {
  const v = String(s || "").trim().toUpperCase();
  return /^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/.test(v) ? v : "";
}

export function sanitize(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1) return null;
  const base = emptyState();
  if (Array.isArray(raw.watchlist)) {
    base.watchlist = raw.watchlist.slice(0, 30).map((w) => ({
      symbol: cleanSymbol(w && w.symbol),
      name: String((w && w.name) || "").slice(0, 80),
      type: String((w && w.type) || "other").slice(0, 20),
    })).filter((w) => w.symbol);
  }
  if (Array.isArray(raw.zones)) {
    base.zones = raw.zones.slice(0, 40).map((z) => ({
      symbol: cleanSymbol(z && z.symbol),
      buy: Number(z && z.buy) > 0 ? Number(z.buy) : null,
      trim: Number(z && z.trim) > 0 ? Number(z.trim) : null,
      notes: String((z && z.notes) || "").slice(0, 280),
    })).filter((z) => z.symbol);
  }
  if (raw.journal && typeof raw.journal === "object") {
    for (const [k, v] of Object.entries(raw.journal)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) base.journal[k] = String(v || "").slice(0, 2000);
    }
  }
  if (raw.streak && typeof raw.streak === "object") {
    base.streak = {
      last: /^\d{4}-\d{2}-\d{2}$/.test(raw.streak.last) ? raw.streak.last : "",
      count: Number.isFinite(+raw.streak.count) ? Math.max(0, Math.min(9999, +raw.streak.count | 0)) : 0,
    };
  }
  if (raw.checklist && typeof raw.checklist === "object") {
    base.checklist = {
      notes: String(raw.checklist.notes || "").slice(0, 4000),
      levels: String(raw.checklist.levels || "").slice(0, 2000),
    };
  }
  if (Array.isArray(raw.alerts)) {
    base.alerts = raw.alerts.slice(0, 40).map((a) => ({
      id: String((a && a.id) || Math.random().toString(36).slice(2, 10)),
      symbol: cleanSymbol(a && a.symbol),
      op: a && a.op === "<=" ? "<=" : ">=",
      price: Number(a && a.price) > 0 ? Number(a.price) : 0,
      note: String((a && a.note) || "").slice(0, 160),
    })).filter((a) => a.symbol && a.price > 0);
  }
  if (raw.simulator && typeof raw.simulator === "object") {
    const cash = Number(raw.simulator.cash);
    base.simulator.cash = Number.isFinite(cash) ? Math.max(0, Math.round(cash * 100) / 100) : 100000;
    if (Array.isArray(raw.simulator.positions)) {
      base.simulator.positions = raw.simulator.positions.slice(0, 40).map((p) => ({
        symbol: cleanSymbol(p && p.symbol),
        name: String((p && p.name) || "").slice(0, 80),
        type: ["stock", "etf", "fund", "commodity"].includes(p && p.type) ? p.type : "other",
        shares: Number(p && p.shares) > 0 ? Number(p.shares) : 0,
        avg: Number(p && p.avg) > 0 ? Number(p.avg) : 0,
      })).filter((p) => p.symbol && p.shares > 0 && p.avg > 0);
    }
    if (Array.isArray(raw.simulator.trades)) {
      base.simulator.trades = raw.simulator.trades.slice(-80).map((t) => ({
        t: String((t && t.t) || "").slice(0, 40),
        side: t && t.side === "sell" ? "sell" : "buy",
        symbol: cleanSymbol(t && t.symbol),
        shares: Number(t && t.shares) > 0 ? Number(t.shares) : 0,
        price: Number(t && t.price) > 0 ? Number(t.price) : 0,
        amount: Number(t && t.amount) > 0 ? Math.round(Number(t.amount) * 100) / 100 : 0,
      })).filter((t) => t.symbol && t.shares > 0 && t.price > 0);
    }
  }
  return base;
}

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return sanitize(raw) || emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportJson(state) {
  return JSON.stringify(state, null, 2);
}
