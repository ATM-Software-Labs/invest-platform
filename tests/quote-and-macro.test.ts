import { describe, expect, it } from "vitest";
import { MacroNormalizer } from "../src/domain/macro-normalizer.js";
import { normalizeQuote } from "../src/domain/quote-normalizer.js";
import { CryptoNormalizer } from "../src/domain/crypto-normalizer.js";
import { SymbolResolver } from "../src/domain/symbol-resolver.js";

const resolver = new SymbolResolver();

describe("quote scale", () => {
  it("converts LSE GBX pence into GBP", () => {
    const rr = resolver.resolve("RR.L");
    const q = normalizeQuote(rr, {
      price: 568.4,
      currency: "GBX",
      changePercent: 1.1,
      volume: 1,
      marketCap: 48e9,
      asOf: "2026-01-01",
      delayed: true,
    });
    expect(q.currency).toBe("GBP");
    expect(q.price).toBeCloseTo(5.684, 4);
    expect(q.rawPrice).toBe(568.4);
  });
});

describe("macro duration", () => {
  it("computes modified duration for a 10Y par bond", () => {
    const macro = new MacroNormalizer();
    const d = macro.parBondDuration(0.04, 10, 1);
    expect(d).not.toBeNull();
    expect(d!.macaulay).toBeGreaterThan(8);
    expect(d!.macaulay).toBeLessThan(10);
    expect(d!.modified).toBeLessThan(d!.macaulay);

    const bund = resolver.resolve("BUND10Y");
    const metrics = macro.normalize({
      resolved: bund,
      yieldValue: 0.024,
      previousYield: 0.025,
      benchmarkYield: 0.042,
      quoteCurrency: "EUR",
      providers: ["test"],
      asOf: "2026-01-01",
    });
    expect(metrics.creditSpreadBps).toBeCloseTo(-180, 0);
    expect(metrics.modifiedDuration).toBeGreaterThan(7);
  });
});

describe("crypto stock-to-flow", () => {
  it("derives inflation and S2F from issuance", () => {
    const n = new CryptoNormalizer();
    const m = n.normalize(
      {
        name: "Bitcoin",
        circulatingSupply: 19_800_000,
        maxSupply: 21_000_000,
        totalSupply: 19_800_000,
        annualIssuance: 164_250,
        hashRate: 1,
        transactionCount24h: 1,
        activeAddresses24h: 1,
      },
      { price: 64000, currency: "USD", changePercent: 0, volume: 0, marketCap: 1.26e12, asOf: null, delayed: false },
      ["test"],
    );
    expect(m.supplyRatio).toBeCloseTo(19.8 / 21, 4);
    expect(m.annualInflationRate).toBeCloseTo(164_250 / 19_800_000, 6);
    expect(m.stockToFlow).toBeCloseTo(19_800_000 / 164_250, 3);
  });
});
