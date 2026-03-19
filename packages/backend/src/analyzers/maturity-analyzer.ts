import type { Pool, PoolDayData } from '../fetchers/graph-fetcher.ts'
import type { ParameterScore } from './tvl-analyzer.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MaturityAnalyzerInput {
  pool: Pool
  dayDatas: PoolDayData[]   // poolDayDatas (up to 365 days, ordered desc)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0

  const n    = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  if (mean === 0) return 0  // all zeros → no variation

  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  return Math.sqrt(variance) / mean
}

function daysSinceTimestamp(unixSeconds: string): number {
  const created = parseInt(unixSeconds, 10) * 1000
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
}

// ── Analyzer ─────────────────────────────────────────────────────────────────

export function analyzeMaturity(input: MaturityAnalyzerInput): ParameterScore {
  const context = { method: 'analyzeMaturity', poolId: input.pool.id }
  try {
    const { pool, dayDatas } = input

    const ageDays      = daysSinceTimestamp(pool.createdAtTimestamp)
    const daysAnalyzed = dayDatas.length

    // Daily fee APR: (feesUSD / tvlUSD) * 365 * 100
    const dailyFeeAprs = dayDatas
      .map((d) => {
        const tvl = parseFloat(d.tvlUSD)
        const fee = parseFloat(d.feesUSD)
        return tvl > 0 ? (fee / tvl) * 365 * 100 : 0
      })

    const dailyVolumes = dayDatas.map((d) => parseFloat(d.volumeUSD))
    const dailyTvls    = dayDatas.map((d) => parseFloat(d.tvlUSD))

    const cvFeeApr = coefficientOfVariation(dailyFeeAprs)
    const cvVolume = coefficientOfVariation(dailyVolumes)
    const cvTvl    = coefficientOfVariation(dailyTvls)

    return buildScore(ageDays, daysAnalyzed, cvFeeApr, cvVolume, cvTvl)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildScore(
  ageDays: number,
  daysAnalyzed: number,
  cvFeeApr: number,
  cvVolume: number,
  cvTvl: number,
): ParameterScore {
  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  // Scoring logic
  if (ageDays < 30) {
    score  = 0
    status = 'bad'
    detail = `Pool creata solo ${ageDays} giorni fa — dati insufficienti per valutare stabilità`
  } else if (ageDays < 180) {
    if (cvFeeApr < 0.5 && cvVolume < 1.0 && cvTvl < 0.3) {
      score  = 0
      status = 'warn'
      detail = `Pool giovane (${ageDays}gg) ma metriche stabili — monitorare nel tempo`
    } else {
      score  = 0
      status = 'warn'
      detail = `Pool giovane (${ageDays}gg) con metriche variabili — alto rischio`
    }
  } else {
    // Mature pool (> 180 days) — evaluate stability
    if (cvFeeApr < 0.5 && cvVolume < 1.0 && cvTvl < 0.3) {
      score  = 1
      status = 'good'
      detail = `Pool matura (${ageDays}gg) con rendimenti stabili e TVL consistente`
    } else if (cvFeeApr < 1.0 && cvVolume < 1.5) {
      score  = 0
      status = 'warn'
      detail = `Pool matura (${ageDays}gg) ma metriche moderatamente variabili (CV fee: ${cvFeeApr.toFixed(2)})`
    } else {
      score  = 0
      status = 'bad'
      detail = `Pool matura (${ageDays}gg) con rendimenti molto instabili (CV fee: ${cvFeeApr.toFixed(2)}, CV volume: ${cvVolume.toFixed(2)})`
    }
  }

  // Display value: combine age and stability into a readable format
  const stabilityLabel = cvFeeApr < 0.5 ? 'stabile' : cvFeeApr < 1.0 ? 'variabile' : 'instabile'
  const displayValue = `${ageDays}gg — ${stabilityLabel}`

  return {
    id:    'maturity',
    score,
    value: ageDays,
    displayValue,
    label: 'Maturità Pool',
    status,
    detail,
    rawData: {
      'etàGiorni':       ageDays,
      'giorniAnalizzati': daysAnalyzed,
      'cvFeeAPR':         cvFeeApr.toFixed(3),
      'cvVolume':         cvVolume.toFixed(3),
      'cvTVL':            cvTvl.toFixed(3),
    },
  }
}
