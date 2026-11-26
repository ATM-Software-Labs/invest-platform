// Company marks already stored by markets-digest and served at
// https://charts.trujillomingorance.com/logo/<slug>.png
// Slug is the same function as markets-digest src/util.js slug(display name).
const NAMES = {
  AAPL: "Apple", MSFT: "Microsoft", NVDA: "Nvidia", AMZN: "Amazon",
  GOOGL: "Alphabet", GOOG: "Alphabet", META: "Meta", AVGO: "Broadcom", TSLA: "Tesla",
  ORCL: "Oracle", CRM: "Salesforce", ADBE: "Adobe", NFLX: "Netflix",
  TSM: "TSMC", ASML: "ASML", AMD: "AMD", MU: "Micron", INTC: "Intel",
  QCOM: "Qualcomm", ARM: "Arm", JPM: "JPMorgan", BAC: "Bank of America",
  WFC: "Wells Fargo", GS: "Goldman Sachs", MS: "Morgan Stanley", C: "Citi",
  V: "Visa", MA: "Mastercard", "BRK.B": "Berkshire Hathaway",
  LLY: "Eli Lilly", UNH: "UnitedHealth", JNJ: "Johnson & Johnson", NVO: "Novo Nordisk",
  ABBV: "AbbVie", MRK: "Merck", WMT: "Walmart", COST: "Costco", PG: "Procter & Gamble",
  KO: "Coca-Cola", PEP: "PepsiCo", NKE: "Nike", MCD: "McDonald's",
  HD: "Home Depot", XOM: "Exxon Mobil", CVX: "Chevron", ACN: "Accenture",
  FDX: "FedEx", STZ: "Constellation Brands", LVMUY: "LVMH", SAP: "SAP",
  IDEXY: "Inditex", ITX: "Inditex", "ITX.MC": "Inditex",
  SAN: "Santander", "SAN.MC": "Santander",
  BBVA: "BBVA", "BBVA.MC": "BBVA",
  IBDRY: "Iberdrola", "IBE.MC": "Iberdrola",
  TEF: "Telefónica", "TEF.MC": "Telefónica",
  REPYY: "Repsol", "REP.MC": "Repsol",
  SIEGY: "Siemens", EADSY: "Airbus", NSRGY: "Nestlé", RHHBY: "Roche", NVS: "Novartis",
  SHEL: "Shell", BP: "BP", TTE: "TotalEnergies", SSNLF: "Samsung", SONY: "Sony",
  TM: "Toyota", BABA: "Alibaba", TCEHY: "Tencent", PLTR: "Palantir", IBM: "IBM",
  CSCO: "Cisco", DIS: "Disney", UBER: "Uber", BA: "Boeing", CAT: "Caterpillar",
  PFE: "Pfizer", AZN: "AstraZeneca", BLK: "BlackRock", SPOT: "Spotify", SHOP: "Shopify",
  SBUX: "Starbucks", BKNG: "Booking Holdings", NOW: "ServiceNow", DAL: "Delta Air Lines", UPS: "UPS",
};

export function logoSlug(symbol) {
  const name = NAMES[String(symbol || "").toUpperCase()];
  if (!name) return "";
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function logoUrl(symbol) {
  const slug = logoSlug(symbol);
  return slug ? "/logo/" + slug + ".png" : "";
}
