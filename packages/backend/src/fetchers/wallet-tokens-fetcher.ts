/**
 * Fetches native + ERC-20 token balances for a wallet address.
 *
 * Strategy:
 *  - Native token (ETH/POL): always via eth_getBalance
 *  - ERC-20 with ALCHEMY_API_KEY: alchemy_getTokenBalances + alchemy_getTokenMetadata
 *  - ERC-20 fallback (no key): hardcoded list of ~6 most common tokens per chain
 *  - Prices: DeFiLlama coins API (free, no key required)
 *
 * Returns tokens sorted by USD value descending; filters out dust (< $0.01).
 */

// ── RPC endpoints ─────────────────────────────────────────────────────────────

const ALCHEMY_RPC: Record<string, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2',
  base:     'https://base-mainnet.g.alchemy.com/v2',
  polygon:  'https://polygon-mainnet.g.alchemy.com/v2',
}

const PUBLIC_RPC: Record<string, string> = {
  ethereum: 'https://ethereum.publicnode.com',
  arbitrum: 'https://arbitrum.publicnode.com',
  base:     'https://base.publicnode.com',
  polygon:  'https://polygon-bor.publicnode.com',
}

function getRpcUrl(chain: string): string {
  const key = process.env.ALCHEMY_API_KEY
  if (key) return `${ALCHEMY_RPC[chain]}/${key}`
  return PUBLIC_RPC[chain]
}

// ── Native token metadata per chain ──────────────────────────────────────────

const NATIVE: Record<string, { symbol: string; name: string; coingeckoId: string; decimals: number }> = {
  ethereum: { symbol: 'ETH',  name: 'Ether',           coingeckoId: 'ethereum',     decimals: 18 },
  arbitrum: { symbol: 'ETH',  name: 'Ether',           coingeckoId: 'ethereum',     decimals: 18 },
  base:     { symbol: 'ETH',  name: 'Ether',           coingeckoId: 'ethereum',     decimals: 18 },
  polygon:  { symbol: 'POL',  name: 'POL (ex-MATIC)',  coingeckoId: 'matic-network', decimals: 18 },
}

// DeFiLlama chain name → same as our chain name for these four
const DEFILLAMA_CHAIN: Record<string, string> = {
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  base:     'base',
  polygon:  'polygon',
}

// ── ERC-20 fallback list (used when no ALCHEMY_API_KEY) ───────────────────────

interface TokenMeta {
  address:  string
  symbol:   string
  name:     string
  decimals: number
}

const FALLBACK_TOKENS: Record<string, TokenMeta[]> = {
  ethereum: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC',  name: 'USD Coin',        decimals: 6  },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT',  name: 'Tether USD',      decimals: 6  },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI',   name: 'Dai',             decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH',  name: 'Wrapped Ether',   decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC',  name: 'Wrapped Bitcoin', decimals: 8  },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI',   name: 'Uniswap',         decimals: 18 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK',  name: 'Chainlink',       decimals: 18 },
  ],
  arbitrum: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC',  name: 'USD Coin',        decimals: 6  },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT',  name: 'Tether USD',      decimals: 6  },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI',   name: 'Dai',             decimals: 18 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH',  name: 'Wrapped Ether',   decimals: 18 },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB',   name: 'Arbitrum',        decimals: 18 },
    { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC',  name: 'Wrapped Bitcoin', decimals: 8  },
  ],
  base: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC',  name: 'USD Coin',              decimals: 6  },
    { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI',   name: 'Dai',                   decimals: 18 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH',  name: 'Wrapped Ether',         decimals: 18 },
    { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'cbETH', name: 'Coinbase Wrapped stETH', decimals: 18 },
  ],
  polygon: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC',   name: 'USD Coin',     decimals: 6  },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT',   name: 'Tether USD',   decimals: 6  },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI',    name: 'Dai',          decimals: 18 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH',   name: 'Wrapped Ether', decimals: 18 },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped POL',  decimals: 18 },
  ],
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WalletToken {
  symbol:     string
  name:       string
  address:    string      // contract address or 'native'
  balance:    number
  balanceUSD: number
  priceUSD:   number
  decimals:   number
}

export interface WalletTokensResult {
  walletAddress: string
  chain:         string
  tokens:        WalletToken[]
  totalUSD:      number
  lastUpdated:   string
}

// ── ABI helpers ───────────────────────────────────────────────────────────────

