import type { PoolDayData } from '../fetchers/graph-fetcher.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Strategy {
  id:                   'passive' | 'narrow' | 'asymmetric-up' | 'defensive'
  name:                 string
  regime:               'any' | 'sideways' | 'bullish' | 'bearish'
  rangeMinPercent:      number   // es. -10 → priceMin = currentPrice * 0.90
  rangeMaxPercent:      number   // es. +10 → priceMax = currentPrice * 1.10
  description:          string
  risks:                string[]
  rebalancingFrequency: 'never' | 'monthly' | 'on-10pct-move'
}

export interface StrategyAdvisorInput {
  poolId:   string
  dayDatas: PoolDayData[]   // ultimi 30 giorni, desc
}

export interface StrategyAnalysis {
  detectedRegime:      'bullish' | 'bearish' | 'sideways'
  ema7:                number
  ema30:               number
  volatility30d:       number    // annualised stddev of log-returns * 100
  recommendedStrategy: Strategy
  allStrategies:       Strategy[]
}

// ── Strategies (basate su ricerca Spinoglio 2024, backtesting ETH/USDC) ───────

export const ALL_STRATEGIES: Strategy[] = [
  {
    id:                   'passive',
    name:                 'Full Range (Passiva)',
    regime:               'any',
    rangeMinPercent:      -100,
    rangeMaxPercent:      900,
    description:          'Liquidità su tutto il range, come Uniswap V2. Fee basse ma IL minimo e nessun rischio di uscita dal range.',
    risks:                [
      'Fee molto inferiori rispetto alle strategie concentrate',
      'Capitale meno efficiente — gran parte rimane inattiva',
    ],
    rebalancingFrequency: 'never',
  },
  {
    id:                   'narrow',
    name:                 'Range Stretto',
    regime:               'sideways',
    rangeMinPercent:      -10,
    rangeMaxPercent:      10,
    description:          'Range ±10% dal prezzo corrente. Massimizza le fee in mercati laterali, ma richiede riposizionamento frequente.',
    risks:                [
      'Alta probabilità di uscire dal range con variazioni > 10%',
      'IL elevato se fuori range per lungo tempo',
      'Richiede monitoraggio e riposizionamento frequente',
    ],
    rebalancingFrequency: 'on-10pct-move',
  },
  {
    id:                   'asymmetric-up',
    name:                 'Asimmetrica Rialzista',
    regime:               'bullish',
    rangeMinPercent:      0,
    rangeMaxPercent:      40,
    description:          'Range da 0% a +40% dal prezzo corrente. Cattura il rialzo senza esposizione al ribasso immediato.',
    risks:                [
      'Posizione 100% token1 se prezzo supera +40%',
      'Nessuna liquidità fornita se prezzo scende sotto l\'entry',
      'Fee azzerate quando fuori range',
    ],
    rebalancingFrequency: 'monthly',
  },
  {
    id:                   'defensive',
    name:                 'Difensiva',
    regime:               'bearish',
    rangeMinPercent:      -40,
    rangeMaxPercent:      30,
    description:          'Range ampio -40%/+30%. Resiste a correzioni moderate e rimane in range il più a lungo possibile.',
    risks:                [
      'IL più alto per effetto della concentrazione asimmetrica',
      'Meno efficiente in mercati fortemente rialzisti',
    ],
    rebalancingFrequency: 'monthly',
  },
]

// ── EMA & Volatility ──────────────────────────────────────────────────────────

/** Exponential Moving Average su serie di prezzi (ordine cronologico). */
function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  for (let i = 0; i < prices.length; i++) {
    result.push(i === 0 ? prices[0] : prices[i] * k + result[i - 1] * (1 - k))
  }
  return result
}

/** Volatilità annualizzata (stddev log-returns × √365 × 100). */
function annualisedVol(prices: number[]): number {
  if (prices.length < 2) return 0
  const logRet = prices.slice(1).map((p, i) => Math.log(p / prices[i]))
  const mean   = logRet.reduce((a, b) => a + b, 0) / logRet.length
  const variance = logRet.reduce((acc, r) => acc + (r - mean) ** 2, 0) / logRet.length
  return Math.sqrt(variance) * Math.sqrt(365) * 100
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export function analyzeStrategy(input: StrategyAdvisorInput): StrategyAnalysis {
  const { poolId, dayDatas } = input
  const context = { method: 'analyzeStrategy', poolId }

  try {
    // dayDatas è desc → invertiamo per ordine cronologico
    const chronological = [...dayDatas].reverse()

    const prices = chronological.map((d) => parseFloat(d.close))

    // EMA sul token0Price (close)
    const ema7values  = ema(prices, 7)
    const ema30values = ema(prices, 30)

    const lastEma7  = ema7values[ema7values.length - 1] ?? 0
    const lastEma30 = ema30values[ema30values.length - 1] ?? 0

    // Rilevamento regime
    let detectedRegime: 'bullish' | 'bearish' | 'sideways'
    if (lastEma7 > lastEma30 * 1.02) {
      detectedRegime = 'bullish'
    } else if (lastEma7 < lastEma30 * 0.98) {
      detectedRegime = 'bearish'
    } else {
      detectedRegime = 'sideways'
    }

    const vol30d = annualisedVol(prices)

    // Seleziona la strategia raccomandata: prima quella con regime corrispondente, poi 'any'
    const match = ALL_STRATEGIES.find((s) => s.regime === detectedRegime)
    const recommendedStrategy = match ?? ALL_STRATEGIES.find((s) => s.regime === 'any')!

    return {
      detectedRegime,
      ema7:                parseFloat(lastEma7.toFixed(6)),
      ema30:               parseFloat(lastEma30.toFixed(6)),
      volatility30d:       parseFloat(vol30d.toFixed(1)),
      recommendedStrategy,
      allStrategies:       ALL_STRATEGIES,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}
