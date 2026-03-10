# Guida Sessioni Claude Code — Prompt Ottimizzati

## Prima di ogni sessione
```bash
cd uniswap-analyzer
claude   # avvia Claude Code nella root del progetto
```

Claude Code leggerà automaticamente CLAUDE.md all'avvio.

---

## SESSIONE 1 — Setup Monorepo + Graph Fetcher

### Prompt 1 — Setup struttura
```
Crea il monorepo con questa struttura:
- package.json root con workspaces ["packages/*"]
- packages/backend: Express + TypeScript, dipendenze: graphql-request, axios, node-cache, node-cron, duckdb, express
- packages/frontend: Vite + React + TypeScript, dipendenze: recharts, zustand, @tanstack/react-query, tailwindcss

Non scrivere il codice ancora, solo i file package.json e tsconfig.json.
```

### Prompt 2 — Graph Fetcher
```
Crea packages/backend/src/fetchers/graph-fetcher.ts.

Deve implementare la classe GraphFetcher con questi metodi pubblici:
- getPool(chain, address): Promise<PoolData>
- getPoolDayDatas(chain, address, days): Promise<PoolDayData[]>
- getPoolHourDatas(chain, address): Promise<PoolHourData[]>
- getRecentSwaps(chain, address, sinceHours): Promise<Swap[]>
- getPoolTicks(chain, address): Promise<Tick[]>

Usa le query GraphQL da docs/api-reference.md e i chain endpoints da CLAUDE.md.
Definisci le interfacce TypeScript per ogni tipo di risposta.
```

### Prompt 3 — Cache Manager
```
Crea packages/backend/src/cache/cache-manager.ts.

Wrapper attorno a node-cache con TTL configurabili come definiti in CLAUDE.md:
- graph fetcher: 15 min
- defillama: 60 min
- tick data: 30 min

Esporta una funzione withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>
```

---

## SESSIONE 2 — TVL e Fees Analyzers

### Prompt 1 — TVL Analyzer
```
Crea packages/backend/src/analyzers/tvl-analyzer.ts.

Implementa la funzione analyzeTVL(pool: PoolData, ticks: Tick[]): ParameterScore
seguendo esattamente le formule in docs/metrics-definitions.md sezione "1. AVL/TVL Ratio".

Il tipo ParameterScore è definito in docs/metrics-definitions.md sezione "Score Finale".
```

### Prompt 2 — Fees Analyzer
```
Crea packages/backend/src/analyzers/fees-analyzer.ts con due funzioni:

1. analyzeFeeAPR(dayDatas: PoolDayData[]): ParameterScore
   Formula da docs/metrics-definitions.md sezione "3. Fee APR"

2. analyzeFeeCompetitiveness(pool: PoolData, comparablePools: PoolData[]): ParameterScore
   Formula da docs/metrics-definitions.md sezione "4. Fee/TVL Competitivo"
```

---

## SESSIONE 3 — Volume e Capital Efficiency

### Prompt 1 — Volume Analyzer
```
Crea packages/backend/src/analyzers/volume-analyzer.ts.

Implementa analyzeVolume(swaps: Swap[], volumeUSD_24h: number): ParameterScore

Calcola:
- uniqueWallets: Set di sender univoci
- volumePerWallet: volumeUSD_24h / uniqueWallets.size
- HHI (Herfindahl index): sum delle quote al quadrato di ciascun wallet

Formula e soglie in docs/metrics-definitions.md sezione "2. Volume Organico".
```

### Prompt 2 — Capital Efficiency
```
Crea packages/backend/src/analyzers/capital-efficiency-analyzer.ts.

Implementa analyzeCapitalEfficiency(hourDatas: PoolHourData[], poolType: PoolType): ParameterScore

Usa i DEFAULT_RANGES e la conversione price→tick da docs/metrics-definitions.md sezione "5. Efficienza Capitale".
```

---

## SESSIONE 4 — Incentives Analyzer + Routes

### Prompt 1 — Incentives Analyzer
```
Crea packages/backend/src/analyzers/incentives-analyzer.ts.

Implementa analyzeIncentives(dayDatas: PoolDayData[]): ParameterScore

Calcola spike detection e correlazione TVL-Fee come da docs/metrics-definitions.md sezione "6. Incentivi Artificiali".
Per la correlazione usa la formula di Pearson (implementala senza librerie esterne).
```

