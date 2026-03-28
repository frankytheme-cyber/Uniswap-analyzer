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
 * Walks initialized ticks using liquidityNet to reconstruct actual liquidity L
 * at each tick interval, then computes what fraction of the pool's total
 * liquidity-weighted tick space falls within [currentTick ± rangeWidth].
 *
 * The ratio is: sum(L × width) in range / sum(L × width) across ALL ticks
 * where "all ticks" is bounded by the first and last initialized tick (not
 * the theoretical min/max), so empty far-away ticks don't dilute the result.
 *
 * NOTE: the original implementation summed liquidityGross which double-counts
 * every position (liquidityGross is added at both the lower AND upper tick).
 * Using liquidityNet and accumulating from the bottom correctly reconstructs
 * the real liquidity at each interval.
 */
function calculateAvlUsd(
  currentTick: number,
  ticks: Tick[],
  poolLiquidity: bigint,
  totalValueLockedUSD: number,
  rangeWidth: number,
): number {
  if (poolLiquidity === 0n || totalValueLockedUSD === 0) return 0
  if (ticks.length === 0) return 0

  const lowerBound = currentTick - rangeWidth
  const upperBound = currentTick + rangeWidth

  // Sort ticks ascending by tickIdx, keeping only those with non-zero liquidityNet
  const sorted = [...ticks]
    .map((t) => {
      try {
        return { idx: parseInt(t.tickIdx, 10), liquidityNet: BigInt(t.liquidityNet) }
      } catch {
        return null
      }
    })
    .filter((t): t is { idx: number; liquidityNet: bigint } => t !== null && t.liquidityNet !== 0n)
    .sort((a, b) => a.idx - b.idx)

  if (sorted.length === 0) return 0

  // Walk ticks from bottom, accumulating liquidityNet to reconstruct L per interval.
  // For each interval [tick_i, tick_{i+1}), the active liquidity is the running sum.
  // We compute sum(L × width) in-range vs total to get the AVL fraction.
  let runningL = 0n
  let weightedLInRange = 0n
  let weightedLAll = 0n

  for (let i = 0; i < sorted.length - 1; i++) {
    runningL += sorted[i].liquidityNet

    const intervalStart = sorted[i].idx
    const intervalEnd = sorted[i + 1].idx

    if (intervalEnd <= intervalStart) continue

    // Clamp to non-negative (runningL can go negative with bad subgraph data)
    const effectiveL = runningL > 0n ? runningL : 0n
    const width = BigInt(intervalEnd - intervalStart)

    // Accumulate for all initialized ticks
    weightedLAll += effectiveL * width

    // Accumulate for in-range ticks
    const clampedStart = Math.max(intervalStart, lowerBound)
    const clampedEnd = Math.min(intervalEnd, upperBound)
    if (clampedStart < clampedEnd) {
      const inRangeWidth = BigInt(clampedEnd - clampedStart)
      weightedLInRange += effectiveL * inRangeWidth
    }
  }

  if (weightedLAll === 0n) return 0

  // AVL ratio = fraction of total liquidity-weighted tick space that is in range
  // This ratio is always ≤ 1.0 because in-range is a subset of all ticks.
  const SCALE = 10n ** 18n
  const avlRatio = Number((weightedLInRange * SCALE) / weightedLAll) / 1e18
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
