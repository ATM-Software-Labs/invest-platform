import { afterAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";
import { FEATURED_COMPANIES, UNIVERSE } from "../src/universe/catalog.js";

const { app } = await buildServer();
await app.ready();

afterAll(async () => {
  await app.close();
});

describe("GET /api/v1/universe", () => {
  it("lists the full desk universe and a top-5 ranked by affinity", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/universe" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(UNIVERSE.length);
    expect(body.assets).toHaveLength(UNIVERSE.length);
    expect(body.top5).toHaveLength(5);
    for (let i = 1; i < body.top5.length; i++) {
      expect(body.top5[i].affinity).toBeLessThanOrEqual(body.top5[i - 1].affinity);
    }
    const affinities = body.assets.map((a: { affinity: number }) => a.affinity);
    expect(affinities.some((a: number) => a < 100)).toBe(true);
    expect(affinities.filter((a: number) => a === 100).length).toBeLessThan(body.count);
    expect(body.assets.every((a: { id: string }) => UNIVERSE.some((u) => u.id === a.id))).toBe(true);
    expect(body.mesa).toHaveLength(FEATURED_COMPANIES.length);
    expect(FEATURED_COMPANIES).toHaveLength(50);
    expect(new Set(FEATURED_COMPANIES.map((c) => c.id)).size).toBe(50);
  });
});
