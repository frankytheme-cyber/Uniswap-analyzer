# Uniswap Pool Analyzer — CLAUDE.md

## Obiettivo
Dashboard web (React + TypeScript) per analizzare pool di liquidità Uniswap V3 su una watchlist personalizzata.
Aggiornamento dati ogni 15-30 minuti. Multi-chain: Ethereum, Arbitrum, Base, Polygon.

---

## Stack Tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Grafici | Recharts |
| State | Zustand |
| Data fetching | TanStack Query (react-query) |
| Backend | Node.js + Express + TypeScript |
| Cache | node-cache (TTL 15 min) |
| Storage | DuckDB (dati storici locali) |
| Scheduler | node-cron |

---

## Architettura

```
uniswap-analyzer/
├── CLAUDE.md                  # ← questo file
├── docs/
│   ├── progress.md            # log sessioni di sviluppo
│   ├── api-reference.md       # query GraphQL e endpoint REST
│   └── metrics-definitions.md # definizioni formule metriche
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── fetchers/      # una classe per sorgente dati
│   │   │   │   ├── graph-fetcher.ts      # The Graph (principale)
│   │   │   │   ├── geckoterminal-fetcher.ts
│   │   │   │   └── defillama-fetcher.ts
│   │   │   ├── analyzers/     # un modulo per parametro
│   │   │   │   ├── tvl-analyzer.ts
│   │   │   │   ├── volume-analyzer.ts
│   │   │   │   ├── fees-analyzer.ts
│   │   │   │   ├── capital-efficiency-analyzer.ts
│   │   │   │   └── incentives-analyzer.ts
│   │   │   ├── cache/
│   │   │   │   └── cache-manager.ts     # TTL 15 min per API call
│   │   │   ├── db/
│   │   │   │   └── duckdb-store.ts      # storico time-series
│   │   │   ├── scheduler/
│   │   │   │   └── refresh-job.ts       # cron ogni 15 min
│   │   │   ├── routes/
│   │   │   │   ├── pools.ts             # GET /api/pools
│   │   │   │   ├── analysis.ts          # GET /api/analysis/:poolId
│   │   │   │   └── watchlist.ts         # CRUD /api/watchlist
│   │   │   └── server.ts
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── dashboard/
│       │   │   │   ├── PoolCard.tsx       # card singola pool
│       │   │   │   ├── PoolTable.tsx      # tabella watchlist
│       │   │   │   └── ScoreMatrix.tsx    # matrice 6 parametri
│       │   │   ├── charts/
│       │   │   │   ├── TVLChart.tsx       # AVL vs TVL nel tempo
│       │   │   │   ├── VolumeChart.tsx    # volume + wallet unici
│       │   │   │   ├── FeeChart.tsx       # fee/TVL ratio
│       │   │   │   └── TickHeatmap.tsx    # distribuzione liquidità
│       │   │   └── ui/                   # shadcn components
│       │   ├── stores/
│       │   │   └── watchlist-store.ts    # Zustand store
│       │   ├── hooks/
│       │   │   └── usePoolData.ts        # react-query hooks
│       │   └── pages/
│       │       ├── Dashboard.tsx
│       │       └── PoolDetail.tsx
│       └── package.json
└── package.json (monorepo root)
```

---

## Convenzioni Codice

- **Naming**: camelCase variabili, PascalCase componenti, kebab-case file
- **Errori**: sempre try/catch con log strutturato `{ error, context, timestamp }`
- **Tipi**: interfacce esplicite per ogni risposta API — no `any`
- **Componente di riferimento**: `packages/backend/src/fetchers/graph-fetcher.ts` — copia il pattern per nuovi fetcher
- **Analisi di riferimento**: `packages/backend/src/analyzers/tvl-analyzer.ts` — copia il pattern per nuovi analyzer

---

## Sorgenti Dati e Priorità

| Sorgente | Tipo | Priorità | Dati chiave |
|---|---|---|---|
| The Graph (Uniswap V3 Subgraph) | GraphQL | **Primaria** | Pool, ticks, swaps, fee, TVL, posizioni |
| GeckoTerminal | REST | Secondaria | TVL, volume 24h, confronto cross-pool |
| DeFiLlama | REST | Terziaria | Fee storiche, confronto protocolli |

### Subgraph Endpoints (The Graph)
```
Ethereum:  https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
Arbitrum:  https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal
Base:      https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base
Polygon:   https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon
```

### GeckoTerminal Base URL
```
https://api.geckoterminal.com/api/v2
```

### DeFiLlama Base URL
```
https://api.llama.fi
```

---

## Strategia Cache (Riduzione Chiamate API)

```
graph-fetcher       → TTL 15 min (dati cambiano ogni blocco ma non serve real-time)
geckoterminal       → TTL 15 min
defillama           → TTL 60 min (dati aggregati, aggiornamento lento)
tick data           → TTL 30 min (costoso, cambia poco)
poolDayDatas        → TTL 60 min (dati giornalieri, non cambia nella stessa giornata)
```

**Regola**: MAI fare la stessa query due volte nello stesso TTL. Sempre controllare la cache prima di fare fetch.

