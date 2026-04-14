import { GraphQLClient, gql } from 'graphql-request'

// ── Chain mappings ──────────────────────────────────────────────────────────
// Subgraph IDs on The Graph Network (decentralized gateway)
// Trova/verifica gli ID su: https://thegraph.com/explorer?search=uniswap-v3

const CHAIN_TO_SUBGRAPH_ID: Record<string, string> = {
  ethereum: '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
  arbitrum: 'FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aFM',
  base:     '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG',
  polygon:  '3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm',
}

// Uniswap V4 subgraph IDs (launched January 31, 2025)
// Source: https://docs.uniswap.org/api/subgraph/overview
const CHAIN_TO_SUBGRAPH_ID_V4: Record<string, string> = {
  ethereum: 'DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G',
  base:     '2L6yxqUZ7dT6GWoTy9qxNBkf9kEk65me3XPMvbGsmJUZ',
  polygon:  'CwpebM66AH5uqS5sreKij8yEkkPcHvmyEs7EwFtdM5ND',
  // arbitrum: subgraph ID not yet available — add when deployed
}

const GRAPH_GATEWAY = 'https://gateway.thegraph.com/api'

// Fallback hosted-service URLs (legacy, ~1000 req/day free, use only without GRAPH_API_KEY)
const CHAIN_TO_HOSTED_URL: Record<string, string> = {
  ethereum: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  arbitrum: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
  base:     'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base',
  polygon:  'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
}

// ── TypeScript Interfaces ───────────────────────────────────────────────────

export interface Token {
  id?: string
  symbol: string
  decimals: string
  derivedETH?: string
}

export interface Pool {
  id: string
  token0: Token
  token1: Token
  feeTier: string
  liquidity: string
  sqrtPrice: string
  tick: string
  totalValueLockedUSD: string
  totalValueLockedToken0: string
  totalValueLockedToken1: string
  volumeUSD: string
  feesUSD: string
  txCount: string
  createdAtTimestamp: string
  hooks?: string   // V4 only: hooks contract address; zero address = no hooks
}

/** V4 pool with hooks guaranteed present */
export interface PoolV4 extends Pool {
  hooks: string
}

export interface PoolDayData {
  date: number
  tvlUSD: string
  volumeUSD: string
  feesUSD: string
  txCount: string
  open: string
  high: string
  low: string
  close: string
}

export interface PoolHourData {
  periodStartUnix: number
  tick: string
  sqrtPrice: string
  liquidity: string
  tvlUSD: string
  volumeUSD: string
  feesUSD: string
}

export interface Swap {
  id: string
  timestamp: string
  sender: string
  recipient?: string   // absent in V4 (ERC-6909 accounting model)
  amountUSD: string
  amount0: string
  amount1: string
  transaction: { id: string }
}

export interface Tick {
  tickIdx: string
  liquidityNet: string
  liquidityGross: string
  price0: string
  price1: string
}

export interface CompetitorPool {
  id: string
  token0: Token
  token1: Token
  totalValueLockedUSD: string
  feesUSD: string
  volumeUSD: string
  createdAtTimestamp: string
}

export interface PositionTick {
  tickIdx: string
}

export interface WalletPosition {
  id: string
  owner: string
  pool: {
    id: string
    token0: Token
    token1: Token
    feeTier: string
    liquidity: string
    sqrtPrice: string
    tick: string
    totalValueLockedUSD: string
  }
  tickLower: PositionTick
  tickUpper: PositionTick
  liquidity: string
  depositedToken0: string
  depositedToken1: string
  withdrawnToken0: string
  withdrawnToken1: string
  collectedFeesToken0: string
  collectedFeesToken1: string
  /** The opening (mint) transaction */
  transaction?: { id: string; timestamp: string }
  /** Unix timestamp (seconds) of the opening transaction */
  openedAtTimestamp?: string
  /** Transaction hash of the opening (mint) event */
  openTxHash?: string
  /** Unix timestamp (seconds) of the last withdrawal (≈ close date for closed positions) */
  closedAtTimestamp?: string
  /** Transaction hash of the closing (burn) event */
  closeTxHash?: string
  /** USD value of the deposit at the time of the mint event (from subgraph amountUSD) */
  historicDepositUSD?: number
  /** USD value of the withdrawal at the time of the burn event (from subgraph amountUSD) */
  historicWithdrawnUSD?: number
}

