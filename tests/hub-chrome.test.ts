import { describe, expect, it } from "vitest";
import { footer, topbar } from "../web/public-worker/src/chrome-snippet.mjs";
import { AFFILIATE_DISCLOSURE, RISK_WARNING } from "../shared/etoro.js";

describe("original chrome with the new pages", () => {
  it("keeps the original header and footer and links the new pages", () => {
    const html = topbar("/", "Analizar", "/comparar/") + footer();
    expect(html).toContain("atm-top");
    expect(html).toContain("atm-foot");
    expect(html).toContain("ATM · Markets");
    expect(html).toContain('href="/pulse/"');
    expect(html).toContain('href="/charts/"');
    expect(html).toContain('href="/cartera/"');
    expect(html).toContain('href="/ranking/"');
    expect(html).toContain('href="/legal/"');
    expect(html).toContain('href="/comparar/"');
    expect(html).toContain(AFFILIATE_DISCLOSURE);
    expect(html).toContain(RISK_WARNING);
    expect(html).toContain('id="etoro-partners-widget"');
    expect(html).not.toContain("Financial Hub");
    expect(html).not.toContain("Hub financiero");
    expect(html).not.toContain(">Hub<");
  });
});
