import { httpFetch, type HttpFetchTransport } from "gloomberb/utils";

export const MARKET_HEATMAP_UNIVERSES = [
  { id: "us-equity", label: "US Stocks" },
  { id: "us-etf", label: "US ETFs" },
] as const;

export type MarketHeatmapUniverseId = typeof MARKET_HEATMAP_UNIVERSES[number]["id"];
export type MarketHeatmapSource = "gloom";
export type MarketHeatmapSizeKind = "market-cap" | "net-assets";

export interface MarketHeatmapAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  /**
   * Whether the source actually carried a session change. `changePercent` keeps
   * a numeric 0 for the shared screener row shape, so tiles must read this
   * before showing a flat session that was really missing data.
   */
  hasChange: boolean;
  size: number | null;
  sizeKind: MarketHeatmapSizeKind;
  volume: number | null;
  currency: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  marketState: string | null;
  source: MarketHeatmapSource;
}

export interface MarketHeatmapResult {
  universe: MarketHeatmapUniverseId;
  source: MarketHeatmapSource;
  fetchedAt: number;
  assets: MarketHeatmapAsset[];
}

export interface MarketHeatmapFetchOptions {
  count?: number;
  forceRefresh?: boolean;
  cache?: boolean;
}

export interface MarketHeatmapSources { fetch?: HttpFetchTransport; }
const DEFAULT_COUNT = 80;
const CACHE_TTL_MS = 60_000;
const activeFetches = new Map<string, Promise<MarketHeatmapResult>>();
const memoryCache = new Map<string, { expiresAt: number; result: MarketHeatmapResult }>();

async function loadMarketHeatmap(universe: MarketHeatmapUniverseId, count: number, sources?: MarketHeatmapSources): Promise<MarketHeatmapResult> {
  const query = new URLSearchParams({ universe, count: String(count) });
  const response = await (sources?.fetch ?? httpFetch)(`https://api.gloom.sh/market/heatmap?${query}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`[${response.status}] Market heatmap unavailable`);
  const payload = await response.json() as { status?: string; data?: MarketHeatmapResult };
  if (!payload.data || !Array.isArray(payload.data.assets) || payload.data.universe !== universe
    || (payload.status !== "success" && payload.status !== "partial")) throw new Error("Market heatmap unavailable");
  return { ...payload.data, assets: payload.data.assets.slice(0, count) };
}

export async function fetchMarketHeatmap(
  universe: MarketHeatmapUniverseId,
  options?: MarketHeatmapFetchOptions,
  sources?: MarketHeatmapSources,
): Promise<MarketHeatmapResult> {
  const count = Math.max(1, Math.min(160, Math.round(options?.count ?? DEFAULT_COUNT)));
  const cacheKey = `${universe}:${count}`;
  const useCache = options?.cache !== false && !sources?.fetch;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (useCache && !options?.forceRefresh && cached && cached.expiresAt > now) {
    return cached.result;
  }

  if (useCache) {
    const active = activeFetches.get(cacheKey);
    if (active) return active;
  }

  const fetchPromise = loadMarketHeatmap(universe, count, sources)
    .then((result) => {
      if (useCache) {
        memoryCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return result;
    })
    .finally(() => {
      if (activeFetches.get(cacheKey) === fetchPromise) {
        activeFetches.delete(cacheKey);
      }
    });

  if (useCache) activeFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function resetMarketHeatmapCache(): void {
  activeFetches.clear();
  memoryCache.clear();
}
