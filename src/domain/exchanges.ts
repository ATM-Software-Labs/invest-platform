export interface ExchangeMeta {
  code: string;
  name: string;
  country: string;
  currency: string;
  mic?: string;
  quoteScale?: number;
  quoteCurrencyNormalized?: string;
}

export const EXCHANGES: Record<string, ExchangeMeta> = {
  US: { code: "US", name: "NYSE/NASDAQ", country: "US", currency: "USD", mic: "XNYS" },
  NYSE: { code: "US", name: "NYSE", country: "US", currency: "USD", mic: "XNYS" },
  NASDAQ: { code: "US", name: "NASDAQ", country: "US", currency: "USD", mic: "XNAS" },
  AMEX: { code: "US", name: "NYSE American", country: "US", currency: "USD", mic: "XASE" },
  MC: { code: "MC", name: "BME Spanish Exchanges", country: "ES", currency: "EUR", mic: "XMAD" },
  DE: { code: "DE", name: "XETRA", country: "DE", currency: "EUR", mic: "XETR" },
  F: { code: "F", name: "Frankfurt", country: "DE", currency: "EUR", mic: "XFRA" },
  L: {
    code: "L",
    name: "London Stock Exchange",
    country: "GB",
    currency: "GBX",
    mic: "XLON",
    quoteScale: 100,
    quoteCurrencyNormalized: "GBP",
  },
  LSE: {
    code: "L",
    name: "London Stock Exchange",
    country: "GB",
    currency: "GBX",
    mic: "XLON",
    quoteScale: 100,
    quoteCurrencyNormalized: "GBP",
  },
  T: { code: "T", name: "Tokyo Stock Exchange", country: "JP", currency: "JPY", mic: "XTKS" },
  TOKYO: { code: "T", name: "Tokyo Stock Exchange", country: "JP", currency: "JPY", mic: "XTKS" },
  HK: { code: "HK", name: "Hong Kong Exchange", country: "HK", currency: "HKD", mic: "XHKG" },
  TW: { code: "TW", name: "Taiwan Stock Exchange", country: "TW", currency: "TWD", mic: "XTAI" },
  TWO: { code: "TWO", name: "Taipei Exchange", country: "TW", currency: "TWD", mic: "ROCO" },
  PA: { code: "PA", name: "Euronext Paris", country: "FR", currency: "EUR", mic: "XPAR" },
  AS: { code: "AS", name: "Euronext Amsterdam", country: "NL", currency: "EUR", mic: "XAMS" },
  BR: { code: "BR", name: "Euronext Brussels", country: "BE", currency: "EUR", mic: "XBRU" },
  MI: { code: "MI", name: "Borsa Italiana", country: "IT", currency: "EUR", mic: "XMIL" },
  SW: { code: "SW", name: "SIX Swiss Exchange", country: "CH", currency: "CHF", mic: "XSWX" },
  TO: { code: "TO", name: "Toronto Stock Exchange", country: "CA", currency: "CAD", mic: "XTSE" },
  AX: { code: "AX", name: "ASX", country: "AU", currency: "AUD", mic: "XASX" },
  KS: { code: "KS", name: "Korea Exchange", country: "KR", currency: "KRW", mic: "XKRX" },
  KO: { code: "KO", name: "KOSDAQ", country: "KR", currency: "KRW", mic: "XKOS" },
  SS: { code: "SS", name: "Shanghai", country: "CN", currency: "CNY", mic: "XSHG" },
  SZ: { code: "SZ", name: "Shenzhen", country: "CN", currency: "CNY", mic: "XSHE" },
  SA: { code: "SA", name: "B3 Brazil", country: "BR", currency: "BRL", mic: "BVMF" },
  MX: { code: "MX", name: "Bolsa Mexicana", country: "MX", currency: "MXN", mic: "XMEX" },
  ST: { code: "ST", name: "Nasdaq Stockholm", country: "SE", currency: "SEK", mic: "XSTO" },
  OL: { code: "OL", name: "Oslo Børs", country: "NO", currency: "NOK", mic: "XOSL" },
  CO: { code: "CO", name: "Nasdaq Copenhagen", country: "DK", currency: "DKK", mic: "XCSE" },
  HE: { code: "HE", name: "Nasdaq Helsinki", country: "FI", currency: "EUR", mic: "XHEL" },
  LS: { code: "LS", name: "Euronext Lisbon", country: "PT", currency: "EUR", mic: "XLIS" },
  VI: { code: "VI", name: "Wiener Börse", country: "AT", currency: "EUR", mic: "XWBO" },
  WA: { code: "WA", name: "Warsaw", country: "PL", currency: "PLN", mic: "XWAR" },
  AT: { code: "AT", name: "Athens", country: "GR", currency: "EUR", mic: "XATH" },
  IR: { code: "IR", name: "Euronext Dublin", country: "IE", currency: "EUR", mic: "XDUB" },
  IC: { code: "IC", name: "Nasdaq Iceland", country: "IS", currency: "ISK", mic: "XICE" },
  TA: { code: "TA", name: "Tel Aviv", country: "IL", currency: "ILS", mic: "XTAE" },
  JO: { code: "JO", name: "Johannesburg", country: "ZA", currency: "ZAR", mic: "XJSE" },
  SI: { code: "SI", name: "Singapore", country: "SG", currency: "SGD", mic: "XSES" },
  BK: { code: "BK", name: "Thailand", country: "TH", currency: "THB", mic: "XBKK" },
  JK: { code: "JK", name: "Indonesia", country: "ID", currency: "IDR", mic: "XIDX" },
  KL: { code: "KL", name: "Bursa Malaysia", country: "MY", currency: "MYR", mic: "XKLS" },
  NS: { code: "NS", name: "NSE India", country: "IN", currency: "INR", mic: "XNSE" },
  BO: { code: "BO", name: "BSE India", country: "IN", currency: "INR", mic: "XBOM" },
  NZ: { code: "NZ", name: "NZX", country: "NZ", currency: "NZD", mic: "XNZE" },
};

