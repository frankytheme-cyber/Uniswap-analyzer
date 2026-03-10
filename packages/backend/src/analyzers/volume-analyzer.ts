import type { Swap } from '../fetchers/graph-fetcher.ts'
import type { ParameterScore } from './tvl-analyzer.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface VolumeAnalyzerInput {
  poolId: string
  swaps: Swap[]          // ultimi 500 swap (ultimi 24h o window configurabile)
  volumeUsd24h: number   // da poolDayDatas[0].volumeUSD o pool.volumeUSD snapshot
}

export interface VolumeAnalyzerResult {
  volumePerWallet: number
  uniqueWallets: number
  hhi: number            // Herfindahl-Hirschman Index (0-1)
  totalVolumeUsd: number
}

// ── HHI Calculation ───────────────────────────────────────────────────────────

/**
 * Herfindahl-Hirschman Index — misura la concentrazione degli swap per wallet.
 * HHI → 0: volume distribuito (organico)
 * HHI → 1: un wallet domina (sospetto wash trading)
 *
 * walletShare_i = volumeUSD_i / totalVolumeUSD
 * HHI = Σ(walletShare_i²)
 */
function calculateHhi(swaps: Swap[]): { hhi: number; uniqueWallets: number; totalVolumeUsd: number } {
  if (swaps.length === 0) {
    return { hhi: 0, uniqueWallets: 0, totalVolumeUsd: 0 }
  }

  // Aggrega volume per sender
  const volumeBySender = new Map<string, number>()
  for (const swap of swaps) {
    const volume = parseFloat(swap.amountUSD)
    if (isNaN(volume) || volume <= 0) continue
    const current = volumeBySender.get(swap.sender) ?? 0
    volumeBySender.set(swap.sender, current + volume)
  }

  const uniqueWallets  = volumeBySender.size
  const totalVolumeUsd = Array.from(volumeBySender.values()).reduce((sum, v) => sum + v, 0)

  if (totalVolumeUsd === 0) {
    return { hhi: 0, uniqueWallets, totalVolumeUsd: 0 }
  }

  let hhi = 0
  for (const walletVolume of volumeBySender.values()) {
    const share = walletVolume / totalVolumeUsd
    hhi += share * share
  }

  return { hhi, uniqueWallets, totalVolumeUsd }
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export function analyzeVolume(input: VolumeAnalyzerInput): ParameterScore {
  const context = { method: 'analyzeVolume', poolId: input.poolId }
  try {
    const { swaps, volumeUsd24h } = input
    const { hhi, uniqueWallets, totalVolumeUsd } = calculateHhi(swaps)

    // volumePerWallet: usa il volume reale dagli swap se disponibile, altrimenti il 24h snapshot
    const effectiveVolume    = totalVolumeUsd > 0 ? totalVolumeUsd : volumeUsd24h
    const effectiveWallets   = uniqueWallets > 0 ? uniqueWallets : 1
    const volumePerWallet    = effectiveVolume / effectiveWallets

    const result: VolumeAnalyzerResult = {
      volumePerWallet,
      uniqueWallets,
      hhi,
      totalVolumeUsd: effectiveVolume,
    }

    return buildScore(result, input.poolId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    throw error
  }
}

function buildScore(result: VolumeAnalyzerResult, _poolId: string): ParameterScore {
  const { volumePerWallet, hhi, uniqueWallets } = result
  const hhiDisplay = hhi.toFixed(3)
  const vpwDisplay = volumePerWallet >= 1000
    ? `$${(volumePerWallet / 1000).toFixed(1)}k`
    : `$${volumePerWallet.toFixed(0)}`

  let score: 0 | 1
  let status: 'good' | 'warn' | 'bad'
  let detail: string

  if (volumePerWallet > 5000 && hhi < 0.15) {
    score  = 1
    status = 'good'
    detail = `Volume organico — ${uniqueWallets} wallet, HHI ${hhiDisplay}, ${vpwDisplay}/wallet`
  } else if (volumePerWallet > 1000 && hhi < 0.30) {
    score  = 0
    status = 'warn'
    detail = `Volume parzialmente concentrato — HHI ${hhiDisplay}, ${vpwDisplay}/wallet`
  } else {
    score  = 0
    status = 'bad'
    detail = hhi >= 0.30
      ? `Possibile wash trading — HHI ${hhiDisplay} (alta concentrazione)`
      : `Volume basso per wallet — ${vpwDisplay}/wallet su ${uniqueWallets} wallet`
  }

  return {
    id:           'volume',
    score,
    value:        hhi,
    displayValue: `HHI ${hhiDisplay}`,
    label:        'Volume Organico?',
    status,
    detail,
    rawData: {
      'wallet unici':    uniqueWallets,
      'volume totale':   `$${result.totalVolumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'vol/wallet':      vpwDisplay,
      'HHI':             hhiDisplay,
    },
  }
}
