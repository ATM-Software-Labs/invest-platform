import { describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";
import { parseNasdaqListed, parseOtherListed, searchDirectory } from "../src/universe/directory.js";

const nasdaqSample = `Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
AAPL|Apple Inc. - Common Stock|Q|N|N|100|N|N
MSFT|Microsoft Corporation - Common Stock|Q|N|N|100|N|N
ZZZT|Test Issue|Q|Y|N|100|N|N
File Creation Time: 0918202621:31|||||||
`;

const otherSample = `ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
BRK.B|Berkshire Hathaway Inc. Class B|N|BRK.B|N|100|N|BRK.B
JNJ|Johnson & Johnson Common Stock|N|JNJ|N|100|N|JNJ
File Creation Time: 0918202621:31||||||
`;

describe("NASDAQ directory parsers", () => {
  it("parses listed files and skips test issues", () => {
    const nasdaq = parseNasdaqListed(nasdaqSample);
    const other = parseOtherListed(otherSample);
    expect(nasdaq.map((r) => r.id)).toEqual(["AAPL", "MSFT"]);
    expect(other.map((r) => r.id)).toEqual(["BRK.B", "JNJ"]);
    expect(other[0]?.venue).toBe("NYSE");
    expect(nasdaq[0]?.country).toBe("US");
    expect(other[0]?.kind).toBe("stock");
  });

  it("labels ETFs and sectors from the security name", () => {
    const etf = parseNasdaqListed(`Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
QQQ|Invesco QQQ Trust ETF|G|N|N|100|Y|N
File Creation Time: x|||||||
`);
    expect(etf[0]?.kind).toBe("etf");
    expect(etf[0]?.sector).toBe("Tecnología");
  });

  it("ranks exact ticker matches first", () => {
    const hits = searchDirectory("MSFT", { limit: 10 });
    expect(hits[0]?.id).toBe("MSFT");
  });
});

describe("GET /api/v1/search", () => {
  it("exposes more than 9000 listed names", async () => {
    const { app } = await buildServer();
    await app.ready();
    try {
      const stats = (await app.inject({ method: "GET", url: "/api/v1/directory" })).json();
      expect(stats.count).toBeGreaterThan(9000);
      const aapl = (await app.inject({ method: "GET", url: "/api/v1/search?q=AAPL" })).json();
      expect(aapl.results[0].id).toBe("AAPL");
      const ms = (await app.inject({ method: "GET", url: "/api/v1/search?q=micro" })).json();
      expect(ms.results.some((r: { id: string }) => r.id === "MSFT")).toBe(true);
    } finally {
      await app.close();
    }
  });
});