export const US_SUFFIXES = new Set(["US", "NYSE", "NASDAQ", "AMEX", "NMS", "NYQ"]);

/**
 * Cross-listed ADRs used when an Asian/European local ticker is requested.
 * Mapping is local canonical -> USD ADR ticker.
 */
export const ADR_MAP: Record<string, { adr: string; name: string }> = {
  "7203.T": { adr: "TM.US", name: "Toyota Motor" },
  "9988.HK": { adr: "BABA.US", name: "Alibaba" },
  "2330.TW": { adr: "TSM.US", name: "TSMC" },
  "6758.T": { adr: "SONY.US", name: "Sony" },
  "6861.T": { adr: "KNYJY.US", name: "Keyence" },
  "0700.HK": { adr: "TCEHY.US", name: "Tencent" },
  "3690.HK": { adr: "MPNGY.US", name: "Meituan" },
  "005930.KS": { adr: "SSNLF.US", name: "Samsung Electronics" },
  "NESN.SW": { adr: "NSRGY.US", name: "Nestlé" },
  "SAP.DE": { adr: "SAP.US", name: "SAP" },
  "ASML.AS": { adr: "ASML.US", name: "ASML" },
  "MC.PA": { adr: "LVMUY.US", name: "LVMH" },
  "OR.PA": { adr: "LRLCY.US", name: "L'Oréal" },
  "SHEL.L": { adr: "SHEL.US", name: "Shell" },
  "AZN.L": { adr: "AZN.US", name: "AstraZeneca" },
  "BP.L": { adr: "BP.US", name: "BP" },
  "NVO.CO": { adr: "NVO.US", name: "Novo Nordisk" },
};

export const ADR_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(ADR_MAP).map(([local, v]) => [v.adr, local]),
);

export const PHYSICAL_GOLD_ETPS = new Set([
  "PPFB.DE",
  "PPFB.F",
  "SGLD.L",
  "IGLN.L",
  "PHAU.L",
  "GLD.US",
  "IAU.US",
  "SGOL.US",
  "4GLD.DE",
  "XETR:PPFB",
]);
