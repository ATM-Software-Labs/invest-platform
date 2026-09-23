import { ARCHETYPE_COPY } from "./affinity";
import type { AssetClass, InvestAssetViewModel, Scorecard } from "./types";

export type Light = "green" | "amber" | "red";

export interface PlainVerdict {
  light: Light;
  lightLabel: string;
  whatIs: string;
  ifYouOwn: string;
  buyMore: string;
}

export function plainVerdict(model: InvestAssetViewModel): PlainVerdict {
  const { asset, analysis, displayName } = model;
  const score = analysis.scoring;
  const n = score.archetypes[score.bestFit]?.affinity ?? 0;
  const cls = asset.assetClass;
  const kind = whatKind(cls, asset.resolved.instrumentSubtype, displayName);
  const school = ARCHETYPE_COPY[score.bestFit]?.full ?? "el motor";

  if (cls !== "equity") {
    return nonCompany(cls, n, kind, displayName, school, score);
  }

  const fcf = score.derived.fcf;
  const yieldOk = (score.derived.fcfYield ?? 0) >= 0.02;
  const quality = (score.archetypes.buffett?.affinity ?? 0) >= 70 || (score.archetypes.lynch?.affinity ?? 0) >= 70;
  const cheap = (score.archetypes.graham?.affinity ?? 0) >= 70 || (score.archetypes.burry?.affinity ?? 0) >= 70;
  const weak = n < 40 || (fcf != null && fcf < 0);

  if (weak) {
    return {
      light: "red",
      lightLabel: "Cuidado",
      whatIs: `${displayName} es una empresa (${kind}). Hoy los fundamentales no pintan bien.`,
      ifYouOwn: "Si ya la tienes, no hace falta vender a ciegas, pero revísala: o gana poco, o debe mucho, o diluye a los socios.",
      buyMore: "No conviene comprar más solo porque ha bajado. Los números no lo respaldan.",
    };
  }

  if (quality && cheap) {
    return {
      light: "green",
      lightLabel: "Números sanos y precio razonable",
      whatIs: `${displayName} es una empresa (${kind}). Encaja sobre todo con ${school}.`,
      ifYouOwn: "Si ya la tienes, los fundamentales dicen que es de las que se pueden mantener.",
      buyMore: "Comprar más tiene sentido si el precio no se ha disparado. Empresa buena a precio que no asusta.",
    };
  }

  if (quality && !yieldOk) {
    return {
      light: "amber",
      lightLabel: "Buena empresa, precio alto",
      whatIs: `${displayName} es una empresa (${kind}). El negocio es sólido (estilo ${school}), pero ahora sale cara.`,
      ifYouOwn: "Si ya la tienes, puedes seguir. No es basura: es una buena compañía a precio de moda.",
      buyMore: "No hace falta comprar más hoy. Esperar un mejor precio suele ser más sabio que perseguirla.",
    };
  }

  if (quality) {
    return {
      light: "green",
      lightLabel: "Empresa sólida",
      whatIs: `${displayName} es una empresa (${kind}). Los números cuadran con ${school}.`,
      ifYouOwn: "Si ya la tienes, los fundamentales no piden salir.",
      buyMore: "Se puede añadir con calma, a plazos, no de golpe. No es un chollo ni un desastre.",
    };
  }

  if (n >= 50) {
    return {
      light: "amber",
      lightLabel: "Regular",
      whatIs: `${displayName} es una empresa (${kind}). Ni de las mejores ni de las peores según ${school}.`,
      ifYouOwn: "Si ya la tienes, no hay prisa. Tampoco hay un argumento fuerte para doblar.",
      buyMore: "Mejor no comprar más hasta entender por qué la quieres. Los números no empujan.",
    };
  }

  return {
    light: "red",
    lightLabel: "Cuidado",
    whatIs: `${displayName} es una empresa (${kind}).`,
    ifYouOwn: "Si ya la tienes, mira con calma deuda, beneficios y si emiten muchas acciones nuevas.",
    buyMore: "Los fundamentales no invitan a comprar más.",
  };
}

function nonCompany(
  cls: AssetClass,
  n: number,
  kind: string,
  name: string,
  school: string,
  score: Scorecard,
): PlainVerdict {
  if (cls === "crypto") {
    const btc = score.bestFit === "hard_money" && n >= 80;
    return {
      light: btc ? "green" : "amber",
      lightLabel: btc ? "Dinero duro, no una empresa" : "Cripto, no una empresa",
      whatIs: `${name} no es una compañía: es ${kind}. No tiene fábrica ni beneficios como Microsoft.`,
      ifYouOwn: btc
        ? "Si lo tienes como reserva (como quien tiene oro), el diseño encaja. No es una acción."
        : "Si lo tienes, recuerda: no hay cuentas anuales clásicas. El riesgo es otro.",
      buyMore: btc
        ? "Añadir más es una decisión de ahorro en dinero duro, no de 'esta empresa va bien'."
        : "No conviene tratarlo como si fuera una empresa sólida. Los fundamentales de acciones no aplican igual.",
    };
  }
  if (cls === "bond") {
    return {
      light: n >= 50 ? "amber" : "red",
      lightLabel: "Es un bono, no una empresa",
      whatIs: `${name} es deuda de un Estado. Te pagan un interés. No compras un trozo de compañía.`,
      ifYouOwn: "Si ya lo tienes, cobras ese interés. El precio sube o baja cuando cambian los tipos.",
      buyMore: "Comprar más es alargar el préstamo al Estado, no 'aumentar acciones'. Mira el tipo (TIR) antes.",
    };
  }
  return {
    light: n >= 70 ? "green" : "amber",
    lightLabel: cls === "forex" && kind.toLowerCase().includes("oro") ? "Es oro, no una empresa" : "No es una empresa",
    whatIs: `${name} es ${kind}. No tiene empleados ni beneficios como una sociedad cotizada.`,
    ifYouOwn: "Si lo tienes, es una reserva o un cambio de divisa, no una participación en un negocio.",
    buyMore: "Añadir más no es 'comprar más de la empresa'. Es aumentar esa reserva o esa divisa.",
  };
}

function whatKind(cls: AssetClass, subtype: string, name: string): string {
  if (cls === "crypto") return "una criptomoneda";
  if (cls === "bond") return "un bono soberano";
  if (subtype === "physical_etp" || subtype === "commodity_spot" || name.toLowerCase().includes("gold") || name.toLowerCase().includes("oro")) {
    return "oro / metal";
  }
  if (cls === "forex") return "un tipo de cambio (divisas)";
  return "una acción cotizada";
}
