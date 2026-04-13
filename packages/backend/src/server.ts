import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Cerca .env nella root del monorepo (due livelli su da packages/backend/src/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { db } from './db/duckdb-store.ts'
import { cache } from './cache/cache-manager.ts'
import { runAnalysis } from './services/analysis-service.ts'
import poolsRouter    from './routes/pools.ts'
import analysisRouter from './routes/analysis.ts'
import watchlistRouter  from './routes/watchlist.ts'
import discoveryRouter  from './routes/discovery.ts'
import walletRouter     from './routes/wallet.ts'
import lidoRouter       from './routes/lido.ts'
import aaveRouter       from './routes/aave.ts'

const app  = express()
const PORT = process.env.PORT ?? 3001
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL_MINUTES ?? '15', 10)

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }))
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/pools',     poolsRouter)
app.use('/api/analysis',  analysisRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api/discover',  discoveryRouter)
app.use('/api/wallet',    walletRouter)
app.use('/api/lido',      lidoRouter)
app.use('/api/aave',      aaveRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    cache:     cache.stats(),
    timestamp: new Date().toISOString(),
  })
})

// ── Cron: refresh watchlist ogni N minuti ─────────────────────────────────────

cron.schedule(`*/${REFRESH_INTERVAL} * * * *`, async () => {
  const log = (msg: string, extra?: object) =>
    console.log(JSON.stringify({ message: msg, ...extra, timestamp: new Date().toISOString() }))

  log('Cron: starting watchlist refresh')
  const watchlist = await db.getWatchlist()

  for (const entry of watchlist) {
    try {
      cache.invalidatePool(entry.chain, entry.address)
      await runAnalysis(entry.chain, entry.address)
      // Rispetta rate limit The Graph: fetch sequenziale con delay
      await new Promise((r) => setTimeout(r, 200))
      log('Cron: refreshed pool', { chain: entry.chain, address: entry.address })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(JSON.stringify({ error: message, context: { chain: entry.chain, address: entry.address }, timestamp: new Date().toISOString() }))
    }
  }

  log('Cron: watchlist refresh complete', { pools: watchlist.length })
})

// ── Cache warm-up: pre-fetch all watchlist pools on startup ───────────────────

async function warmupCache(): Promise<void> {
  const log = (msg: string, extra?: object) =>
    console.log(JSON.stringify({ message: msg, ...extra, timestamp: new Date().toISOString() }))

  const watchlist = await db.getWatchlist()
  if (watchlist.length === 0) return

  log('Warm-up: pre-fetching watchlist pools', { pools: watchlist.length })

  for (const entry of watchlist) {
    try {
      await runAnalysis(entry.chain, entry.address)
      await new Promise((r) => setTimeout(r, 500))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(JSON.stringify({ error: message, context: { warmup: true, chain: entry.chain, address: entry.address }, timestamp: new Date().toISOString() }))
    }
  }

  log('Warm-up: complete', { pools: watchlist.length })
}

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  await db.init()
  app.listen(PORT, () => {
    console.log(JSON.stringify({
      message:  `Backend running on port ${PORT}`,
      refresh:  `Every ${REFRESH_INTERVAL} minutes`,
      timestamp: new Date().toISOString(),
    }))
  })
  // Warm up cache after startup (non-blocking, errors are logged not thrown)
  setTimeout(() => warmupCache().catch(() => {}), 5000)
}

start().catch((err) => {
  console.error(JSON.stringify({ error: String(err), timestamp: new Date().toISOString() }))
  process.exit(1)
})