/** Raw event from V4 ModifyLiquidity entity */
export interface ModifyLiquidityEvent {
  id: string
  pool: {
    id: string
    token0: Token
    token1: Token
    feeTier: string
    liquidity: string
    sqrtPrice: string
    tick: string
    totalValueLockedUSD: string
  }
  tickLower: string   // BigInt as string
  tickUpper: string   // BigInt as string
  amount:    string   // liquidity delta (BigInt, negative for removes)
  amount0:   string   // token0 amount (BigDecimal)
  amount1:   string   // token1 amount (BigDecimal)
  amountUSD: string   // historic USD value at event time (BigDecimal)
  timestamp: string
  origin:    string
}

// ── GraphQL Queries ─────────────────────────────────────────────────────────

const GET_POOL = gql`
  query GetPool($poolId: ID!) {
    pool(id: $poolId) {
      id
      token0 { symbol decimals }
      token1 { symbol decimals }
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
`

const GET_POOL_V4 = gql`
  query GetPool($poolId: ID!) {
    pool(id: $poolId) {
      id
      token0 { symbol decimals }
      token1 { symbol decimals }
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
      hooks
    }
  }
`

const GET_POOL_DAY_DATAS = gql`
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
`

const GET_POOL_HOUR_DATAS = gql`
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
`

const GET_RECENT_SWAPS = gql`
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
`

/**
 * V4 Swap schema differs from V3: no `recipient` field.
 * In V4, token flows use ERC-6909 claims through the singleton PoolManager,
 * so the recipient concept doesn't map to a single address field.
 */
const GET_RECENT_SWAPS_V4 = gql`
  query GetRecentSwapsV4($poolId: String!, $since: Int!) {
    swaps(
      first: 500
      orderBy: timestamp
      orderDirection: desc
      where: { pool: $poolId, timestamp_gt: $since }
    ) {
      id
      timestamp
      sender
      amountUSD
      amount0
      amount1
      transaction { id }
    }
  }
`

const GET_POOL_TICKS = gql`
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
`

// Position fragment — reused in both owner-based and transaction-based queries
const POSITION_FIELDS = `
  id
  owner
  pool {
    id
    token0 { id symbol decimals derivedETH }
    token1 { id symbol decimals derivedETH }
    feeTier
    liquidity
    sqrtPrice
    tick
    totalValueLockedUSD
  }
  tickLower { tickIdx }
  tickUpper { tickIdx }
  liquidity
  depositedToken0
  depositedToken1
  withdrawnToken0
  withdrawnToken1
  collectedFeesToken0
  collectedFeesToken1
  transaction { id timestamp }
`

/** Positions still owned by the wallet (includes open + closed-but-not-burned). */
const GET_WALLET_POSITIONS_BY_OWNER = gql`
  query GetWalletPositionsByOwner($owner: String!, $lastId: String!) {
    positions(
      first: 1000
      where: { owner: $owner, id_lt: $lastId }
      orderBy: id
      orderDirection: desc
    ) {
      ${POSITION_FIELDS}
    }
  }
`

/** All mint events originated by the wallet — used to discover burned positions + historic USD values. */
const GET_WALLET_MINTS = gql`
  query GetWalletMints($origin: String!, $lastId: String!) {
    mints(
      first: 1000
      where: { origin: $origin, id_lt: $lastId }
      orderBy: id
      orderDirection: desc
    ) {
      id
      transaction { id }
      pool { id }
      tickLower
      tickUpper
      amount0
      amount1
      amountUSD
    }
  }
`

/** Fetch positions by their mint transaction IDs (finds burned NFT positions). */
const GET_POSITIONS_BY_TX = gql`
  query GetPositionsByTx($txIds: [String!]!) {
    positions(
      first: 1000
      where: { transaction_in: $txIds }
    ) {
      ${POSITION_FIELDS}
    }
  }
`

