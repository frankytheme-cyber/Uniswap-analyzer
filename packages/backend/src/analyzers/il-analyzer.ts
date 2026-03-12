// ── Types ────────────────────────────────────────────────────────────────────

export interface ILPoint {
  priceMultiplier: number   // es. 2.0 = prezzo raddoppiato rispetto all'entrata
  ilPercent: number         // sempre ≤ 0 (es. -5.72)
  feeOffsetDays: number     // giorni di fee per coprire l'IL; -1 se feeAPR=0
}

/** Extended IL point per strategie con range concentrato (V3) */
export interface ILDataPoint {
  priceMultiplier:   number   // currentPrice / entryPrice
  priceChangePercent: number  // (priceMultiplier - 1) * 100
  ilPercent:         number   // IL% rispetto a hold; ≤ 0 se LP < hold
  feeOffsetDays:     number   // giorni di fee per coprire il loss; -1 se feeAPR=0
  inRange:           boolean  // true se il prezzo è ancora nel range
  token0Percent:     number   // % del valore posizione in token0
  token1Percent:     number   // % del valore posizione in token1
}

export interface ILAnalyzerInput {
  poolId: string
  feeAPR: number
}

export interface ILAnalyzerResult {
  points: ILPoint[]
  currentFeeAPR: number
}

export interface ILPerStrategy {
  strategyId:      string
  strategyName:    string
  rangeMinPercent: number
  rangeMaxPercent: number
  currentFeeAPR:   number
  points:          ILDataPoint[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRICE_MULTIPLIERS = [0.1, 0.2, 0.5, 0.7, 0.9, 1.1, 1.25, 1.5, 2, 3, 5, 10]

// ── V3 Concentrated-range IL Formula ─────────────────────────────────────────
//
// Derived from Uniswap V3 whitepaper, properly normalized so IL(r=1) = 0.
//
// At entry price P₀ = 1 (normalized), range [a, b]:
//   norm  = 2 - √a - 1/√b          (LP value at entry, per unit liquidity)
//   v_LP  = 2·√r - √a - r/√b       (in-range LP value)
//   v_hold = r·(1 - 1/√b) + (1 - √a) (hold portfolio value = same as norm at r=1)
//   IL    = v_LP / v_hold - 1
//
// Out of range (clamped position):
//   Below lower (√r ≤ √a): position is 100% token0
//     v_LP = (1/√a - 1/√b) · r
//   Above upper (√r ≥ √b): position is 100% token1
//     v_LP = √b - √a
//
// Ref: Spinoglio 2024, backtesting ETH/USDC Uniswap V3
// ─────────────────────────────────────────────────────────────────────────────

function calcV3DataPoint(
  r: number,              // priceMultiplier = currentPrice / entryPrice
  rangeMinPercent: number,
  rangeMaxPercent: number,
  feeAPR: number,
): ILDataPoint {
  // Handle full-range (passive) by clamping to near-infinite bounds
  const a = rangeMinPercent <= -99 ? 0.000001 : Math.max(1 + rangeMinPercent / 100, 0.000001)
  const b = rangeMaxPercent >= 899 ? 1_000_000 : 1 + rangeMaxPercent / 100

  const sqrtR = Math.sqrt(r)
  const sqrtA = Math.sqrt(a)
  const sqrtB = Math.sqrt(b)

  const vHold = r * (1 - 1 / sqrtB) + (1 - sqrtA)

  let ilPercent: number
  let inRange: boolean
  let token0Percent: number
  let token1Percent: number

  if (sqrtR <= sqrtA) {
    // Below lower bound — 100% token0
    const vLP = (1 / sqrtA - 1 / sqrtB) * r
    ilPercent = vHold > 0 ? (vLP / vHold - 1) * 100 : 0
    inRange = false
    token0Percent = 100
    token1Percent = 0

  } else if (sqrtR >= sqrtB) {
    // Above upper bound — 100% token1
    const vLP = sqrtB - sqrtA
    ilPercent = vHold > 0 ? (vLP / vHold - 1) * 100 : 0
    inRange = false
    token0Percent = 0
    token1Percent = 100

  } else {
    // In range
    const vLP = 2 * sqrtR - sqrtA - r / sqrtB
    ilPercent = vHold > 0 ? (vLP / vHold - 1) * 100 : 0
    inRange = true

    // Token0 value (in token1 terms) vs total LP value
    const xVal = (1 / sqrtR - 1 / sqrtB) * r
    const yVal = sqrtR - sqrtA
    const total = xVal + yVal
    token0Percent = total > 0 ? Math.round((xVal / total) * 100) : 50
    token1Percent = 100 - token0Percent
  }

  const dailyFeeRate = feeAPR / 365
  const feeOffsetDays = dailyFeeRate > 0
    ? (ilPercent < 0 ? Math.abs(ilPercent) / dailyFeeRate : 0)
    : -1

  return {
    priceMultiplier:    r,
    priceChangePercent: parseFloat(((r - 1) * 100).toFixed(1)),
    ilPercent:          parseFloat(ilPercent.toFixed(2)),
    feeOffsetDays:      parseFloat(feeOffsetDays.toFixed(1)),
    inRange,
    token0Percent,
    token1Percent,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Legacy endpoint — full-range IL curve for /api/analysis/:chain/:address/il.
 * Uses the V3 formula with full-range bounds (equivalent to V2 formula).
 */
export function calculateIL(input: ILAnalyzerInput): ILAnalyzerResult {
  const { poolId, feeAPR } = input
  const context = { method: 'calculateIL', poolId }

  try {
    const points: ILPoint[] = PRICE_MULTIPLIERS.map((r) => {
      const dp = calcV3DataPoint(r, -100, 900, feeAPR)
      return {
        priceMultiplier: r,
        ilPercent:       dp.ilPercent,
        feeOffsetDays:   dp.feeOffsetDays,
      }
    })
    return { points, currentFeeAPR: feeAPR }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

/**
 * Returns IL data points for a specific concentrated-range strategy.
 */
export function calculateStrategyIL(params: {
  poolId: string
  feeAPR: number
  rangeMinPercent: number
  rangeMaxPercent: number
}): ILDataPoint[] {
  const { poolId, feeAPR, rangeMinPercent, rangeMaxPercent } = params
  const context = { method: 'calculateStrategyIL', poolId, rangeMinPercent, rangeMaxPercent }

  try {
    return PRICE_MULTIPLIERS.map((r) =>
      calcV3DataPoint(r, rangeMinPercent, rangeMaxPercent, feeAPR),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

/**
 * Returns IL data for all 4 strategies — used by /api/analysis/:chain/:address/il-simulator.
 */
export function calculateILForAllStrategies(params: {
  poolId: string
  feeAPR: number
  strategies: Array<{
    id: string
    name: string
    rangeMinPercent: number
    rangeMaxPercent: number
  }>
}): ILPerStrategy[] {
  const { poolId, feeAPR, strategies } = params
  const context = { method: 'calculateILForAllStrategies', poolId }

  try {
    return strategies.map((s) => ({
      strategyId:      s.id,
      strategyName:    s.name,
      rangeMinPercent: s.rangeMinPercent,
      rangeMaxPercent: s.rangeMaxPercent,
      currentFeeAPR:   feeAPR,
      points:          calculateStrategyIL({ poolId, feeAPR, rangeMinPercent: s.rangeMinPercent, rangeMaxPercent: s.rangeMaxPercent }),
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}
