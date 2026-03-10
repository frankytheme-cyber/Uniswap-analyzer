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
