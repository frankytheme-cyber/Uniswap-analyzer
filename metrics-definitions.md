# Metrics Definitions — Formule e Soglie

## 1. AVL/TVL Ratio (TVL Reale?)

**Formula:**
```
AVL = somma(liquidityGross * tickSpacing) per tutti i tick nel range [currentTick - rangeWidth, currentTick + rangeWidth]
AVL_USD = AVL / totalLiquidity * totalValueLockedUSD
avlRatio = AVL_USD / totalValueLockedUSD
```

**Range Width:**
- Stablecoin pairs (USDC/USDT, DAI/USDC): ±500 ticks
- Major pairs (ETH/USDC, WBTC/ETH): ±2000 ticks
- Altcoin pairs: ±4000 ticks

**Soglie:**
```typescript
avlRatio > 0.7   → score=1, status='good'   // 🟢
avlRatio > 0.4   → score=0, status='warn'   // 🟡
avlRatio <= 0.4  → score=0, status='bad'    // 🔴
```

---

## 2. Volume Organico (Wash Trading?)

### VolumePerWallet
```
volumePerWallet = volumeUSD_24h / uniqueWallets_24h
```

### Herfindahl-Hirschman Index (concentrazione wallet)
```
walletShares = per ogni wallet: swapVolumeUSD / totalVolumeUSD
HHI = sum(walletShares^2)
// HHI vicino a 0 = distribuzione uniforme (organico)
// HHI vicino a 1 = un wallet domina (sospetto wash trading)
```

**Soglie:**
```typescript
volumePerWallet > 5000 && HHI < 0.15  → score=1, status='good'
volumePerWallet > 1000 && HHI < 0.30  → score=0, status='warn'
else                                   → score=0, status='bad'
```

---

## 3. Fee APR (Fee Giustificano TVL?)

```
feesUSD_365 = sum(poolDayDatas.feesUSD) ultimi 365 giorni
avgTVL_365  = avg(poolDayDatas.tvlUSD) ultimi 365 giorni
feeAPR      = (feesUSD_365 / avgTVL_365) * 100
```

**Nota:** Se la pool ha meno di 365 giorni, annualizzare:
```
feeAPR = (feesUSD_N / avgTVL_N) * (365 / N) * 100
```

**Soglie:**
```typescript
feeAPR > 20   → score=1, status='good'
feeAPR > 10   → score=0, status='warn'
feeAPR <= 10  → score=0, status='bad'
```

---

## 4. Fee/TVL Competitivo (Confronto Mercato)

```
comparablePools = top 20 pool stesso feeTier, stessa chain
medianFeeAPR    = median(comparablePools.feeAPR)
relativeScore   = pool.feeAPR / medianFeeAPR
```

**Soglie:**
```typescript
relativeScore > 1.2   → score=1, status='good'    // 20% sopra la mediana
relativeScore > 0.8   → score=0, status='warn'    // vicino alla mediana
relativeScore <= 0.8  → score=0, status='bad'     // sotto la mediana
```

---

## 5. Efficienza Capitale V3 (% Tempo In-Range)

```
// Per ogni ora in poolHourDatas[168h]:
isInRange = (hourTick >= positionLowerTick) && (hourTick <= positionUpperTick)
inRangeRatio = count(isInRange) / 168
```

**Range Defaults da usare se l'utente non ha una posizione:**
```typescript
const DEFAULT_RANGES: Record<PoolType, number> = {
  stablecoin: 0.01,  // ±1%
  major:      0.05,  // ±5%
  altcoin:    0.10,  // ±10%
}
```

**Conversione price range → ticks:**
```
tickLower = floor(log(priceMin) / log(1.0001))
tickUpper = floor(log(priceMax) / log(1.0001))
```

**Soglie:**
```typescript
inRangeRatio > 0.75  → score=1, status='good'
inRangeRatio > 0.50  → score=0, status='warn'
inRangeRatio <= 0.50 → score=0, status='bad'
```

---

## 6. Incentivi Artificiali (Fee-Only?)

### Spike Detection
```
// Calcola variazione giornaliera TVL
tvlChangePct[i] = (tvl[i] - tvl[i-1]) / tvl[i-1]
spikes = giorni con tvlChangePct > 0.5 (spike +50%)
```

### Correlazione TVL-Fee
```
// Pearson correlation tra tvlHistory e feeHistory
// Valore atteso: se fee reali → alta correlazione (> 0.6)
// Segnale anomalo: TVL alto ma fee basse → reward artificiali
correlation = pearsonR(tvlHistory, feeHistory)
```

**Soglie:**
```typescript
spikes.length === 0 && correlation > 0.6  → score=1, status='good'
spikes.length <= 2 && correlation > 0.4   → score=0, status='warn'
else                                       → score=0, status='bad'
```

---

## Score Finale

```typescript
interface ParameterScore {
  id: string            // 'tvl' | 'volume' | 'fees' | 'competitive' | 'efficiency' | 'incentives'
  score: 0 | 1
  value: number         // valore numerico calcolato
  displayValue: string  // es. "68.4%" o "12.3x"
  label: string         // nome parametro leggibile
  status: 'good' | 'warn' | 'bad'
  detail: string        // spiegazione breve del risultato
}

interface PoolAnalysis {
  poolAddress: string
  chain: string
  token0: string
  token1: string
  feeTier: number
  parameters: ParameterScore[]
  overallScore: number   // 0-100
  overallStatus: 'healthy' | 'caution' | 'risk'
  lastUpdated: Date
}

// Calcolo:
overallScore = (sum(parameters.score) / 6) * 100
overallStatus = score >= 80 ? 'healthy' : score >= 50 ? 'caution' : 'risk'
```

---

## Classificazione Pool Type

```typescript
function getPoolType(token0: string, token1: string): 'stablecoin' | 'major' | 'altcoin' {
  const stables = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'crvUSD']
  const majors  = ['WETH', 'ETH', 'WBTC', 'BTC']

  if (stables.includes(token0) && stables.includes(token1)) return 'stablecoin'
  if (majors.includes(token0) || majors.includes(token1)) return 'major'
  return 'altcoin'
}
```
