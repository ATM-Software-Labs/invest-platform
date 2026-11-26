import { describe, expect, it } from "vitest";
import {
  actionReasons, closeness, drawdownFromHigh, ema, fundamentalRatio, lastNumber, nearLevel, poc,
  relativeStrength, seriesAth, swingPivots, trendProjection, ytdStrength,
} from "../shared/indicators.js";
import { applyBuy, applySell, portfolioWeights } from "../shared/portfolio.js";
import { markReviewed } from "../shared/streak.js";
import { classifyAsset, simulatorAllowed } from "../shared/assets.js";

describe("ema", () => {
  it("seeds with the SMA and then applies the smoothing constant", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });

  it("stays on a constant series", () => {
    const out = ema([7, 7, 7, 7], 2);
    expect(lastNumber(out)).toBeCloseTo(7);
  });

  it("returns nulls when the series is shorter than the period", () => {
    expect(ema([1, 2], 5).every((v) => v == null)).toBe(true);
  });
});

describe("poc", () => {
  it("picks the price bin that accumulated the most volume", () => {
    const bars = [
      { low: 9, high: 11, close: 10, volume: 1 },
      { low: 9.5, high: 10.5, close: 10, volume: 1 },
      { low: 19, high: 21, close: 20, volume: 80 },
    ];
    const hit = poc(bars, 8);
    expect(hit).not.toBeNull();
    expect(hit!.price).toBeGreaterThan(15);
    expect(hit!.volume).toBe(80);
  });

  it("returns the close when the window has no range", () => {
    const hit = poc([{ low: 5, high: 5, close: 5, volume: 3 }], 8);
    expect(hit!.price).toBe(5);
  });
});

describe("pivots and trend", () => {
  const bars = [2, 3, 4, 3, 2, 3, 7, 3, 2, 4, 6, 3, 2].map((h, i) => ({
    high: h, low: h - 1, close: h - 0.2, volume: 1, time: "2024-01-" + String(i + 1).padStart(2, "0"),
  }));

  it("finds the swing high", () => {
    const { highs } = swingPivots(bars, 2);
    expect(highs.map((p) => p.price)).toContain(7);
  });

  it("projects a line through the last two relevant highs or lows", () => {
    const pivots = swingPivots(bars, 2);
    const line = trendProjection(pivots, bars.length - 1);
    expect(line).not.toBeNull();
    expect(line!.to.index).toBe(bars.length - 1);
    expect(Number.isFinite(line!.to.price)).toBe(true);
  });
});

describe("distances", () => {
  it("flags a move, an EMA touch and a target", () => {
    const reasons = actionReasons({ price: 100, changePct: 4, ema200: 101, poc: 80 }, [100]);
    expect(reasons.map((r) => r.id)).toEqual(["move", "ema200", "target"]);
  });

  it("stays quiet inside the bands", () => {
    expect(actionReasons({ price: 100, changePct: 0.2, ema200: 120, poc: 80 }, [90])).toEqual([]);
    expect(nearLevel(100, 101, 2)).toBe(true);
  });

  it("measures relative strength, year-to-date and drawdown", () => {
    const closes = [10, 11, 12];
    expect(relativeStrength(closes, 2)).toBeCloseTo(20);
    const bars = [
      { time: "2025-12-30", close: 100, high: 110, low: 90 },
      { time: "2026-01-02", close: 90, high: 95, low: 88 },
      { time: "2026-03-01", close: 99, high: 100, low: 90 },
    ];
    expect(ytdStrength(bars, 2026)).toBeCloseTo(10);
    expect(drawdownFromHigh(bars)).toBeCloseTo((99 / 110 - 1) * 100);
    expect(closeness({ distPoc: -4, distSupport: 1.2 })).toBeCloseTo(1.2);
  });

  it("drops a broken high tick and keeps a real one", () => {
    const bars = [
      { open: 10, high: 100, low: 9, close: 10 },
      { open: 10, high: 12, low: 9, close: 11 },
    ];
    expect(seriesAth(bars)).toBe(12);
  });
});

describe("fundamental ratio", () => {
  it("prefers free-cash-flow margin and falls back to net margin", () => {
    expect(fundamentalRatio({ freeCashFlowMargin: 0.12, netMargin: 0.2 })!.basis).toBe("fcf");
    expect(fundamentalRatio({ netMargin: 0.2 })!.basis).toBe("net");
    expect(fundamentalRatio(null)).toBeNull();
  });
});

describe("simulator and classes", () => {
  it("buys and sells only with the cash on hand", () => {
    const bought = applyBuy({ cash: 100000, positions: [] }, { symbol: "AAPL", name: "Apple", type: "stock", price: 100 }, 1000);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.simulator.cash).toBe(99000);
    expect(bought.simulator.positions[0]!.shares).toBeCloseTo(10);
    const sold = applySell(bought.simulator, "AAPL", 4, 110);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.simulator.cash).toBe(99440);
  });

  it("weights the book by asset class", () => {
    const w = portfolioWeights(50000, [
      { symbol: "AAPL", type: "stock", shares: 10, avg: 100 },
      { symbol: "GLD", type: "commodity", shares: 5, avg: 200 },
    ], { AAPL: 100, GLD: 200 });
    expect(w.equity).toBe(52000);
    expect(w.classes.find((c) => c.type === "stock")!.pct).toBeCloseTo((1000 / 52000) * 100);
    expect(w.classes.find((c) => c.type === "commodity")!.pct).toBeCloseTo((1000 / 52000) * 100);
  });

  it("refuses futures and leveraged names and keeps physical metals", () => {
    const future = classifyAsset("GC=F", "FUTURE", "Gold");
    expect(future.type).toBe("blocked");
    expect(future.proxy).toBe("GLD");
    expect(simulatorAllowed(future)).toBe(false);
    expect(classifyAsset("TQQQ", "ETF", "ProShares UltraPro QQQ").type).toBe("blocked");
    expect(classifyAsset("GLD", "ETF", "SPDR Gold").type).toBe("commodity");
    expect(classifyAsset("SPY", "ETF", "SPDR").type).toBe("etf");
    expect(classifyAsset("^IBEX", "INDEX", "IBEX").type).toBe("fund");
    expect(simulatorAllowed(classifyAsset("AAPL", "EQUITY", "Apple"))).toBe(true);
  });
});

describe("streak", () => {
  it("increments only across consecutive days", () => {
    expect(markReviewed({ last: "", count: 0 }, "2026-11-26")).toEqual({ last: "2026-11-26", count: 1 });
    expect(markReviewed({ last: "2026-11-26", count: 1 }, "2026-11-27")).toEqual({ last: "2026-11-27", count: 2 });
    expect(markReviewed({ last: "2026-11-27", count: 2 }, "2026-11-27").count).toBe(2);
    expect(markReviewed({ last: "2026-11-20", count: 4 }, "2026-11-26").count).toBe(1);
  });
});
