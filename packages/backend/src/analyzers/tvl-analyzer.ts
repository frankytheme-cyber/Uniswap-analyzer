import type { Pool, Tick } from '../fetchers/graph-fetcher.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export type PoolType = 'stablecoin' | 'major' | 'altcoin'

export interface ParameterScore {
  id: string
  score: 0 | 1
  value: number
  displayValue: string
  label: string
  status: 'good' | 'warn' | 'bad'
  detail: string
  rawData?: Record<string, string | number>
}

// ── Pool type classification ──────────────────────────────────────────────────

const STABLES = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'crvUSD'])
const MAJORS  = new Set(['WETH', 'ETH', 'WBTC', 'BTC'])

export function getPoolType(token0: string, token1: string): PoolType {
  if (STABLES.has(token0) && STABLES.has(token1)) return 'stablecoin'
  if (MAJORS.has(token0) || MAJORS.has(token1)) return 'major'
  return 'altcoin'
}

// Tick range width (in ticks) around the current tick to consider "active"
const RANGE_WIDTH: Record<PoolType, number> = {
  stablecoin: 500,
  major:      2000,
  altcoin:    4000,
}

// ── AVL Calculation ───────────────────────────────────────────────────────────

/**
 * Calculates Active Value Locked (AVL) in USD.
 *
 * AVL = sum of liquidityGross for ticks within [currentTick ± rangeWidth],
 * proportional to total pool liquidity, mapped to totalValueLockedUSD.
 */
function calculateAvlUsd(
  currentTick: number,
  ticks: Tick[],
  totalLiquidity: bigint,
  totalValueLockedUSD: number,
  rangeWidth: number,
): number {
  if (totalLiquidity === 0n || totalValueLockedUSD === 0) return 0

  const lowerBound = currentTick - rangeWidth
  const upperBound = currentTick + rangeWidth

  let activeLiquidity = 0n
  for (const tick of ticks) {
    const tickIdx = parseInt(tick.tickIdx, 10)
    if (tickIdx >= lowerBound && tickIdx <= upperBound) {
      activeLiquidity += BigInt(tick.liquidityGross)
    }
  }

  const avlRatio = Number(activeLiquidity) / Number(totalLiquidity)
  return avlRatio * totalValueLockedUSD
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export interface TvlAnalyzerInput {
  pool: Pool
  ticks: Tick[]
}

export function analyzeTvl(input: TvlAnalyzerInput): ParameterScore {
  const context = { method: 'analyzeTvl', poolId: input.pool.id }
  try {
    const { pool, ticks } = input

    const currentTick      = parseInt(pool.tick, 10)
    const totalLiquidity   = BigInt(pool.liquidity)
    const totalValueLocked = parseFloat(pool.totalValueLockedUSD)
    const poolType         = getPoolType(pool.token0.symbol, pool.token1.symbol)
    const rangeWidth       = RANGE_WIDTH[poolType]

    const avlUsd  = calculateAvlUsd(currentTick, ticks, totalLiquidity, totalValueLocked, rangeWidth)
    const avlRatio = totalValueLocked > 0 ? avlUsd / totalValueLocked : 0

    return buildScore(avlRatio, totalValueLocked, avlUsd, poolType)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildScore(
  avlRatio: number,
  tvlUsd: number,
  avlUsd: number,
  poolType: PoolType,
): ParameterScore {
  const pct = (avlRatio * 100).toFixed(1)

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  if (avlRatio > 0.7) {
    score  = 1
    status = 'good'
    detail = `${pct}% della liquidità è attiva vicino al prezzo corrente (${poolType})`
  } else if (avlRatio > 0.4) {
    score  = 0
    status = 'warn'
    detail = `Solo ${pct}% della liquidità è attiva — possibile TVL gonfiato`
  } else {
    score  = 0
    status = 'bad'
    detail = `Solo ${pct}% della liquidità è attiva — TVL probabilmente gonfiato`
  }

  return {
    id:           'tvl',
    score,
    value:        avlRatio,
    displayValue: `${pct}%`,
    label:        'TVL Reale?',
    status,
    detail,
    rawData: {
      'totalValueLockedUSD': `$${tvlUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'activeLiquidityUSD':  `$${avlUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'avlRatio':            `${pct}%`,
      'poolType':            poolType,
    },
  }
}
