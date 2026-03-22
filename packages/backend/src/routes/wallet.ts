import { Router } from 'express'
import { GraphFetcher, GraphFetcherV4 } from '../fetchers/graph-fetcher.ts'
import type { WalletPosition } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS } from '../cache/cache-manager.ts'
import {
  getUncollectedFeesBatchV3,
  getUncollectedFeesBatchV4,
  resolveV4TokenIds,
} from '../fetchers/onchain-fetcher.ts'

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

/**
 * Computes current token amounts in a concentrated liquidity position from
 * the position's liquidity, the pool's sqrtPriceX96, and the tick bounds.
 *
 * Uniswap V3 whitepaper §6.3:
 *   sqrtPrice  = sqrtPriceX96 / 2^96
 *   sqrtLower  = 1.0001^(tickLower/2)
 *   sqrtUpper  = 1.0001^(tickUpper/2)
 *
 *   If currentTick < tickLower (below range → all token0):
 *     amount0 = L × (1/sqrtLower − 1/sqrtUpper)
 *     amount1 = 0
 *   If currentTick ≥ tickUpper (above range → all token1):
 *     amount0 = 0
 *     amount1 = L × (sqrtUpper − sqrtLower)
 *   If in range:
 *     amount0 = L × (1/sqrtPrice − 1/sqrtUpper)
 *     amount1 = L × (sqrtPrice − sqrtLower)
 *
 * Returns human-readable amounts (divided by 10^decimals).
 */
function currentAmounts(
  liquidity: string,
  sqrtPriceX96: string,
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  decimals0: number,
  decimals1: number,
): { amount0: number; amount1: number } {
  const L = parseFloat(liquidity)
  if (L === 0) return { amount0: 0, amount1: 0 }

  const sqrtPrice = parseFloat(sqrtPriceX96) / (2 ** 96)
  const sqrtLower = Math.pow(1.0001, tickLower / 2)
  const sqrtUpper = Math.pow(1.0001, tickUpper / 2)

  let raw0 = 0
  let raw1 = 0

  if (currentTick < tickLower) {
    // Below range: 100% token0
    raw0 = L * (1 / sqrtLower - 1 / sqrtUpper)
  } else if (currentTick >= tickUpper) {
    // Above range: 100% token1
    raw1 = L * (sqrtUpper - sqrtLower)
  } else {
    // In range
    raw0 = L * (1 / sqrtPrice - 1 / sqrtUpper)
    raw1 = L * (sqrtPrice - sqrtLower)
  }

  return {
    amount0: raw0 / Math.pow(10, decimals0),
    amount1: raw1 / Math.pow(10, decimals1),
  }
}

