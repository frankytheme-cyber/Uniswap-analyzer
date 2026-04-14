export interface ParameterScore {
  id:           string
  score:        0 | 1
  value:        number
  displayValue: string
  label:        string
  status:       'good' | 'warn' | 'bad'
  detail:       string
  rawData?:     Record<string, string | number>
}

export interface PoolAnalysis {
  poolAddress:   string
  chain:         string
  token0:        string
  token1:        string
  feeTier:       number
  version:       'v3' | 'v4'
  hooks?:        string    // solo V4: indirizzo contratto hook
  parameters:    ParameterScore[]
  overallScore:  number
  overallStatus: 'healthy' | 'caution' | 'risk'
  lastUpdated:   string
}

export interface WatchlistEntry {
  id:       string
  chain:    string
  address:  string
  addedAt:  string
}

export interface DayData {
  date:      number
  tvlUSD:    string
  volumeUSD: string
  feesUSD:   string
  txCount:   string
  open:      string
  high:      string
  low:       string
  close:     string
}

export interface RawPool {
  id:                    string
  tick:                  string
  liquidity:             string
  sqrtPrice:             string
  totalValueLockedUSD:   string
  feeTier:               string
  token0:                { symbol: string; decimals: string }
  token1:                { symbol: string; decimals: string }
}

export interface Tick {
  tickIdx:       string
  liquidityNet:  string
  liquidityGross: string
  price0:        string
  price1:        string
}

export type Chain = 'ethereum' | 'arbitrum' | 'base' | 'polygon'

export interface ILPoint {
  priceMultiplier: number
  ilPercent: number
  feeOffsetDays: number
}

export interface ILResult {
  points: ILPoint[]
  currentFeeAPR: number
}

// ── Strategy Advisor ──────────────────────────────────────────────────────────

export interface Strategy {
  id:                   'passive' | 'narrow' | 'asymmetric-up' | 'defensive'
  name:                 string
  regime:               'any' | 'sideways' | 'bullish' | 'bearish'
  rangeMinPercent:      number
  rangeMaxPercent:      number
  description:          string
  risks:                string[]
  rebalancingFrequency: 'never' | 'monthly' | 'on-10pct-move'
}

export interface StrategyAnalysis {
  detectedRegime:      'bullish' | 'bearish' | 'sideways'
  ema7:                number
  ema30:               number
  volatility30d:       number
  recommendedStrategy: Strategy
  allStrategies:       Strategy[]
}

// ── IL Simulator (multi-strategia) ───────────────────────────────────────────

export interface ILDataPoint {
  priceMultiplier:    number
  priceChangePercent: number
  ilPercent:          number
  feeOffsetDays:      number
  inRange:            boolean
  token0Percent:      number
  token1Percent:      number
}

export interface ILPerStrategy {
  strategyId:      string
  strategyName:    string
  rangeMinPercent: number
  rangeMaxPercent: number
  currentFeeAPR:   number
  points:          ILDataPoint[]
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  chain:           string
  pools:           PoolAnalysis[]
  totalCandidates: number
  analyzedCount:   number
  lastUpdated:     string
}

// ── Wallet Positions ──────────────────────────────────────────────────────────

export interface WalletPosition {
  id:               string
  version:          'v3' | 'v4'
  status:           'open' | 'closed'
  poolId:           string
  token0:           string
  token1:           string
  feeTier:          number
  feeTierPercent:   number
  tickLower:        number
  tickUpper:        number
  priceLower:       number
  priceUpper:       number
  currentPrice:     number
  liquidity:        string
  inRange:          boolean
  currentTick:      number
  openedAt:         string | null
  closedAt:         string | null
  openTxHash:       string | null
  closeTxHash:      string | null
  depositedToken0:  number
  depositedToken1:  number
  initialValueUSD:  number
  withdrawnToken0:  number
  withdrawnToken1:  number
  withdrawnValueUSD: number
  currentAmount0:   number
  currentAmount1:   number
  currentValueUSD:  number
  netToken0:        number
  netToken1:        number
  collectedFees0:   number
  collectedFees1:   number
  collectedFeesUSD: number
  uncollectedFees0: number
  uncollectedFees1: number
  uncollectedFeesUSD: number
  ilPercent:        number | null
  pnlPercent:       number | null
  pnlVsHodlUSD:    number | null
  poolTvlUSD:       number
}

export interface WalletPositionsResponse {
  chain:       string
  wallet:      string
  positions:   WalletPosition[]
  totalOpen:   number
  totalClosed: number
  inRange:     number
  outOfRange:  number
  v3Count:     number
  v4Count:     number
  totalUncollectedFeesUSD: number
  totalCollectedFeesUSD:   number
  totalFeesUSD:            number
  lastUpdated: string
}

// ── Lido Finance ──────────────────────────────────────────────────────────────

export interface LidoRewardDay {
  timeUnix:   number
  apr:        number
  rewardsEth: number   // per-day ETH reward
  rewardsUsd: number   // per-day USD reward (historic price from Lido API)
  balanceEth: number   // stETH balance after this event
}

export interface LidoPosition {
  walletAddress:      string
  stEthBalance:       number   // ETH
  wstEthBalance:      number   // wstETH tokens
  wstEthInEth:        number   // wstETH converted to ETH equivalent
  totalEthValue:      number   // stETH + wstEthInEth
  totalUSD:           number
  apr:                number   // current APR (latest rebase)
  averageApr:         number   // average over fetched period
  dailyRewardsEth:    number   // APR-based estimate
  yearlyRewardsEth:   number
  rewards30d:         LidoRewardDay[]
  totalRewards30dEth: number
  totalRewards30dUSD: number
  stEthPriceUsd:      number
  lastUpdated:        string
}

// ── Aave Finance ─────────────────────────────────────────────────────────────

export interface AaveSuppliedAsset {
  symbol:       string
  balance:      number   // underlying token amount
  balanceUSD:   number
  apy:          number   // supply APY (%)
  isCollateral: boolean
}

export interface AaveBorrowedAsset {
  symbol:    string
  amount:    number
  amountUSD: number
  apy:       number      // borrow APY (%)
  rateMode:  'variable' | 'stable'
}

export interface AavePosition {
  walletAddress:    string
  totalSuppliedUSD: number
  totalBorrowedUSD: number
  netWorthUSD:      number
  healthFactor:     number   // 0 = no borrows / not applicable
  netAPY:           number   // weighted net APY (%)
  supplied:         AaveSuppliedAsset[]
  borrowed:         AaveBorrowedAsset[]
  lastUpdated:      string
}

// ── Backtesting ───────────────────────────────────────────────────────────────

export interface BacktestResult {
  strategyId:                string
  periodDays:                number
  totalFeesUSD:              number
  totalILPercent:            number
  totalGasCostEstimateUSD:   number
  netPnlPercent:             number
  hodlReturnPercent:         number
  timeInRangePercent:        number
  rebalancingCount:          number
  rebalancingWarning:        string | null
}
