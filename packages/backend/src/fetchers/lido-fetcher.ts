import { cache } from '../cache/cache-manager.ts'

// ── Contract addresses (Ethereum mainnet) ─────────────────────────────────────

const STETH_ADDRESS  = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'

// RPC: Alchemy when key is available (same fallback strategy as onchain-fetcher.ts)
function getEthRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`
  return 'https://ethereum.publicnode.com'
}

// ── ABI selectors ─────────────────────────────────────────────────────────────
// keccak256('balanceOf(address)')[0:4]
const SEL_BALANCE_OF      = '0x70a08231'
// keccak256('stEthPerToken()')[0:4]
const SEL_STETH_PER_TOKEN = '0x035faf82'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LidoRewardDay {
  timeUnix:   number
  apr:        number
  rewardsEth: number   // per-day ETH reward
  rewardsUsd: number   // per-day USD reward (historic price from Lido API)
  balanceEth: number   // stETH balance after this event
}

export interface LidoPosition {
  walletAddress:      string
  stEthBalance:       number
  wstEthBalance:      number
  wstEthInEth:        number
  totalEthValue:      number   // stETH + wstEthInEth
  totalUSD:           number
  apr:                number   // current APR (latest rebase)
  averageApr:         number   // average APR over fetched period
  dailyRewardsEth:    number   // APR-based estimate from current balance
  yearlyRewardsEth:   number
  rewards30d:         LidoRewardDay[]
  totalRewards30dEth: number
  totalRewards30dUSD: number
  stEthPriceUsd:      number
  lastUpdated:        string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(getEthRpcUrl(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method:  'eth_call',
      params:  [{ to, data }, 'latest'],
      id:      1,
    }),
  })
  const json = await res.json() as { result?: string; error?: { message: string } }
  if (json.error) throw new Error(`eth_call error: ${json.error.message}`)
  return json.result ?? '0x' + '0'.repeat(64)
}

// wei hex string → ETH (float, 8 decimal precision)
function hexWeiToEth(hex: string): number {
  if (!hex || hex === '0x') return 0
  const wei = BigInt(hex)
  return Number(wei * 100_000_000n / (10n ** 18n)) / 100_000_000
}

// decimal wei string → ETH (float, 8 decimal precision)
function decWeiToEth(weiStr: string): number {
  if (!weiStr || weiStr === '0') return 0
  try {
    const wei = BigInt(weiStr)
    return Number(wei * 100_000_000n / (10n ** 18n)) / 100_000_000
  } catch {
    return parseFloat(weiStr)
  }
}

// ── Token balance reads ───────────────────────────────────────────────────────

async function getERC20Balance(tokenAddress: string, walletAddress: string): Promise<number> {
  const paddedWallet = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0')
  const result = await ethCall(tokenAddress, SEL_BALANCE_OF + paddedWallet)
  return hexWeiToEth(result)
}

async function getWstEthRate(): Promise<number> {
  const result = await ethCall(WSTETH_ADDRESS, SEL_STETH_PER_TOKEN)
  return hexWeiToEth(result)
}

// ── Lido Rewards API (stake.lido.fi) ──────────────────────────────────────────

interface LidoRewardsApiResponse {
  events: Array<{
    blockTime:      string
    apr:            string
    rewards:        string   // wei
    change:         string   // wei (same as rewards)
    balance:        string   // wei stETH balance after this event
    currencyChange: string   // USD value using historic price
    type:           string
  }>
  totals: {
    ethRewards:      string   // wei — total rewards in the period
    currencyRewards: string   // USD
  }
  averageApr:          string
  stETHCurrencyPrice:  { usd: number; eth: number }
}

async function getLidoRewardsFromApi(walletAddress: string, limit = 30): Promise<{
  events:         LidoRewardDay[]
  totalEth:       number
  totalUsd:       number
  averageApr:     number
  stEthPriceUsd:  number
}> {
  const url = new URL('https://stake.lido.fi/api/rewards')
  url.searchParams.set('address',      walletAddress)
  url.searchParams.set('currency',     'usd')
  url.searchParams.set('onlyRewards',  'false')
  url.searchParams.set('archiveRate',  'true')
  url.searchParams.set('skip',         '0')
  url.searchParams.set('limit',        String(limit))

  const res = await fetch(url.toString())
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      return { events: [], totalEth: 0, totalUsd: 0, averageApr: 0, stEthPriceUsd: 0 }
    }
    throw new Error(`Lido Rewards API error: ${res.status}`)
  }

  const json = await res.json() as LidoRewardsApiResponse

  const events: LidoRewardDay[] = (json.events ?? [])
    .filter((e) => e.type === 'reward')
    .map((e) => ({
      timeUnix:   parseInt(e.blockTime),
      apr:        parseFloat(e.apr),
      rewardsEth: decWeiToEth(e.rewards),
      rewardsUsd: parseFloat(e.currencyChange),
      balanceEth: decWeiToEth(e.balance),
    }))

  return {
    events,
    totalEth:      decWeiToEth(json.totals?.ethRewards ?? '0'),
    totalUsd:      parseFloat(json.totals?.currencyRewards ?? '0'),
    averageApr:    parseFloat(json.averageApr ?? '0'),
    stEthPriceUsd: json.stETHCurrencyPrice?.usd ?? 0,
  }
}

// ── Current APR (eth-api.lido.fi) ─────────────────────────────────────────────

async function getLidoCurrentAPR(): Promise<number> {
  try {
    const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/last')
    if (!res.ok) return 0
    const json = await res.json() as { data?: { apr?: number } }
    return json.data?.apr ?? 0
  } catch {
    return 0
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function getLidoPosition(walletAddress: string): Promise<LidoPosition> {
  const cacheKey = `lido:${walletAddress.toLowerCase()}`

  return cache.get(cacheKey, 'POOL', async () => {
    // Use allSettled so a single failing RPC / API call doesn't abort the whole fetch
    const [r0, r1, r2, r3, r4] = await Promise.allSettled([
      getERC20Balance(STETH_ADDRESS,  walletAddress),
      getERC20Balance(WSTETH_ADDRESS, walletAddress),
      getWstEthRate(),
      getLidoRewardsFromApi(walletAddress, 30),
      getLidoCurrentAPR(),
    ])

    const stEthBalance  = r0.status === 'fulfilled' ? r0.value : 0
    const wstEthBalance = r1.status === 'fulfilled' ? r1.value : 0
    const wstEthRate    = r2.status === 'fulfilled' ? r2.value : 0
    const rewardsData   = r3.status === 'fulfilled'
      ? r3.value
      : { events: [], totalEth: 0, totalUsd: 0, averageApr: 0, stEthPriceUsd: 0 }
    const currentApr    = r4.status === 'fulfilled' ? r4.value : 0

    const wstEthInEth   = wstEthBalance * wstEthRate
    const totalEthValue = stEthBalance + wstEthInEth

    // Use stETH price from Lido API (already includes current market rate)
    const stEthPriceUsd = rewardsData.stEthPriceUsd
    const totalUSD      = totalEthValue * stEthPriceUsd

    const apr = currentApr || rewardsData.averageApr
    const dailyRewardsEth  = totalEthValue * (apr / 100) / 365
    const yearlyRewardsEth = totalEthValue * (apr / 100)

    return {
      walletAddress,
      stEthBalance,
      wstEthBalance,
      wstEthInEth,
      totalEthValue,
      totalUSD,
      apr,
      averageApr:         rewardsData.averageApr,
      dailyRewardsEth,
      yearlyRewardsEth,
      rewards30d:         rewardsData.events,
      totalRewards30dEth: rewardsData.totalEth,
      totalRewards30dUSD: rewardsData.totalUsd,
      stEthPriceUsd,
      lastUpdated:        new Date().toISOString(),
    } satisfies LidoPosition
  })
}
