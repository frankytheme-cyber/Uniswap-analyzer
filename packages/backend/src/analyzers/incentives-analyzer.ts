import type { PoolDayData } from '../fetchers/graph-fetcher.ts'
import type { ParameterScore } from './tvl-analyzer.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface IncentivesAnalyzerInput {
  poolId: string
  dayDatas: PoolDayData[]   // ordered desc, ultimi 90 giorni
}

export interface IncentivesAnalyzerResult {
  spikeCount: number
  correlation: number       // Pearson r tra TVL e fee
  spikeDates: number[]      // timestamp dei giorni con spike
  zeroVariance: boolean     // true se TVL o fee costanti (pool stabile, non anomala)
}

// ── Spike Detection ───────────────────────────────────────────────────────────

const SPIKE_THRESHOLD = 0.5   // +50% TVL in 24h

/**
 * Rileva giorni in cui il TVL è aumentato di più del 50% rispetto al giorno precedente.
 * dayDatas è ordered desc → invertiamo per avere ordine cronologico.
 */
function detectSpikes(dayDatas: PoolDayData[]): { count: number; dates: number[] } {
  const chronological = [...dayDatas].reverse()
  const dates: number[] = []

  for (let i = 1; i < chronological.length; i++) {
    const prevTvl = parseFloat(chronological[i - 1].tvlUSD)
    const currTvl = parseFloat(chronological[i].tvlUSD)

    if (prevTvl <= 0) continue

    const changePct = (currTvl - prevTvl) / prevTvl
    if (changePct > SPIKE_THRESHOLD) {
      dates.push(chronological[i].date)
    }
  }

  return { count: dates.length, dates }
}

// ── Pearson Correlation ───────────────────────────────────────────────────────

/**
 * Calcola la correlazione di Pearson tra due serie numeriche.
 * r → 1:  correlazione positiva (TVL alto → fee alte, segnale sano)
 * r → 0:  nessuna correlazione (segnale anomalo — possibili incentivi esterni)
 */
interface PearsonResult {
  r: number
  zeroVariance: boolean  // true if one or both series have zero variance
}

function pearsonR(xs: number[], ys: number[]): PearsonResult {
  const n = xs.length
  if (n < 2) return { r: 0, zeroVariance: true }

  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let numerator   = 0
  let denomX      = 0
  let denomY      = 0

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    numerator += dx * dy
    denomX    += dx * dx
    denomY    += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)
  if (denominator === 0) return { r: 0, zeroVariance: true }
  return { r: numerator / denominator, zeroVariance: false }
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export function analyzeIncentives(input: IncentivesAnalyzerInput): ParameterScore {
  const context = { method: 'analyzeIncentives', poolId: input.poolId }
  try {
    const { dayDatas } = input

    if (dayDatas.length < 7) {
      return noDataScore()
    }

    const { count: spikeCount, dates: spikeDates } = detectSpikes(dayDatas)

    const tvlSeries  = dayDatas.map((d) => parseFloat(d.tvlUSD))
    const feeSeries  = dayDatas.map((d) => parseFloat(d.feesUSD))
    const { r: correlation, zeroVariance } = pearsonR(tvlSeries, feeSeries)

    const result: IncentivesAnalyzerResult = { spikeCount, correlation, spikeDates, zeroVariance }

    return buildScore(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildScore(result: IncentivesAnalyzerResult): ParameterScore {
  const { spikeCount, correlation, spikeDates, zeroVariance } = result
  const corrDisplay = correlation.toFixed(2)
  const displayValue = `r=${corrDisplay}`

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  // Zero-variance: TVL e/o fee costanti → pool stabile, non anomala
  if (zeroVariance && spikeCount === 0) {
    score  = 1
    status = 'good'
    detail = 'TVL e fee costanti nel periodo — nessun segnale di incentivi artificiali'
  } else if (spikeCount === 0 && correlation > 0.6) {
    score  = 1
    status = 'good'
    detail = `Nessuno spike TVL, correlazione TVL-fee ${corrDisplay} — fee organiche`
  } else if (spikeCount <= 2 && (correlation > 0.4 || zeroVariance)) {
    score  = 0
    status = 'warn'
    detail = `${spikeCount} spike TVL rilevati, correlazione ${corrDisplay} — monitorare`
  } else {
    const reason = correlation <= 0.4 && !zeroVariance
      ? `correlazione TVL-fee bassa (${corrDisplay})`
      : `${spikeCount} spike TVL rilevati`
    score  = 0
    status = 'bad'
    detail = `Possibili incentivi artificiali — ${reason}`
  }

  return {
    id:           'incentives',
    score,
    value:        correlation,
    displayValue,
    label:        'Incentivi Artificiali?',
    status,
    detail,
    rawData: {
      'Pearson r (TVL-fee)': corrDisplay,
      'spike TVL rilevati':  spikeCount,
      'giorni analizzati':   result.spikeDates.length > 0
        ? `${result.spikeDates.length} spike su 90gg`
        : '90gg',
    },
    ...(spikeDates.length > 0 && { spikeDates }),
  } as ParameterScore
}

function noDataScore(): ParameterScore {
  return {
    id:           'incentives',
    score:        0,
    value:        0,
    displayValue: 'N/D',
    label:        'Incentivi Artificiali?',
    status:       'warn',
    detail:       'Dati insufficienti (minimo 7 giorni)',
  }
}