/**
 * V4: liquidity data lives on ModifyLiquidity events, not on Position.
 * We fetch all events for a wallet (origin) and aggregate by (pool, tickLower, tickUpper).
 */
const GET_WALLET_MODIFY_LIQUIDITIES_V4 = gql`
  query GetWalletModifyLiquidities($owner: String!, $skip: Int!) {
    modifyLiquidities(
      first: 1000
      skip: $skip
      where: { origin: $owner }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      pool {
        id
        token0 { id symbol decimals derivedETH }
        token1 { id symbol decimals derivedETH }
        feeTier
        liquidity
        sqrtPrice
        tick
        totalValueLockedUSD
      }
      tickLower
      tickUpper
      amount
      amount0
      amount1
      amountUSD
      timestamp
      origin
    }
  }
`

/** Fetches burn events for a wallet — close dates + historic USD values. */
const GET_WALLET_BURNS = gql`
  query GetWalletBurns($origin: String!, $lastId: String!) {
    burns(
      first: 1000
      where: { origin: $origin, id_lt: $lastId }
      orderBy: id
      orderDirection: desc
    ) {
      id
      transaction { id }
      pool { id }
      tickLower
      tickUpper
      timestamp
      amountUSD
    }
  }
`

/** V4 Position entity — used to get tokenIds for on-chain fee computation. */
const GET_WALLET_TOKEN_IDS_V4 = gql`
  query GetWalletTokenIdsV4($owner: String!) {
    positions(
      first: 100
      where: { origin: $owner }
      orderBy: tokenId
      orderDirection: desc
    ) {
      tokenId
    }
  }
`

const GET_TOP_POOLS_BY_FEE_TIER = gql`
  query GetTopPoolsByFeeTier($feeTier: BigInt!) {
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
      createdAtTimestamp
    }
  }
`

const GET_ETH_PRICE_USD = gql`
  query GetEthPriceUSD {
    bundle(id: "1") { ethPriceUSD }
  }
`

// ── GraphFetcher Class ──────────────────────────────────────────────────────

export class GraphFetcher {
  protected client: GraphQLClient