/** Enriches a raw WalletPosition with computed fields and a version tag. */
function enrichPosition(
  p: WalletPosition,
  version: 'v3' | 'v4',
  ethPriceUSD: number,
  uncollected: { owed0: bigint; owed1: bigint } = { owed0: 0n, owed1: 0n },
) {
  const { net0, net1 } = netAmounts(p)
  const tickLower = parseInt(p.tickLower.tickIdx)
  const tickUpper = parseInt(p.tickUpper.tickIdx)
  const currentTick = parseInt(p.pool.tick)
  const dec0 = p.pool.token0.decimals
  const dec1 = p.pool.token1.decimals
  const decimals0 = parseInt(dec0)
  const decimals1 = parseInt(dec1)
  const isOpen = p.liquidity !== '0'

  // Token USD prices: derivedETH × ethPriceUSD
  const token0PriceUSD = parseFloat(p.pool.token0.derivedETH ?? '0') * ethPriceUSD
  const token1PriceUSD = parseFloat(p.pool.token1.derivedETH ?? '0') * ethPriceUSD

  // Current amounts based on liquidity + price (what the position actually holds now)
  const current = currentAmounts(p.liquidity, p.pool.sqrtPrice, tickLower, tickUpper, currentTick, decimals0, decimals1)

  // Initial capital = what was deposited
  const initialToken0 = parseFloat(p.depositedToken0)
  const initialToken1 = parseFloat(p.depositedToken1)

  // USD values
  const initialValueUSD = initialToken0 * token0PriceUSD + initialToken1 * token1PriceUSD
  const currentValueUSD = current.amount0 * token0PriceUSD + current.amount1 * token1PriceUSD

  const uncollected0 = Number(uncollected.owed0) / Math.pow(10, decimals0)
  const uncollected1 = Number(uncollected.owed1) / Math.pow(10, decimals1)
  const uncollectedFeesUSD = uncollected0 * token0PriceUSD + uncollected1 * token1PriceUSD

  const collected0 = parseFloat(p.collectedFeesToken0)
  const collected1 = parseFloat(p.collectedFeesToken1)
  const collectedFeesUSD = collected0 * token0PriceUSD + collected1 * token1PriceUSD

  // Impermanent Loss: compare (current LP value) vs (HODL value of initial deposit)
  // Both valued in token1 terms using the current price.
  const currentPrice = priceAtTick(currentTick, dec0, dec1)
  const currentValueInToken1  = current.amount0 * currentPrice + current.amount1
  const hodlValueInToken1     = initialToken0 * currentPrice + initialToken1

  // IL% = (LP value / HODL value - 1) × 100
  let ilPercent: number | null = null
  if (isOpen && hodlValueInToken1 > 0) {
    ilPercent = ((currentValueInToken1 / hodlValueInToken1) - 1) * 100
  }

  return {
    id:               p.id,
    version,
    status:           isOpen ? 'open' as const : 'closed' as const,
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
    inRange:          isOpen ? isInRange(p) : false,
    currentTick,
    // Initial capital
    depositedToken0:  initialToken0,
    depositedToken1:  initialToken1,
    initialValueUSD,
    withdrawnToken0:  parseFloat(p.withdrawnToken0),
    withdrawnToken1:  parseFloat(p.withdrawnToken1),
    // Current amounts (from liquidity + sqrtPrice)
    currentAmount0:   current.amount0,
    currentAmount1:   current.amount1,
    currentValueUSD,
    // Legacy net amounts
    netToken0:        net0,
    netToken1:        net1,
    // Fees
    collectedFees0:   collected0,
    collectedFees1:   collected1,
    collectedFeesUSD,
    uncollectedFees0: uncollected0,
    uncollectedFees1: uncollected1,
    uncollectedFeesUSD,
    // IL
    ilPercent,
    poolTvlUSD:       parseFloat(p.pool.totalValueLockedUSD),
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/wallet/:chain/:address/positions
// Returns all V3 + V4 LP positions (open + closed) for a wallet on a given chain.
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
    const v4Fetcher = V4_CHAINS.has(chain) ? new GraphFetcherV4(chain) : null

    // Query V3, V4, and ETH price in parallel
    const [v3Raw, v4Raw, v4TokenIds, ethPriceUSD] = await Promise.all([
      cache.get(
        CACHE_KEYS.walletPositions(chain, address, 'v3'),
        'POOL',
        () => v3Fetcher.getWalletPositions(address),
      ),
      v4Fetcher
        ? cache.get(
            CACHE_KEYS.walletPositions(chain, address, 'v4'),
            'POOL',
            () => v4Fetcher.getWalletPositions(address),
          )
        : Promise.resolve([] as WalletPosition[]),
      v4Fetcher
        ? v4Fetcher.getWalletTokenIds(address)
        : Promise.resolve([] as string[]),
      v3Fetcher.getEthPriceUSD(),
    ])

    // Split V3 into open/closed
    const openV3   = v3Raw.filter((p) => p.liquidity !== '0')
    const closedV3 = v3Raw.filter((p) => p.liquidity === '0')

    // V4 positions from the event aggregator are already filtered to open (net liq > 0)
    // But we also want to show closed V4 positions from the same event data
    const openV4   = v4Raw.filter((p) => p.liquidity !== '0')

    // ── Compute uncollected fees on-chain ──

    // V3: one batch RPC call per position (5 eth_calls each, batched)
    const v3FeeMap = await getUncollectedFeesBatchV3(chain, openV3.map((p) => ({
      tokenId:     p.id,
      poolAddress: p.pool.id,
      tickLower:   parseInt(p.tickLower.tickIdx),
      tickUpper:   parseInt(p.tickUpper.tickIdx),
      currentTick: parseInt(p.pool.tick),
    })))

    // V4: resolve tokenIds → (poolId, tickLower, tickUpper) via PositionManager storage,
    // then compute fees via PoolManager extsload
    const v4PoolIds = new Set(openV4.map((p) => p.pool.id))
    const v4Resolved = await resolveV4TokenIds(chain, v4TokenIds, v4PoolIds)

    // Match resolved tokenIds to our aggregated V4 positions
    type V4Match = { tokenId: string; positionKey: string }
    const v4Matches = new Map<string, V4Match>()

    for (const info of v4Resolved) {
      const posKey = `${info.poolId}:${info.tickLower}:${info.tickUpper}`
      // Match against open V4 position IDs (format: v4:poolId:tickLower:tickUpper)
      const matchingPos = openV4.find((p) => {
        const tl = parseInt(p.tickLower.tickIdx)
        const tu = parseInt(p.tickUpper.tickIdx)
        return p.pool.id === info.poolId && tl === info.tickLower && tu === info.tickUpper
      })
      if (matchingPos && !v4Matches.has(matchingPos.id)) {
        v4Matches.set(matchingPos.id, { tokenId: info.tokenId, positionKey: posKey })
      }
    }

    const v4FeeInputs = Array.from(v4Matches.entries())
      .map(([posId, match]) => {
        const pos = openV4.find((p) => p.id === posId)!
        return {
          tokenId:   match.tokenId,
          poolId:    pos.pool.id,
          tickLower: parseInt(pos.tickLower.tickIdx),
          tickUpper: parseInt(pos.tickUpper.tickIdx),
          _posId:    posId,
        }
      })

    const v4FeeMap = await getUncollectedFeesBatchV4(
      chain,
      v4FeeInputs.map(({ tokenId, poolId, tickLower, tickUpper }) => ({ tokenId, poolId, tickLower, tickUpper })),
    )

    // Build tokenId → posId lookup for fee assignment
    const v4TokenToPos = new Map(v4FeeInputs.map((f) => [f.tokenId, f._posId]))

    // ── Build enriched positions ──

    const positions = [
      // Open V3 with uncollected fees
      ...openV3.map((p) => {
        const uc = v3FeeMap.get(p.id)
        return enrichPosition(p, 'v3', ethPriceUSD, uc ? { owed0: uc.fees0, owed1: uc.fees1 } : undefined)
      }),
      // Closed V3 (no uncollected fees, but may have collectedFees)
      ...closedV3.map((p) => enrichPosition(p, 'v3', ethPriceUSD)),
      // Open V4 with uncollected fees
      ...openV4.map((p) => {
        // Find the fee result by looking up which tokenId mapped to this position
        const match = v4Matches.get(p.id)
        if (match) {
          const uc = v4FeeMap.get(match.tokenId)
          if (uc) return enrichPosition(p, 'v4', ethPriceUSD, { owed0: uc.fees0, owed1: uc.fees1 })
        }
        return enrichPosition(p, 'v4', ethPriceUSD)
      }),
    ]

    // Sort: open positions first, then closed
    positions.sort((a, b) => {
      if (a.status === 'open' && b.status === 'closed') return -1
      if (a.status === 'closed' && b.status === 'open') return 1
      return 0
    })

    const openPositions   = positions.filter((p) => p.status === 'open')
    const closedPositions = positions.filter((p) => p.status === 'closed')

    res.json({
      chain,
      wallet:     address.toLowerCase(),
      positions,
      totalOpen:    openPositions.length,
      totalClosed:  closedPositions.length,
      inRange:      openPositions.filter((p) => p.inRange).length,
      outOfRange:   openPositions.filter((p) => !p.inRange).length,
      v3Count:      positions.filter((p) => p.version === 'v3').length,
      v4Count:      positions.filter((p) => p.version === 'v4').length,
      lastUpdated:  new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: message })
  }
})

export default router
