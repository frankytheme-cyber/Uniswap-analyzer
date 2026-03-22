import { Router } from 'express'
import { GraphFetcher, GraphFetcherV4 } from '../fetchers/graph-fetcher.ts'
import type { WalletPosition } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS } from '../cache/cache-manager.ts'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUPPORTED_CHAINS = ['ethereum', 'arbitrum', 'base', 'polygon']

// Chains that have a V4 subgraph deployed (Arbitrum not yet available)
const V4_CHAINS = new Set(['ethereum', 'base', 'polygon'])

/**
 * Calculates the price of token0 in terms of token1 at a given tick.
 * Formula: price = 1.0001^tick × 10^(decimals0 - decimals1)
 */
function priceAtTick(tick: number, decimals0: string, decimals1: string): number {
  const rawPrice = Math.pow(1.0001, tick)
  const decAdj   = Math.pow(10, parseInt(decimals0) - parseInt(decimals1))
  return rawPrice * decAdj
}

/** Returns true if the position's current tick is within [tickLower, tickUpper). */
function isInRange(position: WalletPosition): boolean {
  const currentTick = parseInt(position.pool.tick)
  const lower       = parseInt(position.tickLower.tickIdx)
  const upper       = parseInt(position.tickUpper.tickIdx)
  return currentTick >= lower && currentTick < upper
}

/** Net token amounts still in the position (deposited - withdrawn). */
function netAmounts(position: WalletPosition): { net0: number; net1: number } {
  const net0 = parseFloat(position.depositedToken0) - parseFloat(position.withdrawnToken0)
  const net1 = parseFloat(position.depositedToken1) - parseFloat(position.withdrawnToken1)
  return { net0, net1 }
}

/** Enriches a raw WalletPosition with computed fields and a version tag. */
function enrichPosition(p: WalletPosition, version: 'v3' | 'v4') {
  const { net0, net1 } = netAmounts(p)
  const tickLower = parseInt(p.tickLower.tickIdx)
  const tickUpper = parseInt(p.tickUpper.tickIdx)
  const dec0 = p.pool.token0.decimals
  const dec1 = p.pool.token1.decimals

  return {
    id:               p.id,
    version,
    poolId:           p.pool.id,
    token0:           p.pool.token0.symbol,
    token1:           p.pool.token1.symbol,
    feeTier:          parseInt(p.pool.feeTier),
    feeTierPercent:   parseInt(p.pool.feeTier) / 10000,
    tickLower,
    tickUpper,
    priceLower:       priceAtTick(tickLower, dec0, dec1),
    priceUpper:       priceAtTick(tickUpper, dec0, dec1),
    liquidity:        p.liquidity,
    inRange:          isInRange(p),
    currentTick:      parseInt(p.pool.tick),
    depositedToken0:  parseFloat(p.depositedToken0),
    depositedToken1:  parseFloat(p.depositedToken1),
    withdrawnToken0:  parseFloat(p.withdrawnToken0),
    withdrawnToken1:  parseFloat(p.withdrawnToken1),
    netToken0:        net0,
    netToken1:        net1,
    collectedFees0:   parseFloat(p.collectedFeesToken0),
    collectedFees1:   parseFloat(p.collectedFeesToken1),
    poolTvlUSD:       parseFloat(p.pool.totalValueLockedUSD),
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/wallet/:chain/:address/positions
// Returns all open V3 + V4 LP positions for a wallet on a given chain.
router.get('/:chain/:address/positions', async (req, res) => {
  const { chain, address } = req.params
  const context = { route: 'GET /wallet/:chain/:address/positions', chain, address }

  if (!SUPPORTED_CHAINS.includes(chain)) {
    res.status(400).json({ error: `Unsupported chain: ${chain}. Supported: ${SUPPORTED_CHAINS.join(', ')}` })
    return
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: 'Invalid wallet address format (expected 0x + 40 hex chars)' })
    return
  }

  try {
    const v3Fetcher = new GraphFetcher(chain)

    // Query V3 and V4 in parallel; V4 returns [] if chain not supported
    const [v3Raw, v4Raw] = await Promise.all([
      cache.get(
        CACHE_KEYS.walletPositions(chain, address, 'v3'),
        'POOL',
        () => v3Fetcher.getWalletPositions(address),
      ),
      V4_CHAINS.has(chain)
        ? cache.get(
            CACHE_KEYS.walletPositions(chain, address, 'v4'),
            'POOL',
            () => new GraphFetcherV4(chain).getWalletPositions(address),
          )
        : Promise.resolve([] as WalletPosition[]),
    ])

    // Filter closed positions (liquidity = "0") and enrich
    const positions = [
      ...v3Raw.filter((p) => p.liquidity !== '0').map((p) => enrichPosition(p, 'v3')),
      ...v4Raw.filter((p) => p.liquidity !== '0').map((p) => enrichPosition(p, 'v4')),
    ]

    res.json({
      chain,
      wallet:     address.toLowerCase(),
      positions,
      totalOpen:  positions.length,
      inRange:    positions.filter((p) => p.inRange).length,
      outOfRange: positions.filter((p) => !p.inRange).length,
      v3Count:    positions.filter((p) => p.version === 'v3').length,
      v4Count:    positions.filter((p) => p.version === 'v4').length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: message })
  }
})

export default router
