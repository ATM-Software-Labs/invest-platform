import { describe, expect, it } from "vitest";
import { deny, normalizeSymbol, parseSymbolList } from "../shared/guard.js";
import { cacheHeader } from "../shared/market.js";
import { parseYahooChart } from "../shared/yahoo.js";

function req(path: string, ua: string | null) {
  const headers = new Headers();
  if (ua != null) headers.set("user-agent", ua);
  return new Request("https://invest.trujillomingorance.com" + path, { headers });
}

describe("market guard", () => {
  it("blocks an empty user agent before any market work", async () => {
    const res = deny(req("/api/ohlcv?symbol=AAPL", ""));
    expect(res?.status).toBe(403);
  });

  it("blocks known scanners and probe paths", async () => {
    expect(deny(req("/api/pulse?symbols=AAPL", "sqlmap/1.0"))?.status).toBe(403);
    expect(deny(req("/wp-login.php", "Mozilla/5.0"))?.status).toBe(404);
    expect(deny(req("/.env", "Mozilla/5.0"))?.status).toBe(404);
    expect(deny(req("/index.php", "Mozilla/5.0"))?.status).toBe(404);
  });

  it("lets a browser, search crawlers and link unfurlers through", () => {
    expect(deny(req("/api/ohlcv?symbol=AAPL", "Mozilla/5.0"))).toBeNull();
    expect(deny(req("/api/quote?q=AAPL", "Mozilla/5.0 (compatible; Googlebot/2.1)"))).toBeNull();
    expect(deny(req("/api/search?q=apple", "Mozilla/5.0 AppleWebKit (KHTML, like Gecko); compatible; GPTBot/1.0"))).toBeNull();
    expect(deny(req("/", "ClaudeBot/1.0"))).toBeNull();
    expect(deny(req("/", "Twitterbot/1.0"))).toBeNull();
    expect(deny(req("/api/subscribe", ""))).toBeNull();
  });

  it("validates symbols strictly and caps the batch", () => {
    expect(normalizeSymbol("aapl")).toBe("AAPL");
    expect(normalizeSymbol("SAN.MC")).toBe("SAN.MC");
    expect(normalizeSymbol("^IBEX")).toBe("^IBEX");
    expect(normalizeSymbol("GLD")).toBe("GLD");
    expect(normalizeSymbol("AAPL;DROP")).toBeNull();
    expect(normalizeSymbol("../etc")).toBeNull();
    expect(parseSymbolList("msft,AAPL,msft").symbols).toEqual(["AAPL", "MSFT"]);
    expect(parseSymbolList("AAPL,nope space").ok).toBe(false);
    expect(parseSymbolList(Array.from({ length: 31 }, (_, i) => "A" + i).join(",")).error).toBe("too_many_symbols");
  });
});

describe("cache headers", () => {
  it("uses 15 min intraday, 60 min daily and 20 min pulse", () => {
    expect(cacheHeader(900)).toBe("public, max-age=900, s-maxage=900");
    expect(cacheHeader(3600)).toBe("public, max-age=3600, s-maxage=3600");
    expect(cacheHeader(1200)).toBe("public, max-age=1200, s-maxage=1200");
  });
});

describe("yahoo bars", () => {
  it("keeps full candles and drops empty prints", () => {
    const parsed = parseYahooChart({
      chart: {
        result: [{
          meta: { symbol: "AAPL", instrumentType: "EQUITY", currency: "USD", shortName: "Apple", regularMarketPrice: 11, chartPreviousClose: 10 },
          timestamp: [1700000000, 1700086400],
          indicators: { quote: [{ open: [10, null], high: [12, 1], low: [9, 1], close: [11, 1], volume: [100, 0] }] },
        }],
      },
    }, false);
    expect(parsed!.bars).toHaveLength(1);
    expect(parsed!.bars[0]).toMatchObject({ open: 10, high: 12, low: 9, close: 11, volume: 100 });
    expect(parsed!.bars[0]!.time).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
