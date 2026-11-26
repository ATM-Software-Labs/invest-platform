export const SIM_START_EUR = 100000;

export function portfolioWeights(cash, positions, prices) {
  const buckets = { stock: 0, etf: 0, fund: 0, commodity: 0, other: 0 };
  let invested = 0;
  for (const p of positions || []) {
    const live = prices && prices[p.symbol] > 0 ? prices[p.symbol] : p.avg;
    const mv = (live > 0 ? live : 0) * (p.shares > 0 ? p.shares : 0);
    invested += mv;
    const key = Object.prototype.hasOwnProperty.call(buckets, p.type) ? p.type : "other";
    buckets[key] += mv;
  }
  const equity = (cash > 0 ? cash : 0) + invested;
  const pct = (v) => (equity > 0 ? (v / equity) * 100 : 0);
  return {
    equity,
    invested,
    cash: cash > 0 ? cash : 0,
    cashPct: pct(cash > 0 ? cash : 0),
    classes: ["stock", "etf", "fund", "commodity", "other"]
      .filter((k) => buckets[k] > 0)
      .map((k) => ({ type: k, value: buckets[k], pct: pct(buckets[k]) })),
  };
}

export function applyBuy(sim, meta, euros) {
  const amount = Math.round(Number(euros) * 100) / 100;
  if (!(amount > 0)) return { ok: false, error: "importe" };
  if (!(meta && meta.price > 0)) return { ok: false, error: "precio" };
  if (amount > sim.cash + 1e-6) return { ok: false, error: "efectivo" };
  const shares = amount / meta.price;
  const positions = (sim.positions || []).map((p) => ({ ...p }));
  const i = positions.findIndex((p) => p.symbol === meta.symbol);
  if (i < 0) {
    positions.push({ symbol: meta.symbol, name: meta.name || meta.symbol, type: meta.type, shares, avg: meta.price });
  } else {
    const p = positions[i];
    const next = p.shares + shares;
    p.avg = (p.avg * p.shares + amount) / next;
    p.shares = next;
  }
  return { ok: true, simulator: { cash: Math.round((sim.cash - amount) * 100) / 100, positions } };
}

export function applySell(sim, symbol, shares, price) {
  const qty = Number(shares);
  if (!(qty > 0) || !(price > 0)) return { ok: false, error: "importe" };
  const positions = (sim.positions || []).map((p) => ({ ...p }));
  const i = positions.findIndex((p) => p.symbol === symbol);
  if (i < 0 || positions[i].shares + 1e-9 < qty) return { ok: false, error: "posicion" };
  const proceeds = Math.round(qty * price * 100) / 100;
  positions[i].shares -= qty;
  if (positions[i].shares <= 1e-8) positions.splice(i, 1);
  return { ok: true, simulator: { cash: Math.round((sim.cash + proceeds) * 100) / 100, positions } };
}
