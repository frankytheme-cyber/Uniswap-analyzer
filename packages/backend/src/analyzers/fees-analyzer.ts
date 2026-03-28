import type { PoolDayData, CompetitorPool } from '../fetchers/graph-fetcher.ts'
import type { ParameterScore } from './tvl-analyzer.ts'

// ── Fee APR ───────────────────────────────────────────────────────────────────

export interface FeeAprInput {
  poolId: string
  dayDatas: PoolDayData[]   // ordered desc, up to 365 entries
}

export interface FeeAprResult {
  feeAPR: number
  feesUsd365: number
  avgTvlUsd365: number
  daysAvailable: number
}

/**
 * Calculates annualised fee APR from poolDayDatas.
 * If fewer than 365 days of data exist, extrapolates proportionally.
 */
export function calculateFeeApr(input: FeeAprInput): FeeAprResult {
  const { dayDatas } = input

  if (dayDatas.length === 0) {
    return { feeAPR: 0, feesUsd365: 0, avgTvlUsd365: 0, daysAvailable: 0 }
  }

  const daysAvailable = dayDatas.length
  const feesUsdTotal  = dayDatas.reduce((sum, d) => sum + parseFloat(d.feesUSD), 0)
  const avgTvlUsd     = dayDatas.reduce((sum, d) => sum + parseFloat(d.tvlUSD), 0) / daysAvailable

  if (avgTvlUsd === 0) {
    return { feeAPR: 0, feesUsd365: feesUsdTotal, avgTvlUsd365: 0, daysAvailable }
  }

  // Annualise if fewer than 365 days available
  const annualisedFees = feesUsdTotal * (365 / daysAvailable)
  const feeAPR = (annualisedFees / avgTvlUsd) * 100

  return {
    feeAPR,
    feesUsd365:   annualisedFees,
    avgTvlUsd365: avgTvlUsd,
    daysAvailable,
  }
}

export function analyzeFeeApr(input: FeeAprInput): ParameterScore {
  const context = { method: 'analyzeFeeApr', poolId: input.poolId }
  try {
    const result = calculateFeeApr(input)
    return buildFeeAprScore(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildFeeAprScore(result: FeeAprResult): ParameterScore {
  const { feeAPR, daysAvailable } = result
  const displayValue = `${feeAPR.toFixed(1)}%`
  const extrapolated = daysAvailable < 365 ? ` (estrapolato da ${daysAvailable}gg)` : ''

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  if (feeAPR > 20) {
    score  = 1
    status = 'good'
    detail = `Fee APR ${displayValue}${extrapolated} — rendimento solido per i LP`
  } else if (feeAPR > 10) {
    score  = 0
    status = 'warn'
    detail = `Fee APR ${displayValue}${extrapolated} — rendimento marginale`
  } else {
    score  = 0
    status = 'bad'
    detail = `Fee APR ${displayValue}${extrapolated} — le fee non giustificano il TVL`
  }

  return {
    id:           'fees',
    score,
    value:        feeAPR,
    displayValue,
    label:        'Fee APR',
    status,
    detail,
    rawData: {
      'feesUSD (365d ann.)': `$${result.feesUsd365.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'avgTVL (365d)':       `$${result.avgTvlUsd365.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'giorni disponibili':  result.daysAvailable,
      'feeAPR':              displayValue,
    },
  }
}

// ── Competitive Fee/TVL ───────────────────────────────────────────────────────

export interface CompetitiveInput {
  poolId: string
  poolFeeApr: number
  competitors: CompetitorPool[]
}

/**
 * Compares the pool's feeAPR against the median of comparable pools (same feeTier).
 * Competitor feeAPR is approximated from their 24h data (feesUSD / totalValueLockedUSD * 365).
 */
export function analyzeCompetitiveFees(input: CompetitiveInput): ParameterScore {
  const context = { method: 'analyzeCompetitiveFees', poolId: input.poolId }
  try {
    const { poolFeeApr, competitors } = input

    // Annualise competitor feeAPR based on pool age.
    // Filter out pools younger than 30 days — their extrapolated APR is too noisy
    // (e.g. a 1-day pool would get its fees multiplied by 365x).
    const MIN_AGE_DAYS = 30
    const nowSecs = Date.now() / 1000
    const competitorAprs = competitors
      .map((p) => {
        const tvl = parseFloat(p.totalValueLockedUSD)
        const fees = parseFloat(p.feesUSD)
        if (tvl <= 0 || fees <= 0) return 0
        const ageDays = Math.max((nowSecs - parseInt(p.createdAtTimestamp, 10)) / 86400, 1)
        if (ageDays < MIN_AGE_DAYS) return 0
        const annualisedFees = fees * (365 / ageDays)
        return (annualisedFees / tvl) * 100
      })
      .filter((apr) => apr > 0)

    if (competitorAprs.length === 0) {
      return {
        id:           'competitive',
        score:        0,
        value:        0,
        displayValue: 'N/D',
        label:        'Fee Competitiva?',
        status:       'warn',
        detail:       'Nessun dato comparativo disponibile',
      }
    }

    const medianApr    = median(competitorAprs)
    const relativeScore = medianApr > 0 ? poolFeeApr / medianApr : 0

    return buildCompetitiveScore(relativeScore, poolFeeApr, medianApr, competitorAprs.length)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildCompetitiveScore(
  relativeScore: number,
  poolFeeApr: number,
  medianApr: number,
  competitorCount: number,
): ParameterScore {
  const displayValue = `${relativeScore.toFixed(2)}x`

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  if (relativeScore > 1.2) {
    score  = 1
    status = 'good'
    detail = `Fee APR ${poolFeeApr.toFixed(1)}% vs mediana ${medianApr.toFixed(1)}% — pool più efficiente del mercato`
  } else if (relativeScore > 0.8) {
    score  = 0
    status = 'warn'
    detail = `Fee APR in linea con la mediana (${medianApr.toFixed(1)}%)`
  } else {
    score  = 0
    status = 'bad'
    detail = `Fee APR sotto la mediana di mercato (${medianApr.toFixed(1)}%)`
  }

  return {
    id:           'competitive',
    score,
    value:        relativeScore,
    displayValue,
    label:        'Fee Competitiva?',
    status,
    detail,
    rawData: {
      'feeAPR pool':         `${poolFeeApr.toFixed(2)}%`,
      'mediana competitor':  `${medianApr.toFixed(2)}%`,
      'n. competitor':       competitorCount,
      'relativeScore':       displayValue,
    },
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}
