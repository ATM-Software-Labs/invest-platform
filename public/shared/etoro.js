// Single place to edit the eToro Partners link.
// Replace the placeholder with the tracking URL from the partner dashboard.
// Tokens: {symbol} is the Yahoo/hub symbol, already URL-encoded by etoroHref().
// Example: "https://med.etoro.com/BXXXX_AXXXX?instrument={symbol}"
export const ETORO_AFFILIATE_URL = "https://www.etoro.com/markets/{symbol}";

export const AFFILIATE_DISCLOSURE =
  "Divulgación de afiliado: Algunos enlaces dirigen a eToro. Si te registras a través de ellos, puedo recibir una comisión sin coste adicional para ti.";

export const RISK_WARNING =
  "Las inversiones conllevan riesgos, incluida la posible pérdida del capital invertido. El rendimiento pasado y los resultados simulados no son indicativos de resultados futuros. Contenido meramente informativo y educativo; no constituye asesoramiento financiero ni recomendación de inversión.";

// Empty on purpose. Paste the official eToro Partners risk-warning widget into #etoro-partners-widget.
export const ETORO_WIDGET_SLOT_ID = "etoro-partners-widget";

export function etoroHref(symbol) {
  const clean = String(symbol || "").replace(/[^\w.\-^=]/g, "");
  return ETORO_AFFILIATE_URL.replaceAll("{symbol}", encodeURIComponent(clean));
}