---

## Sei Parametri da Calcolare

### 1. TVL Reale o Gonfiato? (`tvl-analyzer.ts`)
```typescript
// Dati necessari: pool.liquidity, pool.tick, pool.ticks[], pool.totalValueLockedUSD
avlRatio = activeLiquidityUSD / totalValueLockedUSD
// ✓ se avlRatio > 0.5
// Calcolo AVL: somma liquidityGross nei tick entro ±10% dal tick corrente
```

### 2. Volume Organico? (`volume-analyzer.ts`)
```typescript
// Dati necessari: swaps[] (ultimi 500), poolDayDatas[30gg]
volumePerWallet = volumeUSD_24h / uniqueWallets_24h
washTradingScore = detectConcentration(swapsBySender) // Herfindahl index
// ✓ se volumePerWallet > 1000 e washTradingScore < 0.25
```

### 3. Fee Giustificano TVL? (`fees-analyzer.ts`)
```typescript
// Dati necessari: poolDayDatas[365gg]
feeAPR = (sum(feesUSD_365gg) / avg(tvlUSD_365gg)) * 100
// ✓ se feeAPR > 10
```

### 4. Fee/TVL Ratio Competitivo? (`fees-analyzer.ts` - metodo compare)
```typescript
// Dati necessari: top pool stesso feeTier dalla stessa chain (GeckoTerminal)
relativeEfficiency = pool.feeAPR / median(comparablePools.feeAPR)
// ✓ se relativeEfficiency > 1.0
```

### 5. Efficienza Capitale V3 (`capital-efficiency-analyzer.ts`)
```typescript
// Dati necessari: poolHourDatas[168h] — tick per ogni ora
inRangeRatio = hoursInRange / 168
// ✓ se inRangeRatio > 0.7 (stabile) o > 0.5 (volatile)
// Range default: ±5% per volatili, ±1% per stablecoin pairs
```

### 6. Incentivi Artificiali? (`incentives-analyzer.ts`)
```typescript
// Dati necessari: poolDayDatas[90gg]
tvlSpikes = detectSpikes(tvlHistory, threshold=1.5) // +50% in 24h
feeCorrelation = correlate(tvlHistory, feeHistory)
// ✓ Uniswap è fee-only → flag se spike TVL non correlato a spike fee
```

### 7. Simulatore IL V3 con range concentrato (`il-analyzer.ts`)
```typescript
// Dati necessari: feeAPR (da fees-analyzer) + rangeMinPercent, rangeMaxPercent da Strategy
// Formula derivata da Uniswap V3 whitepaper, normalizzata (IL=0 all'entry price):
//   a = priceMin/entryPrice, b = priceMax/entryPrice, r = currentPrice/entryPrice
//   v_LP   = 2√r - √a - r/√b            (in range)
//   v_hold = r·(1 - 1/√b) + (1 - √a)
//   IL = (v_LP / v_hold - 1) * 100
// Out of range: posizione 100% token0 (sotto) o 100% token1 (sopra), formula clamped
feeOffsetDays = |IL%| / (feeAPR/365)
```

### 8. Strategy Advisor (`strategy-advisor.ts`)
```typescript
// Dati necessari: poolDayDatas[30gg] per EMA7, EMA30, volatility30d
// EMA(period, prices) con k=2/(period+1)
// Regime: bullish se EMA7 > EMA30*1.02, bearish se EMA7 < EMA30*0.98, altrimenti sideways
// Volatilità annualizzata = stddev(log-returns) * √365 * 100
// → restituisce StrategyAnalysis: regime, ema7, ema30, volatility30d, recommendedStrategy
```

### 9. Backtesting (`backtesting-analyzer.ts`)
```typescript
// Dati necessari: StoredDayData[] da DuckDB (no API calls!)
// Per ogni strategia × periodo {7,30,90}:
//   totalFeesUSD = sum(feesUSD in period)
//   totalILPercent = IL al prezzo finale con formula V3 corretta
//   rebalancingCount: never=0, monthly=floor(days/30), on-10pct-move=simulate
//   gasCost = count * perRebalancing (ETH=$15, L2=$0.50)
//   netPnlPercent = fees% + IL% - gasCosts%
//   hodlReturnPercent = (closeExit/closeEntry - 1) * 100
// NOTA: ricerca reale (Spinoglio 2024) — rebalancing freq. moltiplica IL x5, fee solo x1.5
```

---

## Score Finale

Ogni parametro emette: `{ score: 0|1, value: number, label: string, status: 'good'|'warn'|'bad' }`

```typescript
overallScore = (parametri_positivi / 6) * 100
// 80-100% = 🟢 Pool sana
// 50-79%  = 🟡 Attenzione
// 0-49%   = 🔴 Rischio
```

---

## Grafici da Implementare

