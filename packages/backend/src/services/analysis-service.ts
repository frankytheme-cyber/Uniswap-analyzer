import { GraphFetcher, GraphFetcherV4, detectPoolVersion } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS, TTL } from '../cache/cache-manager.ts'
import { analyzeTvl, getPoolType } from '../analyzers/tvl-analyzer.ts'
import { analyzeFeeApr, analyzeCompetitiveFees, calculateFeeApr } from '../analyzers/fees-analyzer.ts'
import { analyzeVolume } from '../analyzers/volume-analyzer.ts'
import { analyzeCapitalEfficiency } from '../analyzers/capital-efficiency-analyzer.ts'
import { analyzeIncentives } from '../analyzers/incentives-analyzer.ts'
import { db } from '../db/duckdb-store.ts'
import type { ParameterScore } from '../analyzers/tvl-analyzer.ts'

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

// ── Service ───────────────────────────────────────────────────────────────────

export async function runAnalysis(chain: string, poolAddress: string): Promise<PoolAnalysis> {
  const version = detectPoolVersion(poolAddress)
  const fetcher = version === 'v4' ? new GraphFetcherV4(chain) : new GraphFetcher(chain)
  const poolId  = poolAddress.toLowerCase()

  // ── Fetch all data (cached) ─────────────────────────────────────────────
  const [pool, ticks, hourDatas, swaps, dayDatas90, dayDatas365] = await Promise.all([
    cache.get(CACHE_KEYS.pool(chain, poolId), 'POOL', () => fetcher.getPool(poolId)),
    cache.get(CACHE_KEYS.ticks(chain, poolId), 'TICKS', () => fetcher.getPoolTicks(poolId)),
    cache.get(CACHE_KEYS.hourDatas(chain, poolId), 'HOUR_DATAS', () => fetcher.getPoolHourDatas(poolId)),
    cache.get(CACHE_KEYS.swaps(chain, poolId), 'POOL', () => fetcher.getRecentSwaps(poolId, 1)),
    cache.get(CACHE_KEYS.dayDatas(chain, poolId, 90), 'DAY_DATAS', () => fetcher.getPoolDayDatas(poolId, 90)),
    cache.get(CACHE_KEYS.dayDatas(chain, poolId, 365), 'DAY_DATAS', () => fetcher.getPoolDayDatas(poolId, 365)),
  ])

  // Persist day datas to DuckDB for historical queries
  await db.upsertDayDatas(chain, poolId, dayDatas365)

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

  // ── Aggregate ───────────────────────────────────────────────────────────
  const parameters: ParameterScore[] = [
    tvlScore,
    volumeScore,
    feeAprScore,
    competitiveScore,
    efficiencyScore,
    incentivesScore,
  ]

  const positiveCount  = parameters.filter((p) => p.score === 1).length
  const overallScore   = Math.round((positiveCount / 6) * 100)
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
