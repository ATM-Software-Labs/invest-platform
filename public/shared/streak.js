export function madridToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);
}

export function shiftIso(iso, days) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function markReviewed(streak, today) {
  const prev = streak && streak.last ? streak.last : "";
  const count0 = streak && streak.count > 0 ? streak.count : 0;
  if (prev === today) return { last: today, count: count0 || 1 };
  const count = prev === shiftIso(today, -1) ? count0 + 1 : 1;
  return { last: today, count };
}
