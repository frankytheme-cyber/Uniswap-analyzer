import { GraphFetcher, GraphFetcherV4, detectPoolVersion } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS, TTL } from '../cache/cache-manager.ts'
import { analyzeTvl, getPoolType } from '../analyzers/tvl-analyzer.ts'
import { analyzeFeeApr, analyzeCompetitiveFees, calculateFeeApr } from '../analyzers/fees-analyzer.ts'
import { analyzeVolume } from '../analyzers/volume-analyzer.ts'
import { analyzeCapitalEfficiency } from '../analyzers/capital-efficiency-analyzer.ts'
import { analyzeIncentives } from '../analyzers/incentives-analyzer.ts'
import { analyzeMaturity } from '../analyzers/maturity-analyzer.ts'
import { db } from '../db/duckdb-store.ts'
import type { ParameterScore } from '../analyzers/tvl-analyzer.ts'
import type { PoolDayData } from '../fetchers/graph-fetcher.ts'
import type { StoredDayData } from '../db/duckdb-store.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PoolAnalysis {
  poolAddress:   string
  chain:         string
  token0:        string
  token1:        string
  feeTier:       number
  version:       'v3' | 'v4'
  hooks?:        string    // V4 only: hooks contract address; zero address = no hooks
  parameters:    ParameterScore[]
  overallScore:  number
  overallStatus: 'healthy' | 'caution' | 'risk'
  lastUpdated:   Date
}

// ── DuckDB L2 helpers ─────────────────────────────────────────────────────────

function storedToPoolDayData(rows: StoredDayData[]): PoolDayData[] {
  return rows.map((r) => ({
    date:      r.date,
    tvlUSD:    String(r.tvlUSD),
    volumeUSD: String(r.volumeUSD),
    feesUSD:   String(r.feesUSD),
    txCount:   String(r.txCount),
    open:      String(r.open),
    high:      String(r.high),
    low:       String(r.low),
    close:     String(r.close),
  }))
}

// Returns poolDayDatas for `days` days.
// 1. If DuckDB has recent data (< 48h old) with enough rows → serve from DB (no API call)
// 2. If DB is partially populated → fetch only the missing delta from The Graph
// 3. If DB is empty → fetch all `days` from The Graph
export async function getDayDatasWithDbFallback(
  chain: string,
  poolId: string,
  days: number,
  fetcher: GraphFetcher,
): Promise<PoolDayData[]> {
  const TWO_DAYS_SECS = 2 * 86400
  const latestDate = await db.getLatestDate(chain, poolId)

  // Serve entirely from DB when data is recent enough
  if (latestDate && Date.now() / 1000 - latestDate < TWO_DAYS_SECS) {
    const stored = await db.getDayDatas(chain, poolId, days)
    if (stored.length >= Math.min(days, 7)) {
      return storedToPoolDayData(stored)
    }
  }

  // Fetch only missing days (delta), or full `days` if DB is empty
  const daysToFetch = latestDate
    ? Math.min(Math.ceil(Date.now() / 1000 - latestDate) / 86400 + 2, days)
    : days
  const fetchCount = Math.max(Math.ceil(daysToFetch), 1)

  const fresh = await cache.get(
    CACHE_KEYS.dayDatas(chain, poolId, fetchCount),
    'DAY_DATAS',
    () => fetcher.getPoolDayDatas(poolId, fetchCount),
  )
  await db.upsertDayDatas(chain, poolId, fresh)

  if (fetchCount >= days) return fresh

  // Merge: DB now has historical + fresh data
  const merged = await db.getDayDatas(chain, poolId, days)
  return storedToPoolDayData(merged)
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function runAnalysis(chain: string, poolAddress: string): Promise<PoolAnalysis> {
  const version = detectPoolVersion(poolAddress)
  const fetcher = version === 'v4' ? new GraphFetcherV4(chain) : new GraphFetcher(chain)
  const poolId  = poolAddress.toLowerCase()

  // ── Fetch all data (cached / DuckDB L2) ────────────────────────────────
  const [pool, ticks, hourDatas, swaps] = await Promise.all([
    cache.get(CACHE_KEYS.pool(chain, poolId), 'POOL', () => fetcher.getPool(poolId)),
    cache.get(CACHE_KEYS.ticks(chain, poolId), 'TICKS', () => fetcher.getPoolTicks(poolId)),
    cache.get(CACHE_KEYS.hourDatas(chain, poolId), 'HOUR_DATAS', () => fetcher.getPoolHourDatas(poolId)),
    cache.get(CACHE_KEYS.swaps(chain, poolId), 'POOL', () => fetcher.getRecentSwaps(poolId, 1)),
  ])

  // dayDatas use DuckDB as L2 to avoid re-fetching 365 days on every cold start
  const [dayDatas90, dayDatas365] = await Promise.all([
    getDayDatasWithDbFallback(chain, poolId, 90, fetcher),
    getDayDatasWithDbFallback(chain, poolId, 365, fetcher),
  ])

  // Competitor pools (same feeTier)
  const competitors = await cache.get(
    CACHE_KEYS.competitors(chain, pool.feeTier),
    'COMPETITORS',
    () => fetcher.getTopPoolsByFeeTier(pool.feeTier),
  )

  // ── Run analyzers ───────────────────────────────────────────────────────
  const poolType = getPoolType(pool.token0.symbol, pool.token1.symbol)

  const tvlScore = analyzeTvl({ pool, ticks })

  const feeAprScore = analyzeFeeApr({ poolId, dayDatas: dayDatas365 })

  const { feeAPR } = calculateFeeApr({ poolId, dayDatas: dayDatas365 })
  const competitiveScore = analyzeCompetitiveFees({
    poolId,
    poolFeeApr: feeAPR,
    competitors: competitors.filter((c) => c.id !== poolId),
  })

  const volumeScore = analyzeVolume({
    poolId,
    swaps,
    volumeUsd24h: dayDatas90[0] ? parseFloat(dayDatas90[0].volumeUSD) : 0,
  })

  const efficiencyScore = analyzeCapitalEfficiency({ poolId, hourDatas, poolType })

  const incentivesScore = analyzeIncentives({ poolId, dayDatas: dayDatas90 })

  const maturityScore = analyzeMaturity({ pool, dayDatas: dayDatas365 })

  // ── Aggregate ───────────────────────────────────────────────────────────
  const parameters: ParameterScore[] = [
    tvlScore,
    volumeScore,
    feeAprScore,
    competitiveScore,
    efficiencyScore,
    incentivesScore,
    maturityScore,
  ]

  const positiveCount  = parameters.filter((p) => p.score === 1).length
  const overallScore   = Math.round((positiveCount / parameters.length) * 100)
  const overallStatus  = overallScore >= 80 ? 'healthy' : overallScore >= 50 ? 'caution' : 'risk'

  // V4: extract hooks address; zero address means no hooks attached
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const hooks = pool.hooks && pool.hooks !== ZERO_ADDRESS ? pool.hooks : undefined

  return {
    poolAddress:  poolId,
    chain,
    token0:       pool.token0.symbol,
    token1:       pool.token1.symbol,
    feeTier:      parseInt(pool.feeTier, 10),
    version,
    ...(hooks && { hooks }),
    parameters,
    overallScore,
    overallStatus,
    lastUpdated:  new Date(),
  }
}
