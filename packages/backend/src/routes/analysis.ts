import { Router } from 'express'
import { runAnalysis } from '../services/analysis-service.ts'
import { cache, CACHE_KEYS } from '../cache/cache-manager.ts'
import { db } from '../db/duckdb-store.ts'
import { GraphFetcher } from '../fetchers/graph-fetcher.ts'
import { calculateFeeApr } from '../analyzers/fees-analyzer.ts'
import { calculateIL } from '../analyzers/il-analyzer.ts'

const router = Router()

// GET /api/analysis/:chain/:address  — tutti e 6 i parametri calcolati
router.get('/:chain/:address', async (req, res) => {
  const { chain, address } = req.params
  const context = { route: 'GET /analysis/:chain/:address', chain, address }

  try {
    const analysis = await runAnalysis(chain, address)
    res.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    const status = message.includes('Unsupported chain') || message.includes('not found') ? 400 : 500
    res.status(status).json({ error: message })
  }
})

// GET /api/analysis/:chain/:address/history?days=30  — dati storici per grafici
router.get('/:chain/:address/history', async (req, res) => {
  const { chain, address } = req.params
  const days  = Math.min(parseInt(req.query['days'] as string ?? '30', 10), 365)
  const poolId = address.toLowerCase()
  const context = { route: 'GET /analysis/:chain/:address/history', chain, poolId, days }

  try {
    // Prova prima dal DB locale
    const stored = await db.getDayDatas(chain, poolId, days)

    if (stored.length >= days) {
      res.json(stored)
      return
    }

    // Fallback: fetch dal subgraph e persisti
    const fetcher  = new GraphFetcher(chain)
    const dayDatas = await cache.get(
      CACHE_KEYS.dayDatas(chain, poolId, days),
      'DAY_DATAS',
      () => fetcher.getPoolDayDatas(poolId, days),
    )
    await db.upsertDayDatas(chain, poolId, dayDatas)
    res.json(dayDatas)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: message })
  }
})

// POST /api/refresh/:chain/:address  — forza refresh manuale
router.post('/refresh/:chain/:address', async (req, res) => {
  const { chain, address } = req.params
  const poolId = address.toLowerCase()

  cache.invalidatePool(chain, poolId)

  try {
    const analysis = await runAnalysis(chain, address)
    res.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context: { route: 'POST /refresh', chain, poolId }, timestamp: new Date().toISOString() }))
    res.status(500).json({ error: message })
  }
})

// GET /api/analysis/:chain/:address/il  — curva IL + giorni fee per coprirlo
router.get('/:chain/:address/il', async (req, res) => {
  const { chain, address } = req.params
  const poolId = address.toLowerCase()
  const context = { route: 'GET /analysis/:chain/:address/il', chain, poolId }

  try {
    const fetcher  = new GraphFetcher(chain)
    const dayDatas = await cache.get(
      CACHE_KEYS.dayDatas(chain, poolId, 365),
      'DAY_DATAS',
      () => fetcher.getPoolDayDatas(poolId, 365),
    )

    const { feeAPR } = calculateFeeApr({ poolId, dayDatas })
    const result     = calculateIL({ poolId, feeAPR })
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    const status = message.includes('Unsupported chain') || message.includes('not found') ? 400 : 500
    res.status(status).json({ error: message })
  }
})

export default router
