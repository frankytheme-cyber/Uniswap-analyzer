import { Router } from 'express'
import { GraphFetcher, GraphFetcherV4, detectPoolVersion } from '../fetchers/graph-fetcher.ts'
import type { Pool } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS } from '../cache/cache-manager.ts'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

const STABLECOINS = new Set([
  'USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'LUSD', 'CRVUSD', 'USDE', 'PYUSD', 'USDS',
])

/**
 * Derives the price of token0 in terms of token1 from the pool's sqrtPriceX96.
 * Formula: price = (sqrtPrice / 2^96)^2 × 10^(decimals0 - decimals1)
 */
function priceFromSqrtPrice(sqrtPrice: string, decimals0: string, decimals1: string): number {
  // Use BigInt for the large integers, then convert to float at the end
  const Q96 = 79_228_162_514_264_337_593_543_950_336n
  const sp   = BigInt(sqrtPrice)
  // Compute ratio with enough precision: multiply numerator by 10^18 before dividing
  const PRECISION = 10n ** 18n
  const ratioScaled = (sp * PRECISION) / Q96        // sqrtPrice/2^96, scaled ×10^18
  const ratio        = Number(ratioScaled) / 1e18
  const rawPrice     = ratio * ratio                 // (sqrtPrice/2^96)²
  const decAdj       = Math.pow(10, parseInt(decimals0) - parseInt(decimals1))
  return rawPrice * decAdj
}

/**
 * Computes a reliable USD TVL using on-chain token amounts and the sqrtPrice-derived price.
 * Only accurate when at least one token is a known stablecoin ≈ $1.
 * Returns null for non-stable pairs (would need an external oracle).
 */
function computeRealTvl(
  pool: Pool,
  price0In1: number,
): { tvlUSD: number; priceToken0USD: number } | null {
  const sym0 = pool.token0.symbol.toUpperCase().replace(/^W/, '') // WETH → ETH
  const sym1 = pool.token1.symbol.toUpperCase().replace(/^W/, '')

  const isStable0 = STABLECOINS.has(pool.token0.symbol.toUpperCase()) || STABLECOINS.has(sym0)
  const isStable1 = STABLECOINS.has(pool.token1.symbol.toUpperCase()) || STABLECOINS.has(sym1)

  const amt0 = parseFloat(pool.totalValueLockedToken0)
  const amt1 = parseFloat(pool.totalValueLockedToken1)

  if (isStable1) {
    // token1 ≈ $1 → price0 in USD = price0In1
    return { tvlUSD: amt0 * price0In1 + amt1, priceToken0USD: price0In1 }
  }

  if (isStable0) {
    // token0 ≈ $1 → price1 in USD = 1/price0In1
    const price1USD = 1 / price0In1
    return { tvlUSD: amt0 + amt1 * price1USD, priceToken0USD: 1 }
  }

  return null // non-stable pair — skip
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/pools/:chain/:address  — raw pool data enriched with 24h metrics
router.get('/:chain/:address', async (req, res) => {
  const { chain, address } = req.params
  const poolId = address.toLowerCase()
  const context = { route: 'GET /pools/:chain/:address', chain, poolId }

  try {
    const version = detectPoolVersion(poolId)
    const fetcher = version === 'v4' ? new GraphFetcherV4(chain) : new GraphFetcher(chain)

    // Fetch pool + last 2 days in parallel (yesterday is the most complete day)
    const [pool, dayDatas] = await Promise.all([
      cache.get(
        CACHE_KEYS.pool(chain, poolId),
        'POOL',
        () => fetcher.getPool(poolId),
      ),
      cache.get(
        CACHE_KEYS.dayDatas(chain, poolId, 2),
        'DAY_DATAS',
        () => fetcher.getPoolDayDatas(poolId, 2),
      ),
    ])

    // ── On-chain price from sqrtPrice ──────────────────────────────────────
    const price0In1 = priceFromSqrtPrice(
      pool.sqrtPrice,
      pool.token0.decimals,
      pool.token1.decimals,
    )

    // ── Real TVL from token amounts + on-chain price ───────────────────────
    const tvlCalc = computeRealTvl(pool, price0In1)

    // ── 24h metrics from yesterday's dayData ──────────────────────────────
    // dayDatas[0] = today (incomplete), dayDatas[1] = yesterday (complete)
    // Use yesterday's data; fall back to today if yesterday is missing
    const dayData = dayDatas[1] ?? dayDatas[0] ?? null

    const volume24hUSD = dayData ? parseFloat(dayData.volumeUSD) : null
    const fees24hUSD   = dayData ? parseFloat(dayData.feesUSD)   : null
    const tvlDay       = dayData ? parseFloat(dayData.tvlUSD)    : null

    // Fee APR: prefer real TVL from sqrtPrice, fall back to subgraph day TVL
    const tvlForApr = tvlCalc?.tvlUSD ?? tvlDay
    const feeAPR24h = (fees24hUSD && tvlForApr && tvlForApr > 0)
      ? (fees24hUSD / tvlForApr) * 365 * 100
      : null

    res.json({
      ...pool,
      // On-chain derived price
      priceToken0InToken1: price0In1,
      // TVL computed from actual token amounts + sqrtPrice (more accurate than subgraph totalValueLockedUSD)
      tvlUSDReal: tvlCalc?.tvlUSD   ?? null,
      priceToken0USD:      tvlCalc?.priceToken0USD ?? null,
      // 24h metrics
      volume24hUSD,
      fees24hUSD,
      feeAPR24h,
      // Raw day data for reference
      latestDayData: dayData,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    const status = message.includes('Unsupported chain') ? 400 : 500
    res.status(status).json({ error: message })
  }
})

// GET /api/pools/:chain/:address/ticks  — distribuzione liquidità per tick
router.get('/:chain/:address/ticks', async (req, res) => {
  const { chain, address } = req.params
  const poolId = address.toLowerCase()
  const context = { route: 'GET /pools/:chain/:address/ticks', chain, poolId }

  try {
    const version = detectPoolVersion(poolId)
    const fetcher = version === 'v4' ? new GraphFetcherV4(chain) : new GraphFetcher(chain)
    const ticks = await cache.get(
      CACHE_KEYS.ticks(chain, poolId),
      'TICKS',
      () => fetcher.getPoolTicks(poolId),
    )
    res.json(ticks)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: message })
  }
})

export default router
