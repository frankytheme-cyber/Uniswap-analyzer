import { geckoTerminalLimiter } from './rate-limiter.ts'

const BASE_URL = 'https://api.geckoterminal.com/api/v2'

const CHAIN_SLUG: Record<string, string> = {
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  base:     'base',
  polygon:  'polygon_pos',
}

export interface GeckoPool {
  id:                  string
  address:             string
  name:                string
  base_token_symbol:   string
  quote_token_symbol:  string
  reserve_in_usd:      string
  volume_usd_h24:      string
  fee_tier:            string
}

async function fetchJson<T>(url: string): Promise<T> {
  await geckoTerminalLimiter.throttle()
  const res = await fetch(url, {
    headers: { Accept: 'application/json;version=20230302' },
  })
  if (!res.ok) {
    throw new Error(`GeckoTerminal ${res.status}: ${url}`)
  }
  return res.json() as Promise<T>
}

export class GeckoTerminalFetcher {
  private chainSlug: string

  constructor(chain: string) {
    const slug = CHAIN_SLUG[chain]
    if (!slug) {
      throw new Error(`GeckoTerminal: unsupported chain "${chain}"`)
    }
    this.chainSlug = slug
  }

  async getTopPoolsByDex(dex: string = 'uniswap_v3', page: number = 1): Promise<GeckoPool[]> {
    const url = `${BASE_URL}/networks/${this.chainSlug}/dexes/${dex}/pools?page=${page}`
    const data = await fetchJson<{ data: Array<{ attributes: GeckoPool }> }>(url)
    return data.data.map((d) => d.attributes)
  }

  async getPool(address: string): Promise<GeckoPool> {
    const url = `${BASE_URL}/networks/${this.chainSlug}/pools/${address.toLowerCase()}`
    const data = await fetchJson<{ data: { attributes: GeckoPool } }>(url)
    return data.data.attributes
  }
}
