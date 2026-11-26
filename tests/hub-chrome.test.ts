import { describe, expect, it } from "vitest";
import { footer, topbar } from "../web/public-worker/src/chrome-snippet.mjs";
import { AFFILIATE_DISCLOSURE, RISK_WARNING } from "../shared/etoro.js";

describe("shared hub chrome", () => {
  it("uses the hub header and footer on a classic page", () => {
    const html = topbar("/", "Analizar", "/munger/") + footer();
    expect(html).toContain('href="/munger/" aria-current="page"');
    expect(html).toContain("Pulse (2 min)");
    expect(html).toContain("Terminal Charts");
    expect(html).toContain("Cartera &amp; Tesis");
    expect(html).toContain(AFFILIATE_DISCLOSURE);
    expect(html).toContain(RISK_WARNING);
    expect(html).toContain('id="etoro-partners-widget"');
    expect(html).not.toContain("atm-top");
    expect(html).not.toContain("atm-foot");
  });

  it("does not mark a tab on the 404 chrome", () => {
    const html = topbar("/", "Analizar");
    expect(html).not.toContain('aria-current="page"');
  });
});
