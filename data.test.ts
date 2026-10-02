import { afterEach, expect, test } from "bun:test";
import { fetchMarketHeatmap, resetMarketHeatmapCache, type MarketHeatmapAsset } from "./data";

afterEach(resetMarketHeatmapCache);

const asset: MarketHeatmapAsset = {
  symbol: "ACME", name: "Acme", price: 100, change: 0, changePercent: 0, hasChange: false,
  size: 2_000_000_000, sizeKind: "market-cap", volume: null, currency: "USD", exchange: "NASDAQ",
  sector: null, industry: null, marketState: null, source: "gloom",
};

test("uses the backend universe, preserves unknown changes and bounds the requested count", async () => {
  const result = await fetchMarketHeatmap("us-equity", { count: 1, cache: false }, { fetch: async (input) => {
    const url = new URL(String(input));
    expect(url.origin + url.pathname).toBe("https://api.gloom.sh/market/heatmap");
    expect(url.searchParams.get("universe")).toBe("us-equity");
    expect(url.searchParams.get("count")).toBe("1");
    return Response.json({ status: "success", data: { universe: "us-equity", source: "gloom", fetchedAt: 1234,
      assets: [asset, { ...asset, symbol: "OTHER" }] } });
  } });
  expect(result.fetchedAt).toBe(1234);
  expect(result.assets).toEqual([asset]);
});

test("rejects failed and mismatched universe responses", async () => {
  for (const response of [new Response("Unavailable", { status: 503 }),
    Response.json({ status: "success", data: { universe: "us-etf", assets: [asset] } }),
    Response.json({ status: "error", data: { universe: "us-equity", assets: [] } })]) {
    await expect(fetchMarketHeatmap("us-equity", { cache: false }, { fetch: async () => response })).rejects.toThrow("Market heatmap unavailable");
  }
});
