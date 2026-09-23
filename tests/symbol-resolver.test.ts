import { describe, expect, it } from "vitest";
import { SymbolResolver } from "../src/domain/symbol-resolver.js";

const resolver = new SymbolResolver();

describe("SymbolResolver", () => {
  it("resolves US common stocks and share classes", () => {
    const msft = resolver.resolve("MSFT");
    expect(msft.assetClass).toBe("equity");
    expect(msft.exchange).toBe("US");
    expect(msft.listingCurrency).toBe("USD");
    expect(msft.eodhdTicker).toBe("MSFT.US");
    expect(msft.fmpTicker).toBe("MSFT");

    const brk = resolver.resolve("BRK.B");
    expect(brk.canonicalTicker).toBe("BRK.B");
    expect(brk.eodhdTicker).toBe("BRK-B.US");
    expect(brk.exchange).toBe("US");

    const nvda = resolver.resolve("nvda");
    expect(nvda.canonicalTicker).toBe("NVDA");
  });

  it("resolves European listings and GBX scaling on LSE", () => {
    const idr = resolver.resolve("IDR.MC");
    expect(idr.exchange).toBe("MC");
    expect(idr.listingCurrency).toBe("EUR");
    expect(idr.country).toBe("ES");

    const rhm = resolver.resolve("RHM.DE");
    expect(rhm.exchange).toBe("DE");
    expect(rhm.exchangeName).toContain("XETRA");

    const rr = resolver.resolve("RR.L");
    expect(rr.listingCurrency).toBe("GBX");
    expect(rr.quoteScale).toBe(100);
    expect(rr.quoteCurrencyNormalized).toBe("GBP");
    expect(rr.notes.some((n) => n.includes("GBX"))).toBe(true);
  });

  it("resolves Asian tickers and attaches USD ADRs", () => {
    const toyota = resolver.resolve("7203.T");
    expect(toyota.listingCurrency).toBe("JPY");
    expect(toyota.adrTicker).toBe("TM.US");

    const baba = resolver.resolve("9988.HK");
    expect(baba.listingCurrency).toBe("HKD");
    expect(baba.adrTicker).toBe("BABA.US");

    const tsmc = resolver.resolve("2330.TW");
    expect(tsmc.listingCurrency).toBe("TWD");
    expect(tsmc.adrTicker).toBe("TSM.US");
  });

  it("resolves crypto vs USD/EUR", () => {
    for (const id of ["BTC", "ETH", "SOL", "BTC/USD", "ETH-EUR"]) {
      const r = resolver.resolve(id);
      expect(r.assetClass).toBe("crypto");
      expect(r.eodhdTicker.endsWith(".CC")).toBe(true);
    }
    expect(resolver.resolve("ETH/EUR").quotePair).toEqual({ base: "ETH", quote: "EUR" });
  });

  it("does not classify SOL.DE as crypto", () => {
    const r = resolver.resolve("SOL.DE");
    expect(r.assetClass).toBe("equity");
    expect(r.exchange).toBe("DE");
  });

  it("resolves sovereign yields", () => {
    expect(resolver.resolve("US10Y").eodhdTicker).toBe("US10Y.GBOND");
    expect(resolver.resolve("US02Y").tenorYears).toBe(2);
    expect(resolver.resolve("BUND10Y").canonicalTicker).toBe("DE10Y");
    expect(resolver.resolve("BONO10Y").canonicalTicker).toBe("ES10Y");
    expect(resolver.resolve("BUND10Y").assetClass).toBe("bond");
  });

  it("resolves FX, bullion and gold ETPs", () => {
    const eurusd = resolver.resolve("EUR/USD");
    expect(eurusd.assetClass).toBe("forex");
    expect(eurusd.eodhdTicker).toBe("EURUSD.FOREX");

    const usdjpy = resolver.resolve("USDJPY");
    expect(usdjpy.quotePair).toEqual({ base: "USD", quote: "JPY" });

    const gold = resolver.resolve("XAU/USD");
    expect(gold.instrumentSubtype).toBe("commodity_spot");

    const etp = resolver.resolve("PPFB.DE");
    expect(etp.assetClass).toBe("equity");
    expect(etp.instrumentSubtype).toBe("physical_etp");

    const mic = resolver.resolve("XETR:PPFB");
    expect(mic.canonicalTicker).toBe("PPFB.DE");
  });
});
