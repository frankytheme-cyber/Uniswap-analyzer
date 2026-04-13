import { Router } from 'express'
import { getAavePosition } from '../fetchers/aave-fetcher.ts'

const router = Router()

// GET /api/aave/wallet/:address
router.get('/wallet/:address', async (req, res) => {
  const { address } = req.params

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: 'Invalid wallet address format (expected 0x + 40 hex)' })
    return
  }

  try {
    const position = await getAavePosition(address)
    res.json(position)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context: `GET /api/aave/wallet/${address}`, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: 'Failed to fetch Aave position', detail: message })
  }
})

export default router
