import type { ArchetypeId } from "./types";

export type Compatibility = "Alta" | "Neutral" | "Rechazo";

export function compatibility(affinity: number): Compatibility {
  if (affinity >= 70) return "Alta";
  if (affinity >= 40) return "Neutral";
  return "Rechazo";
}

export const ARCHETYPE_ORDER: ArchetypeId[] = [
  "buffett",
  "graham",
  "lynch",
  "greenblatt",
  "burry",
  "dalio",
  "soros",
  "hard_money",
];

export const ARCHETYPE_COPY: Record<
  ArchetypeId,
  { short: string; full: string; thesis: string; initials: string }
> = {
  buffett: {
    short: "Buffett",
    full: "Warren Buffett",
    thesis: "Calidad, ROIC y dueño de capital",
    initials: "WB",
  },
  graham: {
    short: "Graham",
    full: "Benjamin Graham",
    thesis: "Valor y margen de seguridad",
    initials: "BG",
  },
  lynch: {
    short: "Lynch",
    full: "Peter Lynch",
    thesis: "Crecimiento a precio razonable",
    initials: "PL",
  },
  greenblatt: {
    short: "Greenblatt",
    full: "Joel Greenblatt",
    thesis: "Fórmula mágica: ROIC + yield",
    initials: "JG",
  },
  burry: {
    short: "Burry",
    full: "Michael Burry",
    thesis: "Asimetría cíclica y múltiplos bajos",
    initials: "MB",
  },
  dalio: {
    short: "Dalio",
    full: "Ray Dalio",
    thesis: "All-weather y paridad de riesgo",
    initials: "RD",
  },
  soros: {
    short: "Soros",
    full: "George Soros",
    thesis: "Macro direccional",
    initials: "GS",
  },
  hard_money: {
    short: "Austriaca",
    full: "Escuela austriaca",
    thesis: "Dinero duro, sin agencia",
    initials: "EA",
  },
};
