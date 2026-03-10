# Progress Log — Sessioni di Sviluppo

## Come usare questo file
Aggiorna questo file a fine di ogni sessione Claude Code con:
- Cosa è stato completato
- Decisioni tecniche prese
- TODO per la prossima sessione

---

## Sessione 1 — Setup
**Data:** 2026-03-04
**Obiettivo:** Monorepo setup + graph-fetcher base

### Completato
- [x] package.json root con workspaces (npm workspaces, concurrently)
- [x] tsconfig.json root (base config ES2022/NodeNext)
- [x] packages/backend/package.json + tsconfig.json (tsx watch, ESM)
- [x] packages/frontend/package.json + tsconfig.json + vite.config.ts
- [x] packages/backend/src/fetchers/graph-fetcher.ts (6 query GraphQL, paginazione ticks)
- [x] packages/backend/src/cache/cache-manager.ts (TTL per tipo, invalidatePool, singleton)
- [x] .env.example

### Decisioni tecniche
- `graphql-request` per le query GraphQL (leggero, no Apollo overhead)
- `tsx watch` per dev del backend (no build step in development)
- Frontend proxy `/api` → `localhost:3001` configurato in vite.config.ts
- `getPoolTicks` pagina automaticamente in batch da 1000 (The Graph limit)
- `cache` esportato come singleton — tutti i moduli importano la stessa istanza
- TTL come costanti esplicite in secondi (non dipende dalla env var CACHE_TTL_MINUTES per poter variare per tipo di dato)

### TODO prossima sessione
- packages/backend/src/analyzers/tvl-analyzer.ts
- packages/backend/src/analyzers/fees-analyzer.ts

---

## Sessione 2 — Analyzers Core
**Data:** 2026-03-04
**Obiettivo:** TVL + Fees analyzers

### Completato
- [x] packages/backend/src/analyzers/tvl-analyzer.ts (AVL/TVL ratio, bigint per liquidità, range per pool type)
- [x] packages/backend/src/analyzers/fees-analyzer.ts (feeAPR annualizzato, analyzeCompetitiveFees con mediana)
- [x] ParameterScore interface condivisa (definita in tvl-analyzer.ts, importata dagli altri)

### Decisioni tecniche
- `BigInt` per i valori di liquidità (evita overflow con numeri grandi)
- feeAPR annualizzato proporzionalmente se pool ha meno di 365 giorni di dati
- Competitor feeAPR approssimato da `feesUSD / totalValueLockedUSD * 100` (dati all-time del subgraph)
- `getPoolType` e `ParameterScore` in tvl-analyzer.ts come punto di riferimento condiviso

### TODO prossima sessione
- volume-analyzer.ts (HHI wash trading detection) ✓ — fatto in sessione 3
- capital-efficiency-analyzer.ts (% tempo in-range su 168h) ✓ — fatto in sessione 3

---

## Sessione 3 — Analyzers Volume + Capital Efficiency
**Data:** 2026-03-04
**Obiettivo:** volume-analyzer + capital-efficiency-analyzer

### Completato
- [x] packages/backend/src/analyzers/volume-analyzer.ts (HHI per wash trading, volumePerWallet)
- [x] packages/backend/src/analyzers/capital-efficiency-analyzer.ts (% tempo in-range, conversione tick↔price)

### Decisioni tecniche
- HHI aggregato per `swap.sender` (non recipient) — il sender è chi inizia lo swap
- `volumePerWallet` usa il volume dagli swap se disponibile, altrimenti fallback su `volumeUsd24h` snapshot
- Range in-range calcolato sul tick più recente come riferimento (non su un tick fisso storico)
- Conversione price→tick: `floor(log(price) / log(1.0001))` — formula ufficiale Uniswap V3

### TODO prossima sessione
- incentives-analyzer.ts ✓ — fatto in sessione 4
- routes/ ✓ — fatto in sessione 4
- duckdb-store.ts ✓ — fatto in sessione 4

---

## Sessione 4 — Incentives + Routes + DB
**Data:** 2026-03-04
**Obiettivo:** Ultimo analyzer + API routes + DuckDB + cron scheduler

