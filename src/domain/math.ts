export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function abs(value: number | null): number | null {
  return value === null ? null : Math.abs(value);
}

export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  const r = numerator / denominator;
  return Number.isFinite(r) ? r : null;
}

export function mean(values: Array<number | null>): number | null {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function changeRate(current: number | null, past: number | null): number | null {
  if (current === null || past === null || past === 0) return null;
  return current / past - 1;
}

export function round(value: number | null, digits = 6): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function roundMetrics<T>(value: T, digits = 6): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return round(value, digits) as T;
  if (Array.isArray(value)) return value.map((v) => roundMetrics(v, digits)) as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = roundMetrics(v, digits);
    }
    return out as T;
  }
  return value;
}

export function pickByPeriod<T extends { period: string }>(
  rows: T[],
  period: string,
): T | undefined {
  return rows.find((r) => r.period === period);
}

export function sortDesc<T extends { period: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.period.localeCompare(a.period));
}

export function yearOf(period: string): number | null {
  const y = Number(period.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}
