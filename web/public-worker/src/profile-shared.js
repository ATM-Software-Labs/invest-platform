var PROFILE_KEY = "invest.profile.v1";
var SECTORS = [
  { id: "tech", es: "Tecnolog\u00eda", en: "Technology" },
  { id: "health", es: "Salud", en: "Health" },
  { id: "consumption", es: "Consumo / retail", en: "Consumption / retail" },
  { id: "finance", es: "Finanzas", en: "Finance" },
  { id: "energy", es: "Energ\u00eda", en: "Energy" },
  { id: "industrials", es: "Industriales", en: "Industrials" },
  { id: "telecom", es: "Telecom", en: "Telecom" },
  { id: "materials", es: "Materiales", en: "Materials" },
  { id: "utilities", es: "Utilities", en: "Utilities" },
  { id: "realestate", es: "Inmobiliario", en: "Real estate" }
];
var AGE_BANDS = [
  { id: "u25", es: "Menos de 25", en: "Under 25" },
  { id: "25-34", es: "25\u201334", en: "25\u201334" },
  { id: "35-44", es: "35\u201344", en: "35\u201344" },
  { id: "45-54", es: "45\u201354", en: "45\u201354" },
  { id: "55-64", es: "55\u201364", en: "55\u201364" },
  { id: "65p", es: "65 o m\u00e1s", en: "65+" }
];
/* Curated examples only — not advice. Transparent label required in UI. */
var SECTOR_EXAMPLES = {
  tech: [
    { s: "AAPL", name: "Apple" },
    { s: "MSFT", name: "Microsoft" },
    { s: "GOOGL", name: "Alphabet" },
    { s: "NVDA", name: "NVIDIA" },
    { s: "IDR.MC", name: "Indra" }
  ],
  health: [
    { s: "JNJ", name: "Johnson & Johnson" },
    { s: "UNH", name: "UnitedHealth" },
    { s: "LLY", name: "Eli Lilly" },
    { s: "PFE", name: "Pfizer" }
  ],
  consumption: [
    { s: "AMZN", name: "Amazon" },
    { s: "MCD", name: "McDonald's" },
    { s: "KO", name: "Coca-Cola" },
    { s: "ITX.MC", name: "Inditex" },
    { s: "NKE", name: "Nike" }
  ],
  finance: [
    { s: "JPM", name: "JPMorgan" },
    { s: "V", name: "Visa" },
    { s: "SAN.MC", name: "Santander" },
    { s: "BBVA.MC", name: "BBVA" }
  ],
  energy: [
    { s: "XOM", name: "Exxon Mobil" },
    { s: "CVX", name: "Chevron" },
    { s: "REP.MC", name: "Repsol" }
  ],
  industrials: [
    { s: "CAT", name: "Caterpillar" },
    { s: "GE", name: "GE Aerospace" },
    { s: "AIR.PA", name: "Airbus" }
  ],
  telecom: [
    { s: "T", name: "AT&T" },
    { s: "VZ", name: "Verizon" },
    { s: "TEF.MC", name: "Telef\u00f3nica" }
  ],
  materials: [
    { s: "LIN", name: "Linde" },
    { s: "BHP", name: "BHP" },
    { s: "ACX.MC", name: "Acerinox" }
  ],
  utilities: [
    { s: "NEE", name: "NextEra Energy" },
    { s: "IBE.MC", name: "Iberdrola" },
    { s: "DUK", name: "Duke Energy" }
  ],
  realestate: [
    { s: "AMT", name: "American Tower" },
    { s: "PLD", name: "Prologis" },
    { s: "COL.MC", name: "Inmobiliaria Colonial" }
  ]
};
var TICKER_SECTOR = (function () {
  var map = {};
  Object.keys(SECTOR_EXAMPLES).forEach(function (sec) {
    SECTOR_EXAMPLES[sec].forEach(function (row) {
      map[String(row.s).toUpperCase()] = sec;
    });
  });
  return map;
})();

function loadProfile() {
  try {
    var raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ageBand: "", age: null, country: "", sectors: [] };
    var p = JSON.parse(raw);
    if (!p || typeof p !== "object") return { ageBand: "", age: null, country: "", sectors: [] };
    var sectors = Array.isArray(p.sectors) ? p.sectors.filter(function (s) {
      return SECTORS.some(function (x) { return x.id === s; });
    }) : [];
    var ageBand = typeof p.ageBand === "string" ? p.ageBand : "";
    if (ageBand && !AGE_BANDS.some(function (b) { return b.id === ageBand; })) ageBand = "";
    var age = typeof p.age === "number" && isFinite(p.age) && p.age > 0 && p.age < 120 ? Math.round(p.age) : null;
    var country = typeof p.country === "string" ? p.country.trim().slice(0, 80) : "";
    return { ageBand: ageBand, age: age, country: country, sectors: sectors };
  } catch (err) {
    return { ageBand: "", age: null, country: "", sectors: [] };
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      ageBand: p.ageBand || "",
      age: p.age == null ? null : p.age,
      country: p.country || "",
      sectors: Array.isArray(p.sectors) ? p.sectors : [],
      updatedAt: Date.now()
    }));
  } catch (err) {}
}
function profileFilled(p) {
  return !!(p && ((p.sectors && p.sectors.length) || p.country || p.ageBand || p.age));
}
function sectorLabel(id, lang) {
  for (var i = 0; i < SECTORS.length; i++) if (SECTORS[i].id === id) return lang === "en" ? SECTORS[i].en : SECTORS[i].es;
  return id;
}
function tickerSector(sym) {
  if (!sym) return null;
  return TICKER_SECTOR[String(sym).toUpperCase()] || null;
}
function matchProfile(quote, profile) {
  var out = { aligned: false, sector: null, reason: "none", inMap: false };
  if (!quote || !profile || !profile.sectors || !profile.sectors.length) return out;
  var sec = tickerSector(quote.symbol);
  if (!sec) {
    out.reason = "unknown_map";
    return out;
  }
  out.sector = sec;
  out.inMap = true;
  if (profile.sectors.indexOf(sec) !== -1) {
    out.aligned = true;
    out.reason = "sector_overlap";
  } else {
    out.reason = "sector_other";
  }
  return out;
}