### Completato
- [x] packages/backend/src/analyzers/incentives-analyzer.ts (spike +50%, Pearson correlation)
- [x] packages/backend/src/db/duckdb-store.ts (upsert, getDayDatas, watchlist CRUD)
- [x] packages/backend/src/services/analysis-service.ts (orchestrazione tutti e 6 gli analyzer)
- [x] packages/backend/src/routes/pools.ts (GET /api/pools/:chain/:address)
- [x] packages/backend/src/routes/analysis.ts (GET analysis, GET history, POST refresh)
- [x] packages/backend/src/routes/watchlist.ts (GET/POST/DELETE /api/watchlist)
- [x] packages/backend/src/server.ts aggiornato (tutte le route + cron scheduler)

### Decisioni tecniche
- `analysis-service.ts` usa Promise.all per fetch paralleli (pool, ticks, hourDatas, swaps, dayDatas)
- DuckDB: history route controlla prima il DB locale, fa fetch solo se mancano dati
- Cron: fetch sequenziale con delay 200ms tra pool (rispetta rate limit The Graph)
- Validazione address: regex `0x[0-9a-fA-F]{40}` nel watchlist route
- DB_PATH env var per configurare path DuckDB (default :memory: in dev)

### TODO prossima sessione
- Frontend ✓ — fatto in sessione 5

---

## Sessione 5 — Frontend Dashboard
**Data:** 2026-03-04
**Obiettivo:** Scaffolding frontend + Dashboard + PoolDetail

### Completato
- [x] index.html, src/main.tsx, src/index.css (Tailwind dark theme)
- [x] tailwind.config.js, postcss.config.js
- [x] src/types.ts (ParameterScore, PoolAnalysis, WatchlistEntry, DayData)
- [x] src/stores/watchlist-store.ts (Zustand + persist)
- [x] src/hooks/usePoolData.ts (TanStack Query: watchlist, analysis, history, refresh)
- [x] src/App.tsx (routing semplice Dashboard ↔ PoolDetail senza react-router)
- [x] src/pages/Dashboard.tsx (PoolTable + PoolCard grid)
- [x] src/pages/PoolDetail.tsx (header + ScoreMatrix + refresh)
- [x] src/components/dashboard/PoolTable.tsx (add/remove watchlist con validazione)
- [x] src/components/dashboard/PoolCard.tsx (score circle + mini dots)
- [x] src/components/dashboard/ScoreMatrix.tsx (RadarChart + 6 parameter cards)

### Decisioni tecniche
- Routing senza react-router: semplice stato selectedPool in App.tsx (sufficiente per ora)
- staleTime TanStack Query = 15min (allineato al TTL backend)
- Validazione indirizzo lato frontend (regex) prima di chiamare l'API
- ScoreMatrix usa Recharts RadarChart con valori normalizzati (good=100, warn=50, bad=10)

### TODO prossima sessione
- src/components/charts/ ✓ — fatto in sessione 6

---

## Sessione 6 — Frontend Charts
**Data:** 2026-03-04
**Obiettivo:** 4 grafici Recharts + integrazione in PoolDetail

### Completato
- [x] Backend: GET /api/pools/:chain/:address/ticks (nuovo endpoint)
- [x] Frontend types.ts: aggiunto RawPool, Tick
- [x] hooks/usePoolData.ts: aggiunto usePoolTicks, useRawPool
- [x] src/components/charts/TVLChart.tsx (AreaChart stacked TVL + AVL stimato)
- [x] src/components/charts/VolumeChart.tsx (ComposedChart: Bar volume + Line txCount)
- [x] src/components/charts/FeeChart.tsx (LineChart rolling 30gg feeAPR + reference lines)
- [x] src/components/charts/TickHeatmap.tsx (BarChart 30 bucket, evidenzia tick corrente)
- [x] PoolDetail.tsx: tab Panoramica/Grafici, currentTick da useRawPool

### Decisioni tecniche
- AVL nel TVLChart è stimato applicando avlRatio corrente a tutto lo storico (non storico reale)
- VolumeChart usa txCount come proxy per wallet unici (dati swaps troppo costosi da fare per ogni giorno)
- FeeChart: rolling window 30gg (non point-in-time) per smussare la curva
- TickHeatmap: mostra ±8000 tick attorno al corrente, bucket di dimensione fissa, normalizzato 0-100%
- currentTick recuperato da /api/pools/:chain/:address (raw pool) per non fare fetch separato

### TODO prossima sessione
- Test end-to-end con una pool reale (es. USDC/ETH 0.05% su Ethereum)
- Eventuali bug fix dopo test manuale

---

## Template per nuove sessioni

## Sessione N — [Nome]
**Data:** 
**Obiettivo:** 

### Completato
- [ ] 

### Decisioni tecniche
- 

### TODO prossima sessione
- 