  constructor(chain: string, subgraphMap: Record<string, string> = CHAIN_TO_SUBGRAPH_ID) {
    const subgraphId = subgraphMap[chain]
    if (!subgraphId) {
      throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(subgraphMap).join(', ')}`)
    }

    const apiKey = process.env.GRAPH_API_KEY
    let url: string

    if (apiKey) {
      url = `${GRAPH_GATEWAY}/${apiKey}/subgraphs/id/${subgraphId}`
    } else {
      const fallback = CHAIN_TO_HOSTED_URL[chain]
      if (!fallback) {
        throw new Error(`GRAPH_API_KEY not set and no fallback URL for chain: ${chain}`)
      }
      console.warn(JSON.stringify({
        warning: 'GRAPH_API_KEY not set — using legacy hosted service (~1000 req/day). Set GRAPH_API_KEY for production.',
        chain,
        timestamp: new Date().toISOString(),
      }))
      url = fallback
    }

    this.client = new GraphQLClient(url)
  }

  async getPool(poolId: string): Promise<Pool> {
    const context = { method: 'getPool', poolId }
    try {
      const data = await this.client.request<{ pool: Pool }>(GET_POOL, { poolId })
      if (!data.pool) {
        throw new Error(`Pool not found: ${poolId}`)
      }
      return data.pool
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  async getPoolDayDatas(poolId: string, days: number = 365): Promise<PoolDayData[]> {
    const context = { method: 'getPoolDayDatas', poolId, days }
    try {
      const data = await this.client.request<{ poolDayDatas: PoolDayData[] }>(
        GET_POOL_DAY_DATAS,
        { poolId, days }
      )
      return data.poolDayDatas
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  async getPoolHourDatas(poolId: string): Promise<PoolHourData[]> {
    const context = { method: 'getPoolHourDatas', poolId }
    try {
      const data = await this.client.request<{ poolHourDatas: PoolHourData[] }>(
        GET_POOL_HOUR_DATAS,
        { poolId }
      )
      return data.poolHourDatas
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  async getRecentSwaps(poolId: string, sinceDaysAgo: number = 1): Promise<Swap[]> {
    const since = Math.floor(Date.now() / 1000) - sinceDaysAgo * 86400
    const context = { method: 'getRecentSwaps', poolId, since }
    try {
      const data = await this.client.request<{ swaps: Swap[] }>(
        GET_RECENT_SWAPS,
        { poolId, since }
      )
      return data.swaps
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  // Fetches all ticks by paginating in batches of 1000
  async getPoolTicks(poolId: string): Promise<Tick[]> {
    const context = { method: 'getPoolTicks', poolId }
    try {
      const allTicks: Tick[] = []
      let skip = 0

      while (true) {
        const data = await this.client.request<{ ticks: Tick[] }>(
          GET_POOL_TICKS,
          { poolId, skip }
        )
        const batch = data.ticks
        allTicks.push(...batch)

        if (batch.length < 1000) break
        skip += 1000
      }

      return allTicks
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  async getWalletPositions(owner: string): Promise<WalletPosition[]> {
    const context = { method: 'getWalletPositions', owner }
    try {
      type RawV3Position = WalletPosition
      const ownerLc = owner.toLowerCase()

      // 1. Positions still owned by the wallet (cursor-based pagination)
      const ownedPositions: RawV3Position[] = []
      let lastId = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
      while (true) {
        const data = await this.client.request<{ positions: RawV3Position[] }>(
          GET_WALLET_POSITIONS_BY_OWNER,
          { owner: ownerLc, lastId }
        )
        const batch = data.positions ?? []
        if (batch.length === 0) break
        ownedPositions.push(...batch)
        lastId = batch[batch.length - 1].id
        if (batch.length < 1000) break
      }

      // 2. Discover burned positions via mint events (origin = wallet)
      //    Collect transaction IDs + historic amountUSD per position key
      interface MintInfo {
        txId: string
        amountUSD: number
        poolId: string
        tickLower: string
        tickUpper: string
      }
      const mintTxIds = new Set<string>()
      const mintsByTx = new Map<string, MintInfo>()
      // Map: "poolId:tickLower:tickUpper" → total deposited USD (sum of all mints for same position)
      const mintDepositUSD = new Map<string, number>()
      // Map: "poolId:tickLower:tickUpper" → { amount0, amount1 } from mint events
      const mintDepositTokens = new Map<string, { amount0: number; amount1: number }>()

      let mintLastId = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
      while (true) {
        const data = await this.client.request<{
          mints: Array<{ id: string; transaction: { id: string }; pool: { id: string }; tickLower: string; tickUpper: string; amount0: string; amount1: string; amountUSD: string }>
        }>(GET_WALLET_MINTS, { origin: ownerLc, lastId: mintLastId })
        const batch = data.mints ?? []
        if (batch.length === 0) break
        for (const m of batch) {
          mintTxIds.add(m.transaction.id)
          mintsByTx.set(m.transaction.id, {
            txId: m.transaction.id,
            amountUSD: parseFloat(m.amountUSD),
            poolId: m.pool.id,
            tickLower: m.tickLower,
            tickUpper: m.tickUpper,
          })
          // Accumulate deposit USD + token amounts per position key
          const posKey = `${m.pool.id}:${m.tickLower}:${m.tickUpper}`
          mintDepositUSD.set(posKey, (mintDepositUSD.get(posKey) ?? 0) + parseFloat(m.amountUSD))
          const prev = mintDepositTokens.get(posKey) ?? { amount0: 0, amount1: 0 }
          mintDepositTokens.set(posKey, {
            amount0: prev.amount0 + parseFloat(m.amount0),
            amount1: prev.amount1 + parseFloat(m.amount1),
          })
        }
        mintLastId = batch[batch.length - 1].id
        if (batch.length < 1000) break
      }

      // 3. Fetch positions by transaction IDs (finds burned NFTs)
      //    Query in batches of 100 tx IDs (subgraph _in filter limit)
      const ownedIds = new Set(ownedPositions.map((p) => p.id))
      const burnedPositions: RawV3Position[] = []
      const txIdArray = Array.from(mintTxIds)
      for (let i = 0; i < txIdArray.length; i += 100) {
        const chunk = txIdArray.slice(i, i + 100)
        const data = await this.client.request<{ positions: RawV3Position[] }>(
          GET_POSITIONS_BY_TX,
          { txIds: chunk }
        )
        for (const p of data.positions ?? []) {
          // Only add positions not already found via owner query
          if (!ownedIds.has(p.id)) {
            burnedPositions.push(p)
            ownedIds.add(p.id)
          }
        }
      }

      // 4. Merge and enrich with timestamps + historic USD values + fallback token amounts
      const allPositions = [...ownedPositions, ...burnedPositions]
      return allPositions.map((p) => {
        const posKey = `${p.pool.id}:${p.tickLower.tickIdx}:${p.tickUpper.tickIdx}`
        const mintTokens = mintDepositTokens.get(posKey)
        // Prefer mint event amounts over Position.depositedToken fields.
        // The Position entity's depositedToken0/1 can be zero or stale for burned
        // positions — mint events are the authoritative source for deposit amounts.
        return {
          ...p,
          depositedToken0: mintTokens ? String(mintTokens.amount0) : p.depositedToken0,
          depositedToken1: mintTokens ? String(mintTokens.amount1) : p.depositedToken1,
          openedAtTimestamp: p.transaction?.timestamp,
          openTxHash: p.transaction?.id,
          historicDepositUSD: mintDepositUSD.get(posKey),
        }
      })
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  /**
   * Fetches burn (liquidity removal) events for a wallet.
   * Returns a Map from position key ("poolId:tickLower:tickUpper") to burn info.
   */
  async getWalletBurnInfo(owner: string): Promise<Map<string, { timestamp: string; totalAmountUSD: number; txHash: string }>> {
    try {
      interface BurnEvent {
        id: string
        transaction: { id: string }
        pool: { id: string }
        tickLower: string
        tickUpper: string
        timestamp: string
        amountUSD: string
      }
      const burnMap = new Map<string, { timestamp: string; totalAmountUSD: number; txHash: string }>()
      let lastId = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
      while (true) {
        const data = await this.client.request<{ burns: BurnEvent[] }>(
          GET_WALLET_BURNS,
          { origin: owner.toLowerCase(), lastId }
        )
        const batch = data.burns ?? []
        if (batch.length === 0) break
        for (const b of batch) {
          const key = `${b.pool.id}:${b.tickLower}:${b.tickUpper}`
          const existing = burnMap.get(key)
          const usd = parseFloat(b.amountUSD) || 0
          if (existing) {
            // Keep latest timestamp + txHash, sum up all burn USD amounts
            if (b.timestamp > existing.timestamp) {
              existing.timestamp = b.timestamp
              existing.txHash = b.transaction.id
            }
            existing.totalAmountUSD += usd
          } else {
            burnMap.set(key, { timestamp: b.timestamp, totalAmountUSD: usd, txHash: b.transaction.id })
          }
        }
        lastId = batch[batch.length - 1].id
        if (batch.length < 1000) break
      }
      return burnMap
    } catch {
      return new Map()
    }
  }

  async getEthPriceUSD(): Promise<number> {
    try {
      const data = await this.client.request<{ bundle: { ethPriceUSD: string } }>(GET_ETH_PRICE_USD)
      return parseFloat(data.bundle.ethPriceUSD)
    } catch {
      return 0
    }
  }

  async getTopPoolsByFeeTier(feeTier: string): Promise<CompetitorPool[]> {
    const context = { method: 'getTopPoolsByFeeTier', feeTier }
    try {
      const data = await this.client.request<{ pools: CompetitorPool[] }>(
        GET_TOP_POOLS_BY_FEE_TIER,
        { feeTier }
      )
      return data.pools
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  protected wrapError(error: unknown, context: Record<string, unknown>): Error {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: message, context, timestamp: new Date().toISOString() }))
    return new Error(`GraphFetcher [${context.method}]: ${message}`)
  }
}

// ── GraphFetcherV4 ────────────────────────────────────────────────────────────

/**
 * Fetcher for Uniswap V4 pools.
 *
 * V4 uses a singleton PoolManager; pools are identified by a 32-byte PoolId
 * (keccak256 hash of the PoolKey), not by a contract address.
 *
 * Extends GraphFetcher and overrides:
 *  - getPool          → adds `hooks` field (V4-specific)
 *  - getPoolHourDatas → graceful fallback if V4 subgraph lacks hourData
 */
export class GraphFetcherV4 extends GraphFetcher {
  constructor(chain: string) {
    super(chain, CHAIN_TO_SUBGRAPH_ID_V4)
  }

  async getPool(poolId: string): Promise<PoolV4> {
    const context = { method: 'getPool', poolId, version: 'v4' }
    try {
      const data = await this.client.request<{ pool: PoolV4 }>(GET_POOL_V4, { poolId })
      if (!data.pool) {
        throw new Error(`Pool not found: ${poolId}`)
      }
      return data.pool
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  /**
   * V4 Swap type has no `recipient` field — uses a dedicated query.
   */
  async getRecentSwaps(poolId: string, sinceDaysAgo: number = 1): Promise<Swap[]> {
    const since = Math.floor(Date.now() / 1000) - sinceDaysAgo * 86400
    const context = { method: 'getRecentSwaps', poolId, since, version: 'v4' }
    try {
      const data = await this.client.request<{ swaps: Swap[] }>(
        GET_RECENT_SWAPS_V4,
        { poolId, since }
      )
      return data.swaps
    } catch (error) {
      throw this.wrapError(error, context)
    }
  }

  /**
   * V4 subgraph may not yet expose poolHourDatas.
   * Returns an empty array instead of throwing, allowing capital-efficiency
   * analyzer to fall back to its noDataScore() path.
   */
  async getPoolHourDatas(poolId: string): Promise<PoolHourData[]> {
    try {
      return await super.getPoolHourDatas(poolId)
    } catch {
      return []
    }
  }

  /**
   * V4 wallet positions — reconstructed from ModifyLiquidity events.
   *
   * The V4 subgraph does not store per-position data on the Position entity
   * (no tickLower, tickUpper, liquidity, deposited/collected amounts).
   * Instead, we paginate through all ModifyLiquidity events for the owner,
   * group by (poolId, tickLower, tickUpper), and sum the liquidity deltas.
   * Groups with net liquidity > 0 are currently open positions.
   *
   * Returns [] if the V4 subgraph is not deployed on this chain (e.g. Arbitrum).
   */
  async getWalletPositions(owner: string): Promise<WalletPosition[]> {
    const context = { method: 'getWalletPositions', owner, version: 'v4' }
    try {
      // Paginate ModifyLiquidity events (up to 5 000 events / 5 pages)
      const allEvents: ModifyLiquidityEvent[] = []
      let skip = 0
      while (allEvents.length < 5000) {
        const data = await this.client.request<{ modifyLiquidities: ModifyLiquidityEvent[] }>(
          GET_WALLET_MODIFY_LIQUIDITIES_V4,
          { owner: owner.toLowerCase(), skip }
        )
        const batch = data.modifyLiquidities ?? []
        allEvents.push(...batch)
        if (batch.length < 1000) break
        skip += 1000
      }

      if (allEvents.length === 0) return []

      // Aggregate by (poolId, tickLower, tickUpper)
      type Group = {
        pool: ModifyLiquidityEvent['pool']
        tickLower: string
        tickUpper: string
        netLiquidity: bigint
        deposited0: number
        deposited1: number
        withdrawn0: number
        withdrawn1: number
        depositUSD: number       // sum of amountUSD at mint-event time (historic)
        withdrawnUSD: number     // sum of amountUSD at burn-event time (historic)
        firstTimestamp: string   // earliest event = opened
        lastTimestamp: string    // latest event (for closed = approx close date)
      }
      const groups = new Map<string, Group>()

      for (const event of allEvents) {
        const key = `${event.pool.id}:${event.tickLower}:${event.tickUpper}`
        const g = groups.get(key) ?? {
          pool:           event.pool,
          tickLower:      event.tickLower,
          tickUpper:      event.tickUpper,
          netLiquidity:   0n,
          deposited0:     0,
          deposited1:     0,
          withdrawn0:     0,
          withdrawn1:     0,
          depositUSD:     0,
          withdrawnUSD:   0,
          firstTimestamp: event.timestamp,
          lastTimestamp:  event.timestamp,
        }
        const delta = BigInt(event.amount)
        const eventUSD = Math.abs(parseFloat(event.amountUSD ?? '0'))
        g.netLiquidity += delta
        if (delta > 0n) {
          g.deposited0 += Math.abs(parseFloat(event.amount0))
          g.deposited1 += Math.abs(parseFloat(event.amount1))
          g.depositUSD += eventUSD
        } else {
          g.withdrawn0 += Math.abs(parseFloat(event.amount0))
          g.withdrawn1 += Math.abs(parseFloat(event.amount1))
          g.withdrawnUSD += eventUSD
        }
        // Track first/last timestamps
        if (event.timestamp < g.firstTimestamp) g.firstTimestamp = event.timestamp
        if (event.timestamp > g.lastTimestamp)  g.lastTimestamp  = event.timestamp
        groups.set(key, g)
      }

      // Return both open (net liquidity > 0) and closed (net liquidity <= 0) positions.
      // Closed V4 positions are set to liquidity '0' so the enricher treats them correctly.
      return Array.from(groups.values())
        .map((g) => {
          const isOpen = g.netLiquidity > 0n
          return {
            id:                  `v4:${g.pool.id}:${g.tickLower}:${g.tickUpper}`,
            owner,
            pool:                g.pool,
            tickLower:           { tickIdx: g.tickLower },
            tickUpper:           { tickIdx: g.tickUpper },
            liquidity:           isOpen ? g.netLiquidity.toString() : '0',
            depositedToken0:     g.deposited0.toString(),
            depositedToken1:     g.deposited1.toString(),
            withdrawnToken0:     g.withdrawn0.toString(),
            withdrawnToken1:     g.withdrawn1.toString(),
            // V4 does not track per-position collected fees in the subgraph
            collectedFeesToken0: '0',
            collectedFeesToken1: '0',
            openedAtTimestamp:   g.firstTimestamp,
            closedAtTimestamp:   !isOpen ? g.lastTimestamp : undefined,
            historicDepositUSD:  g.depositUSD > 0 ? g.depositUSD : undefined,
            historicWithdrawnUSD: g.withdrawnUSD > 0 ? g.withdrawnUSD : undefined,
          }
        })
    } catch (error) {
      // Graceful fallback: chain may not have V4 subgraph yet
      console.warn(JSON.stringify({ warning: 'V4 wallet positions unavailable', ...context, error: String(error) }))
      return []
    }
  }

  /**
   * Fetches all V4 Position tokenIds for a wallet from the subgraph.
   * Used to compute on-chain uncollected fees (the tokenId is the salt in the position key).
   */
  async getWalletTokenIds(owner: string): Promise<string[]> {
    try {
      const data = await this.client.request<{ positions: Array<{ tokenId: string }> }>(
        GET_WALLET_TOKEN_IDS_V4,
        { owner: owner.toLowerCase() }
      )
      return (data.positions ?? []).map((p) => p.tokenId)
    } catch {
      return []
    }
  }
}

// ── Version Detection ─────────────────────────────────────────────────────────

/**
 * Detects pool version from the address/poolId string length.
 * - V3: 20-byte contract address → 42 chars (0x + 40 hex)
 * - V4: 32-byte PoolId hash      → 66 chars (0x + 64 hex)
 */
export function detectPoolVersion(address: string): 'v3' | 'v4' {
  return address.length === 66 ? 'v4' : 'v3'
}
