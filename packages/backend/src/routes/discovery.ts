import { Router } from 'express'
import { discoverTopPools } from '../services/discovery-service.ts'

const router = Router()

// GET /api/discover/:chain?limit=10&minTvl=100000
router.get('/:chain', async (req, res) => {
  const { chain } = req.params
  const limit    = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 10, 1), 50)
  const minTvl   = Math.max(parseFloat(req.query.minTvl as string) || 100_000, 0)
  const context  = { route: 'GET /discover/:chain', chain, limit, minTvl }

  try {
    const result = await discoverTopPools(chain, limit, minTvl)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    const status = message.includes('Unsupported chain') ? 400 : 500
    res.status(status).json({ error: message })
  }
})

export default router
