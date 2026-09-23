export type UniverseSleeve = "equity" | "crypto" | "bond" | "forex";

export interface UniverseListing {
  id: string;
  name: string;
  sleeve: UniverseSleeve;
  venue: string;
  domain?: string;
  sector?: string;
}

export const FEATURED_COMPANIES: UniverseListing[] = [
  { id: "ITX.MC", name: "Inditex", sleeve: "equity", venue: "BME", domain: "inditex.com", sector: "Consumo" },
  { id: "SAN.MC", name: "Banco Santander", sleeve: "equity", venue: "BME", domain: "santander.com", sector: "Financiero" },
  { id: "BBVA.MC", name: "BBVA", sleeve: "equity", venue: "BME", domain: "bbva.com", sector: "Financiero" },
  { id: "IBE.MC", name: "Iberdrola", sleeve: "equity", venue: "BME", domain: "iberdrola.com", sector: "Utilities" },
  { id: "TEF.MC", name: "Telefónica", sleeve: "equity", venue: "BME", domain: "telefonica.com", sector: "Comunicación" },
  { id: "REP.MC", name: "Repsol", sleeve: "equity", venue: "BME", domain: "repsol.com", sector: "Energía" },
  { id: "FER.MC", name: "Ferrovial", sleeve: "equity", venue: "BME", domain: "ferrovial.com", sector: "Industrial" },
  { id: "AMS.MC", name: "Amadeus", sleeve: "equity", venue: "BME", domain: "amadeus.com", sector: "Tecnología" },
  { id: "AENA.MC", name: "Aena", sleeve: "equity", venue: "BME", domain: "aena.es", sector: "Industrial" },
  { id: "CABK.MC", name: "CaixaBank", sleeve: "equity", venue: "BME", domain: "caixabank.com", sector: "Financiero" },
  { id: "IDR.MC", name: "Indra Sistemas", sleeve: "equity", venue: "BME", domain: "indracompany.com", sector: "Tecnología" },
  { id: "GRF.MC", name: "Grifols", sleeve: "equity", venue: "BME", domain: "grifols.com", sector: "Salud" },
  { id: "ASML.AS", name: "ASML", sleeve: "equity", venue: "AMS", domain: "asml.com", sector: "Tecnología" },
  { id: "MC.PA", name: "LVMH", sleeve: "equity", venue: "EPA", domain: "lvmh.com", sector: "Consumo" },
  { id: "OR.PA", name: "L'Oréal", sleeve: "equity", venue: "EPA", domain: "loreal.com", sector: "Consumo" },
  { id: "SAP.DE", name: "SAP", sleeve: "equity", venue: "XETRA", domain: "sap.com", sector: "Tecnología" },
  { id: "SIE.DE", name: "Siemens", sleeve: "equity", venue: "XETRA", domain: "siemens.com", sector: "Industrial" },
  { id: "RHM.DE", name: "Rheinmetall", sleeve: "equity", venue: "XETRA", domain: "rheinmetall.com", sector: "Industrial" },
  { id: "AIR.PA", name: "Airbus", sleeve: "equity", venue: "EPA", domain: "airbus.com", sector: "Industrial" },
  { id: "NESN.SW", name: "Nestlé", sleeve: "equity", venue: "SIX", domain: "nestle.com", sector: "Consumo" },
  { id: "NOVN.SW", name: "Novartis", sleeve: "equity", venue: "SIX", domain: "novartis.com", sector: "Salud" },
  { id: "RR.L", name: "Rolls-Royce", sleeve: "equity", venue: "LSE", domain: "rolls-royce.com", sector: "Industrial" },
  { id: "SHEL.L", name: "Shell", sleeve: "equity", venue: "LSE", domain: "shell.com", sector: "Energía" },
  { id: "AZN.L", name: "AstraZeneca", sleeve: "equity", venue: "LSE", domain: "astrazeneca.com", sector: "Salud" },
  { id: "BMW.DE", name: "BMW", sleeve: "equity", venue: "XETRA", domain: "bmw.com", sector: "Consumo" },
  { id: "AI.PA", name: "Air Liquide", sleeve: "equity", venue: "EPA", domain: "airliquide.com", sector: "Materiales" },
  { id: "SU.PA", name: "Schneider Electric", sleeve: "equity", venue: "EPA", domain: "se.com", sector: "Industrial" },
  { id: "MSFT", name: "Microsoft", sleeve: "equity", venue: "NASDAQ", domain: "microsoft.com", sector: "Tecnología" },
  { id: "AAPL", name: "Apple", sleeve: "equity", venue: "NASDAQ", domain: "apple.com", sector: "Tecnología" },
  { id: "NVDA", name: "NVIDIA", sleeve: "equity", venue: "NASDAQ", domain: "nvidia.com", sector: "Tecnología" },
  { id: "GOOGL", name: "Alphabet", sleeve: "equity", venue: "NASDAQ", domain: "google.com", sector: "Comunicación" },
  { id: "AMZN", name: "Amazon", sleeve: "equity", venue: "NASDAQ", domain: "amazon.com", sector: "Consumo" },
  { id: "META", name: "Meta", sleeve: "equity", venue: "NASDAQ", domain: "meta.com", sector: "Comunicación" },
  { id: "BRK.B", name: "Berkshire Hathaway B", sleeve: "equity", venue: "NYSE", domain: "berkshirehathaway.com", sector: "Financiero" },
  { id: "JPM", name: "JPMorgan Chase", sleeve: "equity", venue: "NYSE", domain: "jpmorganchase.com", sector: "Financiero" },
  { id: "V", name: "Visa", sleeve: "equity", venue: "NYSE", domain: "visa.com", sector: "Financiero" },
  { id: "UNH", name: "UnitedHealth", sleeve: "equity", venue: "NYSE", domain: "unitedhealthgroup.com", sector: "Salud" },
  { id: "LLY", name: "Eli Lilly", sleeve: "equity", venue: "NYSE", domain: "lilly.com", sector: "Salud" },
  { id: "TSLA", name: "Tesla", sleeve: "equity", venue: "NASDAQ", domain: "tesla.com", sector: "Consumo" },
  { id: "AVGO", name: "Broadcom", sleeve: "equity", venue: "NASDAQ", domain: "broadcom.com", sector: "Tecnología" },
  { id: "JNJ", name: "Johnson & Johnson", sleeve: "equity", venue: "NYSE", domain: "jnj.com", sector: "Salud" },
  { id: "WMT", name: "Walmart", sleeve: "equity", venue: "NYSE", domain: "walmart.com", sector: "Consumo" },
  { id: "MA", name: "Mastercard", sleeve: "equity", venue: "NYSE", domain: "mastercard.com", sector: "Financiero" },
  { id: "XOM", name: "Exxon Mobil", sleeve: "equity", venue: "NYSE", domain: "exxonmobil.com", sector: "Energía" },
  { id: "COST", name: "Costco", sleeve: "equity", venue: "NASDAQ", domain: "costco.com", sector: "Consumo" },
  { id: "KO", name: "Coca-Cola", sleeve: "equity", venue: "NYSE", domain: "coca-cola.com", sector: "Consumo" },
  { id: "PG", name: "Procter & Gamble", sleeve: "equity", venue: "NYSE", domain: "pg.com", sector: "Consumo" },
  { id: "2330.TW", name: "TSMC", sleeve: "equity", venue: "TWSE", domain: "tsmc.com", sector: "Tecnología" },
  { id: "7203.T", name: "Toyota Motor", sleeve: "equity", venue: "TSE", domain: "toyota.com", sector: "Consumo" },
  { id: "9988.HK", name: "Alibaba", sleeve: "equity", venue: "HKEX", domain: "alibaba.com", sector: "Consumo" },
];

