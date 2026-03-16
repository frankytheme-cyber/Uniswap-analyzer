import { GraphFetcher, GraphFetcherV4 } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS, TTL } from '../cache/cache-manager.ts'
import { runAnalysis } from './analysis-service.ts'
import type { PoolAnalysis } from './analysis-service.ts'
import type { CompetitorPool } from '../fetchers/graph-fetcher.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  chain:           string
  pools:           PoolAnalysis[]
  totalCandidates: number
  analyzedCount:   number
  lastUpdated:     Date
}

// ── Fee tiers to scan ────────────────────────────────────────────────────────

const FEE_TIERS = ['100', '500', '3000', '10000'] as const

// Chains with Uniswap V4 subgraph support (Arbitrum not yet available)
const V4_CHAINS = new Set(['ethereum', 'base', 'polygon'])

// ── Discovery Service ────────────────────────────────────────────────────────

export async function discoverTopPools(
  chain: string,
  limit = 10,
  minTvlUsd = 100_000,
): Promise<DiscoveryResult> {
  // Check cache first — full discovery result
  const cacheKey = CACHE_KEYS.discovery(chain, limit)
  return cache.get(cacheKey, 'DISCOVERY', () => runDiscovery(chain, limit, minTvlUsd))
}

async function runDiscovery(
  chain: string,
  limit: number,
  minTvlUsd: number,
): Promise<DiscoveryResult> {
  const log = (msg: string, extra?: object) =>
    console.log(JSON.stringify({ message: msg, ...extra, timestamp: new Date().toISOString() }))

  // ── Phase 1: Collect candidates (V3 + V4 subgraph queries) ────────────
  const fetcherV3 = new GraphFetcher(chain)

  // V3: 4 queries (one per fee tier)
  const v3Tiers = await Promise.all(
    FEE_TIERS.map((tier) =>
      cache.get(
        CACHE_KEYS.competitors(chain, tier),
        'COMPETITORS',
        () => fetcherV3.getTopPoolsByFeeTier(tier),
      ),
    ),
  )

  // V4: 4 queries if the chain supports V4, otherwise empty
  let v4Tiers: CompetitorPool[][] = []
  if (V4_CHAINS.has(chain)) {
    const fetcherV4 = new GraphFetcherV4(chain)
    v4Tiers = await Promise.all(
      FEE_TIERS.map((tier) =>
        cache.get(
          CACHE_KEYS.competitors(chain, `v4:${tier}`),
          'COMPETITORS',
          () => fetcherV4.getTopPoolsByFeeTier(tier),
        ).catch(() => [] as CompetitorPool[]),
      ),
    )
  }

  const allTiers = [...v3Tiers, ...v4Tiers]

  // Flatten, deduplicate by pool id, filter by min TVL
  const seen = new Set<string>()
  const candidates: CompetitorPool[] = []

  for (const pools of allTiers) {
    for (const pool of pools) {
      const id = pool.id.toLowerCase()
      if (seen.has(id)) continue
      seen.add(id)

      const tvl = parseFloat(pool.totalValueLockedUSD)
      if (tvl >= minTvlUsd) {
        candidates.push(pool)
      }
    }
  }

  log('Discovery: candidates collected', { chain, total: candidates.length })

  // Quick score: weighted fee/tvl + volume/tvl ratio
  const scored = candidates
    .map((pool) => {
      const tvl = parseFloat(pool.totalValueLockedUSD)
      const fees = parseFloat(pool.feesUSD)
      const volume = parseFloat(pool.volumeUSD)
      const quickScore = tvl > 0
        ? (fees / tvl) * 0.6 + (volume / tvl) * 0.4
        : 0
      return { pool, quickScore }
    })
    .sort((a, b) => b.quickScore - a.quickScore)

  // Take top limit*2 for full analysis (to account for failures)
  const toAnalyze = scored.slice(0, limit + 2)

  // ── Phase 2: Full analysis on best candidates ──────────────────────────
  const results: PoolAnalysis[] = []

  for (const { pool } of toAnalyze) {
    try {
      const analysis = await runAnalysis(chain, pool.id)
      results.push(analysis)
      log('Discovery: analyzed pool', {
        chain,
        pool: pool.id,
        score: analysis.overallScore,
        tokens: `${pool.token0.symbol}/${pool.token1.symbol}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(JSON.stringify({
        error: message,
        context: { method: 'discoverTopPools', chain, pool: pool.id },
        timestamp: new Date().toISOString(),
      }))
    }
    // Rate limit: sequential with delay (same pattern as cron refresh)
    await new Promise((r) => setTimeout(r, 200))
  }

  // Sort by overall score descending, return top `limit`
  results.sort((a, b) => b.overallScore - a.overallScore)

  return {
    chain,
    pools: results.slice(0, limit),
    totalCandidates: candidates.length,
    analyzedCount: results.length,
    lastUpdated: new Date(),
  }
}
