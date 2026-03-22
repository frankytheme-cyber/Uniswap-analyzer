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
  symbol: string
  decimals: string
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

const GET_WALLET_POSITIONS = gql`
  query GetWalletPositions($owner: String!) {
    positions(
      first: 100
      where: { owner: $owner }
      orderBy: id
      orderDirection: desc
    ) {
      id
      owner
      pool {
        id
        token0 { symbol decimals }
        token1 { symbol decimals }
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
        token0 { symbol decimals }
        token1 { symbol decimals }
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
      timestamp
      origin
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
      const data = await this.client.request<{ positions: WalletPosition[] }>(
        GET_WALLET_POSITIONS,
        { owner: owner.toLowerCase() }
      )
      return data.positions ?? []
    } catch (error) {
      throw this.wrapError(error, context)
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
      }
      const groups = new Map<string, Group>()

      for (const event of allEvents) {
        const key = `${event.pool.id}:${event.tickLower}:${event.tickUpper}`
        const g = groups.get(key) ?? {
          pool:         event.pool,
          tickLower:    event.tickLower,
          tickUpper:    event.tickUpper,
          netLiquidity: 0n,
          deposited0:   0,
          deposited1:   0,
          withdrawn0:   0,
          withdrawn1:   0,
        }
        const delta = BigInt(event.amount)
        g.netLiquidity += delta
        if (delta > 0n) {
          g.deposited0 += Math.abs(parseFloat(event.amount0))
          g.deposited1 += Math.abs(parseFloat(event.amount1))
        } else {
          g.withdrawn0 += Math.abs(parseFloat(event.amount0))
          g.withdrawn1 += Math.abs(parseFloat(event.amount1))
        }
        groups.set(key, g)
      }

      // Only open positions (net liquidity > 0)
      return Array.from(groups.values())
        .filter((g) => g.netLiquidity > 0n)
        .map((g) => ({
          id:                  `v4:${g.pool.id}:${g.tickLower}:${g.tickUpper}`,
          owner,
          pool:                g.pool,
          tickLower:           { tickIdx: g.tickLower },
          tickUpper:           { tickIdx: g.tickUpper },
          liquidity:           g.netLiquidity.toString(),
          depositedToken0:     g.deposited0.toString(),
          depositedToken1:     g.deposited1.toString(),
          withdrawnToken0:     g.withdrawn0.toString(),
          withdrawnToken1:     g.withdrawn1.toString(),
          // V4 does not track per-position collected fees in the subgraph
          collectedFeesToken0: '0',
          collectedFeesToken1: '0',
        }))
    } catch (error) {
      // Graceful fallback: chain may not have V4 subgraph yet
      console.warn(JSON.stringify({ warning: 'V4 wallet positions unavailable', ...context, error: String(error) }))
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