export const UNIVERSE: UniverseListing[] = [
  { id: "MSFT", name: "Microsoft", sleeve: "equity", venue: "NASDAQ", domain: "microsoft.com", sector: "Tecnología" },
  { id: "NVDA", name: "NVIDIA", sleeve: "equity", venue: "NASDAQ", domain: "nvidia.com", sector: "Tecnología" },
  { id: "BRK.B", name: "Berkshire Hathaway B", sleeve: "equity", venue: "NYSE", domain: "berkshirehathaway.com", sector: "Financiero" },
  { id: "IDR.MC", name: "Indra Sistemas", sleeve: "equity", venue: "BME", domain: "indracompany.com", sector: "Tecnología" },
  { id: "RHM.DE", name: "Rheinmetall", sleeve: "equity", venue: "XETRA", domain: "rheinmetall.com", sector: "Industrial" },
  { id: "RR.L", name: "Rolls-Royce", sleeve: "equity", venue: "LSE", domain: "rolls-royce.com", sector: "Industrial" },
  { id: "7203.T", name: "Toyota Motor", sleeve: "equity", venue: "TSE", domain: "toyota.com", sector: "Consumo" },
  { id: "9988.HK", name: "Alibaba", sleeve: "equity", venue: "HKEX", domain: "alibaba.com", sector: "Consumo" },
  { id: "2330.TW", name: "TSMC", sleeve: "equity", venue: "TWSE", domain: "tsmc.com", sector: "Tecnología" },
  { id: "PPFB.DE", name: "WisdomTree Physical Gold", sleeve: "equity", venue: "XETRA", domain: "wisdomtree.eu", sector: "Metales" },
  { id: "BTC", name: "Bitcoin", sleeve: "crypto", venue: "CC" },
  { id: "ETH", name: "Ethereum", sleeve: "crypto", venue: "CC" },
  { id: "SOL", name: "Solana", sleeve: "crypto", venue: "CC" },
  { id: "US10Y", name: "US Treasury 10Y", sleeve: "bond", venue: "GBOND" },
  { id: "US02Y", name: "US Treasury 2Y", sleeve: "bond", venue: "GBOND" },
  { id: "BUND10Y", name: "German Bund 10Y", sleeve: "bond", venue: "GBOND" },
  { id: "BONO10Y", name: "Spanish Bono 10Y", sleeve: "bond", venue: "GBOND" },
  { id: "EUR/USD", name: "Euro / US Dollar", sleeve: "forex", venue: "FX" },
  { id: "USD/JPY", name: "US Dollar / Yen", sleeve: "forex", venue: "FX" },
  { id: "XAU/USD", name: "Gold / US Dollar", sleeve: "forex", venue: "FX" },
];

