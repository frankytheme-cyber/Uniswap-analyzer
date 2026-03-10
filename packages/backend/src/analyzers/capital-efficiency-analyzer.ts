import type { PoolHourData } from '../fetchers/graph-fetcher.ts'
import type { ParameterScore, PoolType } from './tvl-analyzer.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CapitalEfficiencyInput {
  poolId: string
  hourDatas: PoolHourData[]   // ultimi 168h (7 giorni), ordered desc
  poolType: PoolType
  // Opzionale: range di prezzo personalizzato dell'utente
  priceRangePercent?: number  // es. 0.05 = ±5%
}

export interface CapitalEfficiencyResult {
  inRangeRatio: number
  hoursInRange: number
  totalHours: number
  tickLower: number
  tickUpper: number
  currentTick: number
}

// ── Default price ranges ──────────────────────────────────────────────────────

const DEFAULT_RANGE_PERCENT: Record<PoolType, number> = {
  stablecoin: 0.01,   // ±1%
  major:      0.05,   // ±5%
  altcoin:    0.10,   // ±10%
}

// ── Tick ↔ Price conversion ───────────────────────────────────────────────────

/**
 * Converte un price range percentuale in tick lower/upper.
 * Formula: tick = floor(log(price) / log(1.0001))
 *
 * currentTick rappresenta il prezzo P = 1.0001^tick
 * priceMin = P * (1 - rangePercent)
 * priceMax = P * (1 + rangePercent)
 */
function priceRangeToTicks(
  currentTick: number,
  rangePercent: number,
): { tickLower: number; tickUpper: number } {
  const LOG_BASE = Math.log(1.0001)

  // Prezzo corrente implicito dal tick
  const currentPrice = Math.pow(1.0001, currentTick)
  const priceMin     = currentPrice * (1 - rangePercent)
  const priceMax     = currentPrice * (1 + rangePercent)

  const tickLower = Math.floor(Math.log(priceMin) / LOG_BASE)
  const tickUpper = Math.floor(Math.log(priceMax) / LOG_BASE)

  return { tickLower, tickUpper }
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export function analyzeCapitalEfficiency(input: CapitalEfficiencyInput): ParameterScore {
  const context = { method: 'analyzeCapitalEfficiency', poolId: input.poolId }
  try {
    const { hourDatas, poolType, priceRangePercent } = input

    if (hourDatas.length === 0) {
      return noDataScore()
    }

    const rangePercent = priceRangePercent ?? DEFAULT_RANGE_PERCENT[poolType]

    // Usa il tick più recente come riferimento per il calcolo del range
    const currentTick  = parseInt(hourDatas[0].tick, 10)
    const { tickLower, tickUpper } = priceRangeToTicks(currentTick, rangePercent)

    let hoursInRange = 0
    for (const hour of hourDatas) {
      const tick = parseInt(hour.tick, 10)
      if (tick >= tickLower && tick <= tickUpper) {
        hoursInRange++
      }
    }

    const totalHours    = hourDatas.length
    const inRangeRatio  = hoursInRange / totalHours

    const result: CapitalEfficiencyResult = {
      inRangeRatio,
      hoursInRange,
      totalHours,
      tickLower,
      tickUpper,
      currentTick,
    }

    return buildScore(result, poolType, rangePercent)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildScore(
  result: CapitalEfficiencyResult,
  poolType: PoolType,
  rangePercent: number,
): ParameterScore {
  const { inRangeRatio, hoursInRange, totalHours } = result
  const pct          = (inRangeRatio * 100).toFixed(1)
  const rangePct     = (rangePercent * 100).toFixed(0)
  const displayValue = `${pct}%`

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  if (inRangeRatio > 0.75) {
    score  = 1
    status = 'good'
    detail = `${pct}% del tempo in range ±${rangePct}% (${hoursInRange}/${totalHours}h) — ${poolType}`
  } else if (inRangeRatio > 0.50) {
    score  = 0
    status = 'warn'
    detail = `${pct}% del tempo in range ±${rangePct}% — capitale spesso fuori range`
  } else {
    score  = 0
    status = 'bad'
    detail = `Solo ${pct}% del tempo in range ±${rangePct}% — bassa efficienza capitale`
  }

  return {
    id:           'efficiency',
    score,
    value:        inRangeRatio,
    displayValue,
    label:        'Efficienza Capitale V3',
    status,
    detail,
    rawData: {
      'ore in range':  `${result.hoursInRange}h`,
      'ore totali':    `${result.totalHours}h`,
      'range ±':       `${(rangePercent * 100).toFixed(0)}%`,
      'tick corrente': result.currentTick,
    },
  }
}

function noDataScore(): ParameterScore {
  return {
    id:           'efficiency',
    score:        0,
    value:        0,
    displayValue: 'N/D',
    label:        'Efficienza Capitale V3',
    status:       'warn',
    detail:       'Dati orari non disponibili',
  }
}