### Prompt 2 — Analysis Route
```
Crea packages/backend/src/routes/analysis.ts.

Implementa GET /api/analysis/:chain/:address che:
1. Chiama withCache() con TTL 15 min
2. Fetcha in sequenza (non parallelo) tutti i dati necessari via GraphFetcher
3. Esegue tutti e 6 gli analyzers
4. Ritorna PoolAnalysis come definito in docs/metrics-definitions.md

Gestisci errori con try/catch e rispondi con status 500 + messaggio leggibile.
```

### Prompt 3 — Watchlist Routes
```
Crea packages/backend/src/routes/watchlist.ts con:
- GET /api/watchlist → legge da DuckDB
- POST /api/watchlist → inserisce { address, chain, nickname? }
- DELETE /api/watchlist/:id → rimuove per id

Crea anche packages/backend/src/db/duckdb-store.ts con le query SQL per la tabella watchlist.
```

---

## SESSIONE 5 — Frontend Dashboard

### Prompt 1 — Store e Hooks
```
Crea:
1. packages/frontend/src/stores/watchlist-store.ts — Zustand store con { pools, addPool, removePool }
2. packages/frontend/src/hooks/usePoolAnalysis.ts — react-query hook che chiama GET /api/analysis/:chain/:address con refetchInterval 15 minuti

Non creare ancora componenti UI.
```

### Prompt 2 — PoolCard e ScoreMatrix
```
Crea packages/frontend/src/components/dashboard/PoolCard.tsx.

Mostra per una singola pool:
- Nome pair (es. USDC/ETH 0.05%)
- Chain badge
- overallScore con colore (verde/giallo/rosso)
- 6 indicatori parametri in griglia 2x3: icona ✓/⚠/✗ + label + displayValue

Design: dark theme, card con bordo colorato in base a overallStatus.
Usa Tailwind CSS.
```

### Prompt 3 — Charts
```
Crea i seguenti chart components in packages/frontend/src/components/charts/.
Ognuno riceve i dati già processati come prop, non fa fetch diretti.

1. TVLChart.tsx — Recharts AreaChart con due aree (AVL in verde, TVL restante in grigio)
2. VolumeChart.tsx — Recharts ComposedChart: barre volume + linea wallet unici (asse Y doppio)
3. FeeChart.tsx — Recharts LineChart con linea feeAPR e soglia 10% come dashed reference line
4. ScoreMatrix.tsx — Recharts RadarChart con i 6 parametri normalizzati 0-1

Usa il design del PoolCard come riferimento per colori e stile.
```

---

## SESSIONE 6 — Scheduler + Polish

### Prompt 1 — Scheduler
```
Crea packages/backend/src/scheduler/refresh-job.ts.

Usa node-cron per eseguire ogni 15 minuti:
1. Leggi watchlist da DuckDB
2. Per ogni pool in sequenza (con 200ms di delay tra pool): invalida cache e ri-fetcha i dati
3. Log strutturato: { timestamp, poolsRefreshed, errors[], duration }

Importa e avvia lo scheduler in server.ts.
```

### Prompt 2 — Dashboard Page
```
Crea packages/frontend/src/pages/Dashboard.tsx.

Layout:
- Header con titolo + bottone "Aggiungi Pool" (modale con input address + chain selector)
- Griglia di PoolCard per ogni pool in watchlist
- Se watchlist vuota: stato empty con istruzioni

Usa il watchlist-store di Zustand e il hook usePoolAnalysis.
```

---

## Comandi Utili Durante lo Sviluppo

```bash
# Avvia tutto
npm run dev          # dalla root (avvia backend + frontend in parallelo)

# Solo backend
cd packages/backend && npm run dev

# Solo frontend
cd packages/frontend && npm run dev

# Type check
npm run typecheck

# Compatta contesto a fine sessione lunga
/compact Focus on TypeScript interfaces and analyzer function signatures
```

---

## Tips Anti-Spreco Token

1. **Referenzia sempre il file esistente come pattern:**
   "Crea X seguendo lo stesso pattern di Y già esistente"

2. **Non chiedere spiegazioni se non servono:**
   Aggiungi "no spiegazioni, solo codice" se il task è chiaro

3. **Una funzione alla volta per task complessi:**
   Non "crea l'intero analyzer" ma "crea solo il metodo detectSpikes"

4. **Usa /compact dopo 10+ scambi:**
   "/compact Focus on function signatures and TypeScript interfaces"

5. **Inizia ogni sessione con plan mode:**
   Shift+Tab → approva il piano → poi implementa