export const QUICK_CHIPS = FEATURED_COMPANIES;

export const DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  [...FEATURED_COMPANIES, ...UNIVERSE].map((a) => [a.id, a.name]),
);

export const LISTING_BY_ID: Record<string, UniverseListing> = Object.fromEntries(
  [...FEATURED_COMPANIES, ...UNIVERSE].map((row) => [row.id, row]),
);

export function listingDomain(identifier: string): string | undefined {
  return LISTING_BY_ID[identifier]?.domain ?? LISTING_BY_ID[identifier.toUpperCase()]?.domain;
}

export function logoUrl(domain?: string | null, ticker?: string): string | null {
  if (domain) return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
  if (ticker && /^[A-Z]{1,5}$/i.test(ticker)) {
    return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker.toUpperCase())}.png`;
  }
  return null;
}

export function displayName(canonical: string, local: string, identifier: string): string {
  return DISPLAY_NAMES[canonical] ?? DISPLAY_NAMES[local] ?? DISPLAY_NAMES[identifier] ?? canonical;
}

export function assetHref(identifier: string): string {
  return `/asset/?id=${encodeURIComponent(identifier)}`;
}

export const SLEEVE_LABEL: Record<UniverseSleeve, string> = {
  equity: "Equity",
  crypto: "Crypto",
  bond: "Bonos",
  forex: "FX / metal",
};

export const KIND_LABEL: Record<string, string> = {
  stock: "Acción",
  etf: "ETF",
  adr: "ADR",
  crypto: "Cripto",
  bond: "Bono",
  fx: "FX",
  metal: "Metal",
};
export function getTradingViewSymbol(id: string): string {
  const upper = id.toUpperCase();
  if (upper.endsWith('.MC')) return 'BME:' + upper.replace('.MC', '');
  if (upper.endsWith('.DE')) return 'XETR:' + upper.replace('.DE', '');
  if (upper.endsWith('.PA')) return 'EURONEXT:' + upper.replace('.PA', '');
  if (upper.endsWith('.AS')) return 'EURONEXT:' + upper.replace('.AS', '');
  if (upper.endsWith('.L')) return 'LSE:' + upper.replace('.L', '');
  if (upper.endsWith('.MI')) return 'MIL:' + upper.replace('.MI', '');
  // Default to US or raw ticker
  return upper.includes('.') ? upper : upper; // TradingView usually figures out US tickers without prefix, or use NASDAQ:/NYSE: if known
}
