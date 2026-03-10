# API Reference — Query GraphQL e Endpoint REST

## The Graph — Query GraphQL

### 1. Dati Base Pool
```graphql
# Usato da: tvl-analyzer, fees-analyzer
# Cache TTL: 15 min
query GetPool($poolId: ID!) {
  pool(id: $poolId) {
    id
    token0 { symbol, decimals }
    token1 { symbol, decimals }
    feeTier
    liquidity
    sqrtPrice
    tick
    totalValueLockedUSD
    totalValueLockedToken0
    totalValueLockedToken1
    volumeUSD
    feesUSD
    txCount
    createdAtTimestamp
  }
}
```

### 2. Dati Giornalieri (fino a 365 giorni)
```graphql
# Usato da: fees-analyzer, incentives-analyzer, tvl-analyzer (trend)
# Cache TTL: 60 min
query GetPoolDayDatas($poolId: String!, $days: Int!) {
  poolDayDatas(
    first: $days
    orderBy: date
    orderDirection: desc
    where: { pool: $poolId }
  ) {
    date
    tvlUSD
    volumeUSD
    feesUSD
    txCount
    open
    high
    low
    close
  }
}
```

### 3. Dati Orari (ultimi 7 giorni = 168 ore)
```graphql
# Usato da: capital-efficiency-analyzer
# Cache TTL: 30 min
query GetPoolHourDatas($poolId: String!) {
  poolHourDatas(
    first: 168
    orderBy: periodStartUnix
    orderDirection: desc
    where: { pool: $poolId }
  ) {
    periodStartUnix
    tick
    sqrtPrice
    liquidity
    tvlUSD
    volumeUSD
    feesUSD
  }
}
```

### 4. Swap Recenti (per wash trading detection)
```graphql
# Usato da: volume-analyzer
# Cache TTL: 15 min
query GetRecentSwaps($poolId: String!, $since: Int!) {
  swaps(
    first: 500
    orderBy: timestamp
    orderDirection: desc
    where: { pool: $poolId, timestamp_gt: $since }
  ) {
    id
    timestamp
    sender
    recipient
    amountUSD
    amount0
    amount1
    transaction { id }
  }
}
```

### 5. Distribuzione Ticks (per AVL)
```graphql
# Usato da: tvl-analyzer (AVL calculation), TickHeatmap chart
# Cache TTL: 30 min
query GetPoolTicks($poolId: String!, $skip: Int!) {
  ticks(
    first: 1000
    skip: $skip
    where: { poolAddress: $poolId }
    orderBy: tickIdx
  ) {
    tickIdx
    liquidityNet
    liquidityGross
    price0
    price1
  }
}
```

### 6. Top Pool per Confronto Fee/TVL
```graphql
# Usato da: fees-analyzer (confronto competitivo)
# Cache TTL: 60 min
query GetTopPoolsByFeeTier($feeTier: BigInt!, $chain: String!) {
  pools(
    first: 20
    orderBy: totalValueLockedUSD
    orderDirection: desc
    where: { feeTier: $feeTier }
  ) {
    id
    token0 { symbol }
    token1 { symbol }
    totalValueLockedUSD
    feesUSD
    volumeUSD
  }
}
```

---

## GeckoTerminal REST

### Pool Info
```
GET https://api.geckoterminal.com/api/v2/networks/{network}/pools/{address}

Networks: eth, arbitrum, base, polygon_pos

Response usata:
  data.attributes.reserve_in_usd         → TVL
  data.attributes.volume_usd.h24          → Volume 24h
  data.attributes.transactions.h24        → TX count 24h
  data.attributes.price_change_percentage.h24
```

### Top Pool stesso tier (confronto)
```
GET https://api.geckoterminal.com/api/v2/networks/{network}/dexes/uniswap-v3/pools
    ?sort=h24_volume_usd_liquidity_desc&page=1

Filtrare per fee_tier nella risposta.
```

---

## DeFiLlama REST

### Fee storiche protocollo
```
GET https://api.llama.fi/summary/fees/uniswap-v3?dataType=dailyFees

Response:
  totalDataChart[]: [timestamp, feesUSD]
  total24h: number
  total7d: number
```

### TVL storico per confronto
```
GET https://api.llama.fi/protocol/uniswap

Response:
  chainTvls.Ethereum.tvl[]: [date, totalLiquidityUSD]
  chainTvls.Arbitrum.tvl[]: ...
```

---

## Mapping Chain → Network ID

```typescript
const CHAIN_TO_GRAPH: Record<string, string> = {
  ethereum: 'uniswap/uniswap-v3',
  arbitrum: 'ianlapham/arbitrum-minimal',
  base: 'uniswap/uniswap-v3-base',
  polygon: 'ianlapham/uniswap-v3-polygon',
}

const CHAIN_TO_GECKO: Record<string, string> = {
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  base: 'base',
  polygon: 'polygon_pos',
}
```

---

## Limitazioni e Rate Limits

| API | Rate Limit | Note |
|---|---|---|
| The Graph (hosted) | ~1000 req/giorno free | Aggiungere GRAPH_API_KEY per aumentare |
| GeckoTerminal | 30 req/min | No API key necessaria |
| DeFiLlama | Nessun rate limit dichiarato | Usare con moderazione |

**Strategia per rispettare i rate limit:**
- Cache TTL allineata ai rate limit (sopra)
- Per la watchlist: fetch sequenziale con `await`, non parallelo
- Se watchlist > 10 pool: batch fetch con delay 200ms tra pool