// keccak256('balanceOf(address)')[0:4]
const SEL_BALANCE_OF = '0x70a08231'

function encodeAddress(addr: string): string {
  return addr.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
}

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const json = await res.json() as { result?: unknown; error?: { message: string } }
  if (json.error) throw new Error(`RPC error: ${json.error.message}`)
  return json.result
}

async function rpcBatch(url: string, requests: { id: number; method: string; params: unknown[] }[]): Promise<{ id: number; result?: string; error?: { message: string } }[]> {
  const body = requests.map((r) => ({ jsonrpc: '2.0', ...r }))
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`RPC batch HTTP ${res.status}`)
  return res.json() as Promise<{ id: number; result?: string; error?: { message: string } }[]>
}

// ── Balance fetchers ──────────────────────────────────────────────────────────

async function getNativeBalance(chain: string, address: string): Promise<bigint> {
  const result = await rpcCall(getRpcUrl(chain), 'eth_getBalance', [address, 'latest'])
  return BigInt(result as string)
}

/** Batch balanceOf() calls for a list of ERC-20 contracts. */
async function getErc20BalancesBatch(chain: string, walletAddress: string, tokens: TokenMeta[]): Promise<Map<string, bigint>> {
  if (tokens.length === 0) return new Map()

  const rpcUrl  = getRpcUrl(chain)
  const callData = SEL_BALANCE_OF + encodeAddress(walletAddress)

  const requests = tokens.map((t, i) => ({
    id:     i + 1,
    method: 'eth_call',
    params: [{ to: t.address, data: callData }, 'latest'],
  }))

  const responses = await rpcBatch(rpcUrl, requests)
  const balances  = new Map<string, bigint>()

  for (const r of responses) {
    const token = tokens[r.id - 1]
    if (r.result && r.result !== '0x' && r.result !== '0x' + '0'.repeat(64)) {
      try { balances.set(token.address.toLowerCase(), BigInt(r.result)) } catch { /* skip */ }
    }
  }
  return balances
}

// ── Alchemy-specific helpers ──────────────────────────────────────────────────

interface AlchemyTokenBalance {
  contractAddress: string
  tokenBalance:    string
}

interface AlchemyTokenMeta {
  symbol:   string | null
  name:     string | null
  decimals: number | null
  logo:     string | null
}

const ZERO_HEX = '0x' + '0'.repeat(64)

async function alchemyGetTokenBalances(chain: string, walletAddress: string): Promise<AlchemyTokenBalance[]> {
  const apiKey = process.env.ALCHEMY_API_KEY!
  const url    = `${ALCHEMY_RPC[chain]}/${apiKey}`

  const result = await rpcCall(url, 'alchemy_getTokenBalances', [walletAddress, 'erc20']) as {
    tokenBalances: AlchemyTokenBalance[]
  }

  return (result.tokenBalances ?? []).filter(
    (t) => t.tokenBalance && t.tokenBalance !== ZERO_HEX,
  )
}

async function alchemyGetTokenMetadataBatch(chain: string, addresses: string[]): Promise<Map<string, AlchemyTokenMeta>> {
  if (addresses.length === 0) return new Map()

  const apiKey = process.env.ALCHEMY_API_KEY!
  const url    = `${ALCHEMY_RPC[chain]}/${apiKey}`

  const requests = addresses.map((addr, i) => ({
    id:     i + 1,
    method: 'alchemy_getTokenMetadata',
    params: [addr],
  }))

  const responses = await rpcBatch(url, requests) as { id: number; result?: AlchemyTokenMeta }[]
  const metadata  = new Map<string, AlchemyTokenMeta>()

  for (const r of responses) {
    const addr = addresses[r.id - 1]
    if (r.result?.symbol) {
      metadata.set(addr.toLowerCase(), r.result)
    }
  }
  return metadata
}

// ── DeFiLlama price fetcher ───────────────────────────────────────────────────

interface DefiLlamaCoinsResponse {
  coins: Record<string, { price: number; symbol: string; decimals?: number; confidence?: number }>
}

/**
 * Fetches prices from DeFiLlama coins API.
 * Returns Map<identifier, priceUSD> where identifier is:
 *   - `coingecko:{id}` for native tokens
 *   - `{chainlc}:{address_lower}` for ERC-20s
 */
