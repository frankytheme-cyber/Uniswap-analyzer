// ── Types ────────────────────────────────────────────────────────────────────

export interface ILPoint {
  priceMultiplier: number   // es. 2.0 = prezzo raddoppiato rispetto all'entrata
  ilPercent: number         // sempre ≤ 0 (es. -5.72)
  feeOffsetDays: number     // giorni di fee per coprire l'IL; -1 se feeAPR=0
}

export interface ILAnalyzerInput {
  poolId: string
  feeAPR: number            // già calcolato con calculateFeeApr()
}

export interface ILAnalyzerResult {
  points: ILPoint[]
  currentFeeAPR: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRICE_MULTIPLIERS = [0.1, 0.2, 0.5, 0.75, 0.9, 1.1, 1.25, 1.5, 2, 3, 5, 10]

// ── IL Formula ────────────────────────────────────────────────────────────────

/**
 * Calculates Impermanent Loss percentage for a given price multiplier.
 *
 * Formula: IL = 2√(r) / (1 + r) - 1
 *
 * @param priceMultiplier - ratio of current price to entry price (e.g. 2 = 2x)
 * @returns IL as a percentage (always ≤ 0)
 */
function calculateILPercent(priceMultiplier: number): number {
  const r = priceMultiplier
  return (2 * Math.sqrt(r) / (1 + r) - 1) * 100
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

/**
 * Calculates the Impermanent Loss curve for a set of price multipliers
 * and the number of days of fee income needed to offset each IL value.
 */
export function calculateIL(input: ILAnalyzerInput): ILAnalyzerResult {
  const { poolId, feeAPR } = input
  const context = { method: 'calculateIL', poolId }

  try {
    const dailyFeeRate = feeAPR / 365  // % per day

    const points: ILPoint[] = PRICE_MULTIPLIERS.map((priceMultiplier) => {
      const ilPercent = calculateILPercent(priceMultiplier)

      // feeOffsetDays = |IL%| / dailyFeeRate
      // -1 is the sentinel value for "infinite" (feeAPR = 0)
      const feeOffsetDays = dailyFeeRate > 0
        ? Math.abs(ilPercent) / dailyFeeRate
        : -1

      return { priceMultiplier, ilPercent, feeOffsetDays }
    })

    return { points, currentFeeAPR: feeAPR }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}
