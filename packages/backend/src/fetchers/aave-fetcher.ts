/**
 * Aave V3 on-chain fetcher (Ethereum mainnet).
 *
 * Reads user positions directly from the Aave V3 Pool contract and related
 * token contracts, matching the approach used by the official Aave app.
 * No dependency on The Graph (the legacy hosted subgraph endpoint was shut down
 * in June 2024 and returned empty positions silently).
 *
 * Data flow (3 batched JSON-RPC round-trips):
 *   1. Pool.getUserAccountData(user) + Pool.getReservesList()
 *      + Pool.getUserConfiguration(user) + PoolAddressesProvider.getPriceOracle()
 *   2. For each reserve: Pool.getReserveData(asset), oracle.getAssetPrice(asset),
 *      ERC20.symbol(), ERC20.decimals()
 *   3. For each reserve: aToken.balanceOf(user), variableDebt.balanceOf(user),
 *      stableDebt.balanceOf(user)
 *
 * The RPC falls back to a public node if ALCHEMY_API_KEY is not set (same
 * pattern as onchain-fetcher.ts).
 */

import jsSha3 from 'js-sha3'
import { cache } from '../cache/cache-manager.ts'

const { keccak256: keccak256Hash } = jsSha3

// ── Aave V3 Ethereum addresses ────────────────────────────────────────────────

const POOL                    = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
const POOL_ADDRESSES_PROVIDER = '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e'

// ── Types (public API — unchanged from previous subgraph-backed impl) ─────────

export interface AaveSuppliedAsset {
  symbol:       string
  balance:      number
  balanceUSD:   number
  apy:          number
  isCollateral: boolean
}

export interface AaveBorrowedAsset {
  symbol:    string
  amount:    number
  amountUSD: number
  apy:       number
  rateMode:  'variable' | 'stable'
}

export interface AavePosition {
  walletAddress:    string
  totalSuppliedUSD: number
  totalBorrowedUSD: number
  netWorthUSD:      number
  healthFactor:     number
  netAPY:           number
  supplied:         AaveSuppliedAsset[]
  borrowed:         AaveBorrowedAsset[]
  lastUpdated:      string
}

// ── RPC ───────────────────────────────────────────────────────────────────────

function getRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`
  return 'https://ethereum.publicnode.com'
}

interface RpcRequest { id: number; to: string; data: string }

async function ethCallBatch(calls: RpcRequest[]): Promise<Map<number, string>> {
  const url = getRpcUrl()
  const body = calls.map(({ id, to, data }) => ({
    jsonrpc: '2.0', id,
    method:  'eth_call',
    params:  [{ to, data }, 'latest'],
  }))

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`RPC HTTP error ${res.status}`)

  const json = await res.json() as Array<{ id: number; result?: string; error?: { message: string } }>
  const map  = new Map<number, string>()
  for (const item of json) {
    // A few reserves (notably rebasing/oddball ERC20s) may revert on symbol() —
    // don't abort the whole batch, just record an empty hex result for that id.
    if (item.error) {
      map.set(item.id, '0x')
      continue
    }
    map.set(item.id, item.result ?? '0x')
  }
  return map
}

// ── ABI encoding / decoding helpers ───────────────────────────────────────────

function selector(signature: string): string {
  return '0x' + keccak256Hash(Buffer.from(signature, 'utf8')).slice(0, 8)
}

const SEL_GET_USER_ACCOUNT_DATA  = selector('getUserAccountData(address)')
const SEL_GET_USER_CONFIGURATION = selector('getUserConfiguration(address)')
const SEL_GET_RESERVES_LIST      = selector('getReservesList()')
const SEL_GET_PRICE_ORACLE       = selector('getPriceOracle()')
const SEL_GET_RESERVE_DATA       = selector('getReserveData(address)')
const SEL_GET_ASSET_PRICE        = selector('getAssetPrice(address)')
const SEL_SYMBOL                 = selector('symbol()')
const SEL_DECIMALS               = selector('decimals()')
const SEL_BALANCE_OF             = selector('balanceOf(address)')

function padAddress(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

function wordAt(hex: string, i: number): string {
  return hex.slice(2 + i * 64, 2 + i * 64 + 64)
}

function uintAt(hex: string, i: number): bigint {
  const w = wordAt(hex, i)
  if (!w) return 0n
  return BigInt('0x' + w)
}

function addressAt(hex: string, i: number): string {
  const w = wordAt(hex, i)
  if (!w) return '0x0000000000000000000000000000000000000000'
  return '0x' + w.slice(-40)
}

function decodeAddressArray(hex: string): string[] {
  if (!hex || hex.length <= 2 + 128) return []
  const len = Number(uintAt(hex, 1))
  const out: string[] = []
  for (let i = 0; i < len; i++) out.push(addressAt(hex, 2 + i))
  return out
}

function decodeString(hex: string): string {
  // Standard ABI string: word0 = offset, word1 = length, then bytes
  if (!hex || hex.length < 2 + 128) return decodeBytes32Ascii(hex)
  try {
    const len = Number(uintAt(hex, 1))
    if (len === 0 || len > 256) return decodeBytes32Ascii(hex)
    const bytesHex = hex.slice(2 + 64 * 2, 2 + 64 * 2 + len * 2)
    const s = Buffer.from(bytesHex, 'hex').toString('utf8')
    return s || decodeBytes32Ascii(hex)
  } catch {
    return decodeBytes32Ascii(hex)
  }
}

function decodeBytes32Ascii(hex: string): string {
  if (!hex || hex.length < 66) return '???'
  const buf = Buffer.from(hex.slice(2, 66), 'hex')
  let end = buf.length
  while (end > 0 && buf[end - 1] === 0) end--
  return buf.subarray(0, end).toString('utf8') || '???'
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

const RAY = 10n ** 27n

/** Convert RAY-scaled per-year rate to APR %. Matches Aave UI display convention. */
function rayToAPR(ray: bigint): number {
  return Number(ray * 10_000n / RAY) / 100
}

function toTokenAmount(raw: bigint, decimals: number): number {
  if (raw === 0n) return 0
  const d = 10n ** BigInt(decimals)
  // 8 decimal precision in JS float
  return Number(raw * 100_000_000n / d) / 100_000_000
}

/** Aave V3 healthFactor is uint256, 1e18-scaled. MaxUint256 means no borrows. */
function parseHealthFactor(raw: bigint): number {
  if (raw === 0n) return 0
  // Anything above ~2^200 is effectively max-uint (no borrows)
  if (raw > (1n << 200n)) return 0
  return Number(raw) / 1e18
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

function emptyAavePosition(walletAddress: string): AavePosition {
  return {
    walletAddress,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    netWorthUSD:      0,
    healthFactor:     0,
    netAPY:           0,
    supplied:         [],
    borrowed:         [],
    lastUpdated:      new Date().toISOString(),
  }
}

export async function getAavePosition(walletAddress: string): Promise<AavePosition> {
  const cacheKey = `aave:${walletAddress.toLowerCase()}`

  return cache.get(cacheKey, 'POOL', async () => {
    const user       = walletAddress.toLowerCase()
    const userPadded = padAddress(user)

    // ── Round 1 ────────────────────────────────────────────────────────────
    const r1 = await ethCallBatch([
      { id: 0, to: POOL,                     data: SEL_GET_USER_ACCOUNT_DATA  + userPadded },
      { id: 1, to: POOL,                     data: SEL_GET_RESERVES_LIST },
      { id: 2, to: POOL_ADDRESSES_PROVIDER,  data: SEL_GET_PRICE_ORACLE },
      { id: 3, to: POOL,                     data: SEL_GET_USER_CONFIGURATION + userPadded },
    ])

    const accountData    = r1.get(0) ?? '0x'
    const reservesList   = decodeAddressArray(r1.get(1) ?? '0x')
    const oracle         = addressAt(r1.get(2) ?? '0x', 0)
    const userConfig     = uintAt(r1.get(3) ?? '0x', 0)

    // Aggregate amounts are in oracle base currency (USD) with 1e8 precision.
    const totalCollateralBase = uintAt(accountData, 0)
    const totalDebtBase       = uintAt(accountData, 1)
    const healthFactorRaw     = uintAt(accountData, 5)

    // Fast path: wallet has no Aave positions at all
    if (totalCollateralBase === 0n && totalDebtBase === 0n) {
      return emptyAavePosition(walletAddress)
    }

    if (reservesList.length === 0) {
      return emptyAavePosition(walletAddress)
    }

    // ── Round 2 ────────────────────────────────────────────────────────────
    const r2calls: RpcRequest[] = []
    for (let i = 0; i < reservesList.length; i++) {
      const asset    = reservesList[i]
      const assetPad = padAddress(asset)
      r2calls.push({ id: i * 4 + 0, to: POOL,   data: SEL_GET_RESERVE_DATA + assetPad })
      r2calls.push({ id: i * 4 + 1, to: oracle, data: SEL_GET_ASSET_PRICE  + assetPad })
      r2calls.push({ id: i * 4 + 2, to: asset,  data: SEL_SYMBOL })
      r2calls.push({ id: i * 4 + 3, to: asset,  data: SEL_DECIMALS })
    }
    const r2 = await ethCallBatch(r2calls)

    interface ReserveMeta {
      asset:                    string
      id:                       number
      symbol:                   string
      decimals:                 number
      priceUsd:                 number
      aTokenAddress:            string
      stableDebtTokenAddress:   string
      variableDebtTokenAddress: string
      liquidityRate:            bigint
      variableBorrowRate:       bigint
      stableBorrowRate:         bigint
    }

    const metas: ReserveMeta[] = []
    for (let i = 0; i < reservesList.length; i++) {
      const rd = r2.get(i * 4 + 0) ?? '0x'
      const pr = r2.get(i * 4 + 1) ?? '0x'
      const sy = r2.get(i * 4 + 2) ?? '0x'
      const de = r2.get(i * 4 + 3) ?? '0x'

      // Each field of ReserveData is padded to 32 bytes in ABI encoding.
      //   word 2 = currentLiquidityRate (RAY)
      //   word 4 = currentVariableBorrowRate (RAY)
      //   word 5 = currentStableBorrowRate (RAY)
      //   word 7 = reserve id (uint16)
      //   word 8 = aTokenAddress
      //   word 9 = stableDebtTokenAddress
      //   word 10 = variableDebtTokenAddress
      const priceRaw = uintAt(pr, 0)   // USD * 1e8

      metas.push({
        asset:                    reservesList[i],
        id:                       Number(uintAt(rd, 7)),
        symbol:                   decodeString(sy),
        decimals:                 Number(uintAt(de, 0)) || 18,
        priceUsd:                 Number(priceRaw) / 1e8,
        aTokenAddress:            addressAt(rd, 8),
        stableDebtTokenAddress:   addressAt(rd, 9),
        variableDebtTokenAddress: addressAt(rd, 10),
        liquidityRate:            uintAt(rd, 2),
        variableBorrowRate:       uintAt(rd, 4),
        stableBorrowRate:         uintAt(rd, 5),
      })
    }

    // ── Round 3 ────────────────────────────────────────────────────────────
    const r3calls: RpcRequest[] = []
    for (let i = 0; i < metas.length; i++) {
      const m = metas[i]
      r3calls.push({ id: i * 3 + 0, to: m.aTokenAddress,            data: SEL_BALANCE_OF + userPadded })
      r3calls.push({ id: i * 3 + 1, to: m.variableDebtTokenAddress, data: SEL_BALANCE_OF + userPadded })
      r3calls.push({ id: i * 3 + 2, to: m.stableDebtTokenAddress,   data: SEL_BALANCE_OF + userPadded })
    }
    const r3 = await ethCallBatch(r3calls)

    const supplied: AaveSuppliedAsset[] = []
    const borrowed: AaveBorrowedAsset[] = []

    for (let i = 0; i < metas.length; i++) {
      const m = metas[i]
      const aBal = uintAt(r3.get(i * 3 + 0) ?? '0x', 0)
      const vBal = uintAt(r3.get(i * 3 + 1) ?? '0x', 0)
      const sBal = uintAt(r3.get(i * 3 + 2) ?? '0x', 0)

      if (aBal > 0n) {
        const balance = toTokenAmount(aBal, m.decimals)
        // userConfiguration bitmap: bit (2*id + 1) = "used as collateral"
        const isCollateral = ((userConfig >> BigInt(2 * m.id + 1)) & 1n) === 1n
        supplied.push({
          symbol:     m.symbol,
          balance,
          balanceUSD: balance * m.priceUsd,
          apy:        rayToAPR(m.liquidityRate),
          isCollateral,
        })
      }

      if (vBal > 0n) {
        const amount = toTokenAmount(vBal, m.decimals)
        borrowed.push({
          symbol:    m.symbol,
          amount,
          amountUSD: amount * m.priceUsd,
          apy:       rayToAPR(m.variableBorrowRate),
          rateMode:  'variable',
        })
      }

      if (sBal > 0n) {
        const amount = toTokenAmount(sBal, m.decimals)
        borrowed.push({
          symbol:    m.symbol,
          amount,
          amountUSD: amount * m.priceUsd,
          apy:       rayToAPR(m.stableBorrowRate),
          rateMode:  'stable',
        })
      }
    }

    // Totals: sum all supplied/borrowed assets to match the Aave UI.
    // (Pool.getUserAccountData.totalCollateralBase excludes non-collateral
    // supplies, so it underreports the "Your supplies" figure.)
    const totalSuppliedUSD = supplied.reduce((s, a) => s + a.balanceUSD, 0)
    const totalBorrowedUSD = borrowed.reduce((s, a) => s + a.amountUSD, 0)
    const netWorthUSD      = totalSuppliedUSD - totalBorrowedUSD
    const healthFactor     = parseHealthFactor(healthFactorRaw)

    const supplyIncome = supplied.reduce((s, a) => s + a.balanceUSD * a.apy / 100, 0)
    const borrowCost   = borrowed.reduce((s, a) => s + a.amountUSD * a.apy / 100, 0)
    const netAPY       = totalSuppliedUSD > 0
      ? ((supplyIncome - borrowCost) / totalSuppliedUSD) * 100
      : 0

    return {
      walletAddress,
      totalSuppliedUSD,
      totalBorrowedUSD,
      netWorthUSD,
      healthFactor,
      netAPY,
      supplied,
      borrowed,
      lastUpdated: new Date().toISOString(),
    } satisfies AavePosition
  })
}
