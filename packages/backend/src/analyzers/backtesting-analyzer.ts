import type { StoredDayData } from '../db/duckdb-store.ts'
import type { Strategy } from './strategy-advisor.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BacktestResult {
  strategyId:                string
  periodDays:                number
  totalFeesUSD:              number
  totalILPercent:            number
  totalGasCostEstimateUSD:   number
  netPnlPercent:             number    // fees% - |IL%| - gasCosts% rispetto a capitaleLocked
  hodlReturnPercent:         number    // ritorno se avessi solo tenuto i token
  timeInRangePercent:        number    // % del tempo con prezzo nel range
  rebalancingCount:          number
  rebalancingWarning:        string | null
}

// ── Gas cost per chain (stima) ────────────────────────────────────────────────

const GAS_COST_PER_REBALANCING: Record<string, number> = {
  ethereum: 15,    // ~$15 su mainnet
  arbitrum:  0.5,  // ~$0.50 su L2
  base:      0.5,
  polygon:   0.5,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Conta rebalancing simulati con soglia di prezzo (strategia 'on-10pct-move'). */
function countRebalancingsOnMove(dayDatas: StoredDayData[], threshold = 0.1): number {
  if (dayDatas.length === 0) return 0
  let count   = 0
  let refPrice = dayDatas[0].close

  for (const d of dayDatas.slice(1)) {
    if (refPrice > 0 && Math.abs(d.close / refPrice - 1) >= threshold) {
      count++
      refPrice = d.close
    }
  }
  return count
}

/** % del tempo in cui il close price del giorno era nel range definito dalla strategia. */
function calcTimeInRange(
  dayDatas: StoredDayData[],
  entryPrice: number,
  rangeMinPercent: number,
  rangeMaxPercent: number,
): number {
  if (dayDatas.length === 0) return 0

  // Per full-range passiva (-100%, +900%) è sempre in range
  const priceMin = rangeMinPercent <= -99
    ? 0
    : entryPrice * (1 + rangeMinPercent / 100)
  const priceMax = rangeMaxPercent >= 899
    ? Infinity
    : entryPrice * (1 + rangeMaxPercent / 100)

  const inRange = dayDatas.filter((d) => d.close >= priceMin && d.close <= priceMax).length
  return parseFloat(((inRange / dayDatas.length) * 100).toFixed(1))
}

// ── Core backtesting ──────────────────────────────────────────────────────────

function backtestStrategy(
  strategy: Strategy,
  periodData: StoredDayData[],
  periodDays: number,
  chain: string,
): BacktestResult {
  if (periodData.length === 0) {
    return {
      strategyId:              strategy.id,
      periodDays,
      totalFeesUSD:            0,
      totalILPercent:          0,
      totalGasCostEstimateUSD: 0,
      netPnlPercent:           0,
      hodlReturnPercent:       0,
      timeInRangePercent:      0,
      rebalancingCount:        0,
      rebalancingWarning:      null,
    }
  }

  // Dati in ordine cronologico (getDayDatas ritorna desc)
  const chronological = [...periodData].reverse()

  const entryDay  = chronological[0]
  const exitDay   = chronological[chronological.length - 1]
  const entryPrice = entryDay.close
  const exitPrice  = exitDay.close

  // ── Fees ────────────────────────────────────────────────────────────────
  // poolDayDatas.feesUSD is the TOTAL pool fee revenue for the pool.
  // We express it as % of TVL (poolFeesPercent = totalFees / initialTVL * 100).
  // Since pool TVL already reflects all concentrated positions, this ratio is
  // the average return per dollar of TVL. We scale by time-in-range only.
  const totalPoolFeesUSD = chronological.reduce((acc, d) => acc + d.feesUSD, 0)

  // ── IL al prezzo finale (calcolo diretto, senza snap ai punti fissi) ─────
  const priceMultiplier = entryPrice > 0 ? exitPrice / entryPrice : 1
  const { ilPercent: totalILPercent } = (() => {
    const a = strategy.rangeMinPercent <= -99 ? 0.000001 : Math.max(1 + strategy.rangeMinPercent / 100, 0.000001)
    const b = strategy.rangeMaxPercent >= 899 ? 1_000_000 : 1 + strategy.rangeMaxPercent / 100
    const r = priceMultiplier
    const sqrtR = Math.sqrt(r)
    const sqrtA = Math.sqrt(a)
    const sqrtB = Math.sqrt(b)
    const vHold = r * (1 - 1 / sqrtB) + (1 - sqrtA)
    let vLP: number
    if (sqrtR <= sqrtA)       vLP = (1 / sqrtA - 1 / sqrtB) * r
    else if (sqrtR >= sqrtB)  vLP = sqrtB - sqrtA
    else                      vLP = 2 * sqrtR - sqrtA - r / sqrtB
    return { ilPercent: vHold > 0 ? parseFloat(((vLP / vHold - 1) * 100).toFixed(2)) : 0 }
  })()

  // ── Rebalancing ─────────────────────────────────────────────────────────
  const rebalancingCount = (() => {
    switch (strategy.rebalancingFrequency) {
      case 'never':         return 0
      case 'monthly':       return Math.max(0, Math.floor(periodDays / 30))
      case 'on-10pct-move': return countRebalancingsOnMove(chronological)
    }
  })()

  // ── Gas ─────────────────────────────────────────────────────────────────
  const gasPerRebalancing      = GAS_COST_PER_REBALANCING[chain] ?? 0.5
  const totalGasCostEstimateUSD = rebalancingCount * gasPerRebalancing

  // ── Hodl return ─────────────────────────────────────────────────────────
  const hodlReturnPercent = entryPrice > 0
    ? parseFloat(((exitPrice / entryPrice - 1) * 100).toFixed(2))
    : 0

  // ── Time in range ────────────────────────────────────────────────────────
  const timeInRangePercent = calcTimeInRange(
    chronological,
    entryPrice,
    strategy.rangeMinPercent,
    strategy.rangeMaxPercent,
  )

  // ── Net PnL ─────────────────────────────────────────────────────────────
  // Utilizziamo il TVL del primo giorno come base per esprimere i valori in %
  const initialTvlUSD = entryDay.tvlUSD > 0 ? entryDay.tvlUSD : 1
  const poolFeesPercent = (totalPoolFeesUSD / initialTvlUSD) * 100

  // Fee return = pool-level feesPercent × time-in-range fraction.
  //
  // NOTE: poolFeesPercent = totalPoolFees / poolTVL already represents the average
  // return per dollar of TVL in the pool. Since the pool's TVL already reflects
  // all LPs' concentrated positions, multiplying by an additional concentration
  // factor would double-count the concentration advantage.
  //
  // The concentration benefit is already embedded in the pool-level fee/TVL ratio:
  // concentrated LPs earn more fees but also contribute more virtual liquidity,
  // which is reflected in the pool's TVL and fee distribution.
  const feesPercent = poolFeesPercent * (timeInRangePercent / 100)
  const totalFeesUSD = parseFloat(((feesPercent / 100) * initialTvlUSD).toFixed(2))

  const gasCostPct    = (totalGasCostEstimateUSD / initialTvlUSD) * 100
  // totalILPercent è già negativo; sottraiamo in valore assoluto
  const netPnlPercent = parseFloat((feesPercent + totalILPercent - gasCostPct).toFixed(2))

  // ── Warning rebalancing frequente ────────────────────────────────────────
  // Ricerca reale: rebalancing frequente moltiplica IL x5 aumentando fee solo x1.5
  const rebalancingWarning: string | null =
    rebalancingCount > 2 && periodDays <= 30
      ? `${rebalancingCount} riposizionamenti in ${periodDays}gg: IL potenzialmente 5x, fee solo 1.5x (Spinoglio 2024)`
      : null

  return {
    strategyId:              strategy.id,
    periodDays,
    totalFeesUSD:            parseFloat(totalFeesUSD.toFixed(2)),
    totalILPercent,
    totalGasCostEstimateUSD: parseFloat(totalGasCostEstimateUSD.toFixed(2)),
    netPnlPercent,
    hodlReturnPercent,
    timeInRangePercent,
    rebalancingCount,
    rebalancingWarning,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface BacktestInput {
  poolId:     string
  chain:      string
  dayDatas:   StoredDayData[]   // fino a 90 giorni, desc (come viene da DuckDB)
  strategies: Strategy[]
}

/**
 * Esegue il backtesting di tutte le strategie sui periodi 7, 30, 90 giorni.
 * Utilizza solo i dati già in DuckDB — nessuna chiamata API.
 */
export function runBacktest(input: BacktestInput): BacktestResult[] {
  const { poolId, chain, dayDatas, strategies } = input
  const context = { method: 'runBacktest', poolId, chain }
  const PERIODS = [7, 30, 90]

  try {
    // dayDatas è desc: i più recenti per primi
    const results: BacktestResult[] = []

    for (const periodDays of PERIODS) {
      const slice = dayDatas.slice(0, periodDays)  // prendi gli ultimi N giorni

      for (const strategy of strategies) {
        results.push(backtestStrategy(strategy, slice, periodDays, chain))
      }
    }

    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}
