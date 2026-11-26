// Asset classes the hub will trade in the virtual book. Futures, CFDs and leveraged products are refused.

export const CLASS_LABEL = {
  stock: "Acción",
  etf: "ETF",
  fund: "Fondo / Índice",
  commodity: "Materias Primas",
  crypto: "Cripto",
  blocked: "No disponible",
  other: "Otro",
};

// Unlevered physical trackers. The free Yahoo feed exposes gold and silver as futures
// (GC=F, SI=F); those stay blocked. The spot class uses the 1x physical ETC/ETF.
export const SPOT_COMMODITY = new Set([
  "GLD", "IAU", "SGOL", "SLV", "SIVR", "PPLT", "PALL", "PHAU.L", "PHAG.L", "SGLD.L", "4GLD.DE", "8PSB.DE",
]);

export const SPOT_PROXY = {
  "GC=F": "GLD",
  "SI=F": "SLV",
  "PL=F": "PPLT",
  "PA=F": "PALL",
};

const LEVERAGED = /2x|3x|ultra|leveraged|inverse/i;

export function classifyAsset(symbol, quoteType, name) {
  const sym = String(symbol || "").toUpperCase();
  const type = String(quoteType || "").toUpperCase();
  const label = String(name || "");
  if (LEVERAGED.test(sym) || LEVERAGED.test(label)) {
    return { type: "blocked", label: CLASS_LABEL.blocked, reason: "Producto apalancado o inverso: no se ofrece." };
  }
  if (type === "FUTURE" || type === "OPTION" || /=F$/.test(sym)) {
    const proxy = SPOT_PROXY[sym] || null;
    return { type: "blocked", label: CLASS_LABEL.blocked, reason: "Futuros, CFDs y derivados no están disponibles. Solo contado.", proxy };
  }
  if (SPOT_COMMODITY.has(sym) || type === "COMMODITY") {
    return { type: "commodity", label: CLASS_LABEL.commodity, reason: "" };
  }
  if (type === "ETF") return { type: "etf", label: CLASS_LABEL.etf, reason: "" };
  if (type === "INDEX" || type === "MUTUALFUND") return { type: "fund", label: CLASS_LABEL.fund, reason: "" };
  if (type === "EQUITY") return { type: "stock", label: CLASS_LABEL.stock, reason: "" };
  if (type === "CRYPTOCURRENCY") return { type: "crypto", label: CLASS_LABEL.crypto, reason: "" };
  return { type: "other", label: CLASS_LABEL.other, reason: "" };
}

export function simulatorAllowed(asset) {
  return !!asset && (asset.type === "stock" || asset.type === "etf" || asset.type === "fund" || asset.type === "commodity");
}

export const SIM_CLASSES = ["stock", "etf", "fund", "commodity"];
