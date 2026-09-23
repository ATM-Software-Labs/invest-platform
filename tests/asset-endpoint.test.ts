import { afterAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";

const { app } = await buildServer();
await app.ready();

afterAll(async () => {
  await app.close();
});

describe("GET /api/v1/asset/:identifier", () => {
  it("returns a discriminated equity payload", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/asset/MSFT" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.assetClass).toBe("equity");
    expect(body.metrics.cashFlow.freeCashFlow).toBeGreaterThan(0);
    expect(body.metrics.reportingCurrency).toBe("USD");
    expect(body.resolved.canonicalTicker).toBe("MSFT");
  });

  it("normalizes Rolls-Royce GBX quotes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/asset/RR.L" });
    const body = res.json();
    expect(body.quote.currency).toBe("GBP");
    expect(body.quote.price).toBeLessThan(20);
    expect(body.metrics.accountingStandard).toBe("IFRS");
    expect(body.metrics.cashFlow.freeCashFlow).toBeLessThan(body.metrics.cashFlow.operatingCashFlow);
  });

  it("serves crypto, bonds and FX through the same contract", async () => {
    const btc = (await app.inject({ method: "GET", url: "/api/v1/asset/BTC" })).json();
    expect(btc.assetClass).toBe("crypto");
    expect(btc.metrics.stockToFlow).toBeGreaterThan(0);

    const bond = (await app.inject({ method: "GET", url: "/api/v1/asset/BONO10Y" })).json();
    expect(bond.assetClass).toBe("bond");
    expect(bond.metrics.creditSpreadBps).not.toBeNull();

    const fx = (await app.inject({ method: "GET", url: "/api/v1/asset/EUR/USD" })).json();
    expect(fx.assetClass).toBe("forex");
    expect(fx.resolved.eodhdTicker).toBe("EURUSD.FOREX");
  });

  it("returns a deterministic scorecard without calling an LLM", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/score/BTC" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.archetypes.hard_money.affinity).toBeGreaterThanOrEqual(80);
    expect(body.audit.engine).toBe("InvestorScoringEngine");
    expect(body.fairValue.method).toBe("not_applicable");
  });

  it("caches subsequent hits in memory", async () => {
    const first = (await app.inject({ method: "GET", url: "/api/v1/asset/ETH" })).json();
    const second = (await app.inject({ method: "GET", url: "/api/v1/asset/ETH" })).json();
    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(second.cache.store).toBe("memory");
  });
});
