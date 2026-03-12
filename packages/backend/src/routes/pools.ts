import { Router } from 'express'
import { GraphFetcher, GraphFetcherV4, detectPoolVersion } from '../fetchers/graph-fetcher.ts'
import { cache, CACHE_KEYS } from '../cache/cache-manager.ts'

const router = Router()

// GET /api/pools/:chain/:address  — raw pool data
router.get('/:chain/:address', async (req, res) => {
  const { chain, address } = req.params
  const poolId = address.toLowerCase()
  const context = { route: 'GET /pools/:chain/:address', chain, poolId }

  try {
    const version = detectPoolVersion(poolId)
    const fetcher = version === 'v4' ? new GraphFetcherV4(chain) : new GraphFetcher(chain)
    const pool = await cache.get(
      CACHE_KEYS.pool(chain, poolId),
      'POOL',
      () => fetcher.getPool(poolId),
    )
    res.json(pool)
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
