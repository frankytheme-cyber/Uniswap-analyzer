import { Router } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../db/duckdb-store.ts'

const router = Router()

// GET /api/watchlist
router.get('/', async (_req, res) => {
  try {
    const watchlist = await db.getWatchlist()
    res.json(watchlist)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context: 'GET /watchlist', timestamp: new Date().toISOString() }))
    res.status(500).json({ error: 'Failed to fetch watchlist' })
  }
})

// POST /api/watchlist  { chain, address }
router.post('/', async (req, res) => {
  const { chain, address } = req.body as { chain?: string; address?: string }

  if (!chain || !address) {
    res.status(400).json({ error: 'Missing required fields: chain, address' })
    return
  }

  const validChains = ['ethereum', 'arbitrum', 'base', 'polygon']
  if (!validChains.includes(chain)) {
    res.status(400).json({ error: `Invalid chain. Must be one of: ${validChains.join(', ')}` })
    return
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: 'Invalid pool address format' })
    return
  }

  try {
    const id = randomUUID()
    await db.addToWatchlist(id, chain, address)
    res.status(201).json({ id, chain, address: address.toLowerCase() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context: 'POST /watchlist', timestamp: new Date().toISOString() }))
    res.status(500).json({ error: 'Failed to add to watchlist' })
  }
})

// DELETE /api/watchlist/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await db.removeFromWatchlist(id)
    res.status(204).send()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context: `DELETE /watchlist/${id}`, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: 'Failed to remove from watchlist' })
  }
})

export default router