async function fetchDeFiLlamaPrices(coinIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  if (coinIds.length === 0) return prices

  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${coinIds.join(',')}`)
    if (!res.ok) return prices

    const data = await res.json() as DefiLlamaCoinsResponse
    for (const [key, info] of Object.entries(data.coins ?? {})) {
      if (info?.price) prices.set(key.toLowerCase(), info.price)
    }
  } catch { /* ignore — tokens will show 0 USD */ }

  return prices
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getWalletTokens(chain: string, walletAddress: string): Promise<WalletTokensResult> {
  const native       = NATIVE[chain]
  const defillamaChain = DEFILLAMA_CHAIN[chain]
  const apiKey       = process.env.ALCHEMY_API_KEY

  // ── 1. Native token balance ─────────────────────────────────────────────────
  const nativeWei     = await getNativeBalance(chain, walletAddress)
  const nativeBalance = Number(nativeWei) / Math.pow(10, native.decimals)

  // ── 2. ERC-20 balances ──────────────────────────────────────────────────────
  let tokenList: TokenMeta[] = []
  let erc20Balances = new Map<string, bigint>()

  if (apiKey && ALCHEMY_RPC[chain]) {
    try {
      const rawBalances = await alchemyGetTokenBalances(chain, walletAddress)
      const addresses   = rawBalances.map((t) => t.contractAddress)
      const metadata    = await alchemyGetTokenMetadataBatch(chain, addresses)

      for (const { contractAddress, tokenBalance } of rawBalances) {
        const meta = metadata.get(contractAddress.toLowerCase())
        if (meta?.symbol && meta.decimals != null) {
          tokenList.push({
            address:  contractAddress,
            symbol:   meta.symbol,
            name:     meta.name ?? meta.symbol,
            decimals: meta.decimals,
          })
          try { erc20Balances.set(contractAddress.toLowerCase(), BigInt(tokenBalance)) } catch { /* skip */ }
        }
      }
    } catch {
      // Alchemy failed → fall back to hardcoded list
      tokenList    = FALLBACK_TOKENS[chain] ?? []
      erc20Balances = await getErc20BalancesBatch(chain, walletAddress, tokenList)
    }
  } else {
    tokenList    = FALLBACK_TOKENS[chain] ?? []
    erc20Balances = await getErc20BalancesBatch(chain, walletAddress, tokenList)
  }

  // ── 3. Fetch prices (DeFiLlama) ─────────────────────────────────────────────
  const nativeCoinId  = `coingecko:${native.coingeckoId}`
  const erc20CoinIds  = tokenList.map((t) => `${defillamaChain}:${t.address.toLowerCase()}`)
  const allCoinIds    = [nativeCoinId, ...erc20CoinIds]

  const prices = await fetchDeFiLlamaPrices(allCoinIds)

  // ── 4. Build token list ─────────────────────────────────────────────────────
  const nativePriceUSD = prices.get(nativeCoinId.toLowerCase()) ?? 0
  const tokens: WalletToken[] = []

  // Native token (show if any balance > dust)
  if (nativeBalance > 0.000001) {
    tokens.push({
      symbol:     native.symbol,
      name:       native.name,
      address:    'native',
      balance:    nativeBalance,
      balanceUSD: nativeBalance * nativePriceUSD,
      priceUSD:   nativePriceUSD,
      decimals:   native.decimals,
    })
  }

  // ERC-20 tokens
  for (const token of tokenList) {
    const rawBalance = erc20Balances.get(token.address.toLowerCase()) ?? 0n
    if (rawBalance === 0n) continue

    const balance   = Number(rawBalance) / Math.pow(10, token.decimals)
    const coinId    = `${defillamaChain}:${token.address.toLowerCase()}`
    const priceUSD  = prices.get(coinId) ?? 0
    const balanceUSD = balance * priceUSD

    // Skip dust: < $0.01 when price is known
    if (priceUSD > 0 && balanceUSD < 0.01) continue

    tokens.push({
      symbol:     token.symbol,
      name:       token.name,
      address:    token.address,
      balance,
      balanceUSD,
      priceUSD,
      decimals:   token.decimals,
    })
  }

  // Sort by USD value descending, unknowns (0 USD) at the bottom
  tokens.sort((a, b) => b.balanceUSD - a.balanceUSD)

  const totalUSD = tokens.reduce((s, t) => s + t.balanceUSD, 0)

  return {
    walletAddress: walletAddress.toLowerCase(),
    chain,
    tokens,
    totalUSD,
    lastUpdated: new Date().toISOString(),
  }
}