| Componente | Tipo | Dati | Libreria |
|---|---|---|---|
| `TVLChart` | Area stacked | AVL vs TVL (90gg) | Recharts AreaChart |
| `VolumeChart` | Bar + Line combo | Volume bars + unique wallets line (30gg) | Recharts ComposedChart |
| `FeeChart` | Line | FeeAPR nel tempo (365gg) | Recharts LineChart |
| `TickHeatmap` | Bar orizzontale | Liquidità per tick range | Recharts BarChart |
| `ScoreMatrix` | Radar | 6 parametri normalizzati | Recharts RadarChart |
| `CapitalEfficiency` | Area | % tempo in-range (7gg hourly) | Recharts AreaChart |
| `ILSimulator` | Line multi-strategia dual-axis | ILDataPoint[] per 4 strategie + ReferenceArea out-of-range | Recharts LineChart |
| `StrategyAdvisor` | Card grid | StrategyAnalysis (regime EMA, volatilità, 4 strategie) | Tailwind UI |
| `BacktestChart` | ComposedChart | BacktestResult[] (fee bar + IL bar + PnL line + HODL line) | Recharts ComposedChart |
---

## Strategie LP Implementate (`strategy-advisor.ts`)

| ID | Nome | Regime | Range | Rebalancing |
|---|---|---|---|---|
| `passive` | Full Range (Passiva) | any | [-∞, +∞] | Mai |
| `narrow` | Range Stretto | sideways | [-10%, +10%] | Ogni ±10% di prezzo |
| `asymmetric-up` | Asimmetrica Rialzista | bullish | [0%, +40%] | Mensile |
| `defensive` | Difensiva | bearish | [-40%, +30%] | Mensile |

Ref: Spinoglio 2024 — backtesting reale ETH/USDC Uniswap V3.
---

## API Routes Backend

```
GET  /api/watchlist                    → lista pool salvate
POST /api/watchlist                    → aggiungi pool { address, chain }
DELETE /api/watchlist/:id              → rimuovi pool

GET  /api/pools/:chain/:address        → dati raw pool
GET  /api/analysis/:chain/:address     → tutti e 6 i parametri calcolati
GET  /api/analysis/:chain/:address/history?days=30  → dati storici per grafici

GET  /api/health                       → status server + cache stats
POST /api/refresh/:chain/:address      → forza refresh manuale

GET  /api/analysis/:chain/:address/il-simulator  → ILPerStrategy[] (4 strategie)
GET  /api/analysis/:chain/:address/strategy      → StrategyAnalysis (regime EMA + raccomandazione)
GET  /api/analysis/:chain/:address/backtest      → BacktestResult[] (4 strategie × 7/30/90gg)
```

---

## Variabili d'Ambiente (.env)

```env
# Opzionali - aumentano rate limit
GRAPH_API_KEY=             # The Graph decentralized network
ALCHEMY_API_KEY=           # per wallet analysis on-chain

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173

# Cache
CACHE_TTL_MINUTES=15
REFRESH_INTERVAL_MINUTES=15
```

---

## Ordine di Sviluppo Consigliato (sessioni Claude Code)

1. **Setup monorepo** — package.json root, tsconfig, workspaces
2. **graph-fetcher.ts** — query base pool + poolDayDatas + swaps + ticks
3. **cache-manager.ts** — wrapper TTL attorno ai fetcher
4. **tvl-analyzer.ts** — primo analyzer completo (usa come template)
5. **fees-analyzer.ts** — dipende solo da poolDayDatas (già nel fetcher)
6. **volume-analyzer.ts** — richiede swaps[]
7. **capital-efficiency-analyzer.ts** — richiede poolHourDatas
8. **incentives-analyzer.ts** — combina dati precedenti
9. **routes/** — Express API con tutti gli endpoint
10. **scheduler** — cron job 15 min
11. **Frontend Dashboard** — PoolTable + ScoreMatrix
12. **Frontend Charts** — TVLChart, VolumeChart, FeeChart, TickHeatmap
13. **Frontend PoolDetail** — vista dettaglio singola pool

---

## TODO Attivi

- [x] Setup monorepo
- [x] il-analyzer.ts — formula V3 con range concentrato (Spinoglio 2024)
- [x] ILSimulator.tsx — multi-strategia con ReferenceArea out-of-range
- [x] strategy-advisor.ts — 4 strategie + EMA7/30 + volatility30d
- [x] backtesting-analyzer.ts — backtesting su StoredDayData[] da DuckDB
- [x] StrategyAdvisor.tsx — badge regime + card strategie
- [x] BacktestChart.tsx — ComposedChart fee/IL/PnL/HODL
- [x] PoolDetail.tsx — tab "Strategie LP" con i 3 nuovi componenti
- [ ] geckoterminal-fetcher.ts — integrare dati competitor (rate-limiter.ts pronto)
- [ ] defillama-fetcher.ts — storico fee protocollo

---

## Note Importanti

- **Non usare `any`** — definire sempre interfacce TypeScript per le risposte API
- **Il fetcher The Graph è la fonte principale** — GeckoTerminal e DeFiLlama solo per dati non disponibili sul subgraph
- **Ogni analyzer è indipendente** — riceve dati già fetchati, non fa chiamate API dirette
- **DuckDB** salva `poolDayDatas` storici per non ri-fetchare 365gg ogni volta
