/**
 * On-chain fetcher for data not available in The Graph subgraph.
 *
 * Uses raw JSON-RPC (eth_call) via Alchemy or a public RPC — no extra dependencies
 * (except js-sha3 for keccak256, needed for V4 storage slot computation).
 *
 * Computes uncollected (pending) LP fees for both V3 and V4 positions.
 *
 * V3: reads NonfungiblePositionManager.positions() + Pool contract view functions.
 * V4: reads PoolManager internal storage via extsload() + keccak256 slot computation.
 *
 * Formula (same for V3 and V4, Uniswap whitepaper):
 *   feeGrowthInside = feeGrowthGlobal - feeGrowthBelow(tickLower) - feeGrowthAbove(tickUpper)
 *   fees = liquidity × (feeGrowthInside − feeGrowthInsideLastX128) / 2^128
 *
 * All intermediate values are uint256 with wrapping arithmetic (mod 2^256).
 */

import jsSha3 from 'js-sha3'
const { keccak256: keccak256Hash } = jsSha3

// ── Constants ─────────────────────────────────────────────────────────────────

const MASK256 = (1n << 256n) - 1n
const Q128    = 1n << 128n

// ── V3 Contract addresses ─────────────────────────────────────────────────────

const NFT_POSITION_MANAGER = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'

// V3 function selectors
const SEL_POSITIONS    = '0x99fbab88'   // positions(uint256)
const SEL_FG0          = '0xf3058399'   // feeGrowthGlobal0X128()
const SEL_FG1          = '0x46141319'   // feeGrowthGlobal1X128()
const SEL_TICKS        = '0xf30dba93'   // ticks(int24)

// ── V4 Contract addresses ─────────────────────────────────────────────────────

// PoolManager — singleton, same address on all chains (deployed Jan 31 2025)
const POOL_MANAGER_V4 = '0x000000000004444c5dc75cB358380D2e3dE08A90'

// V4 PositionManager address per chain (the `sender` in ModifyLiquidity events)
const V4_POSITION_MANAGER: Record<string, string> = {
  ethereum: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e',
  base:     '0x7C5f5A4bBd8fD63184577525326123B519429bDc',
  polygon:  '0x1Ec2eBf4F37FA7b5dB78f2fAFdBEf0C2345cA380',
}

// PoolManager.extsload(bytes32) selector
const SEL_EXTSLOAD = '0x1e2eaeaf'

// PoolManager internal storage: `mapping(PoolId => Pool.State) internal _pools;`
// is at mapping slot 6.
const POOLS_MAPPING_SLOT = 6n

// Pool.State struct storage offsets:
//   slot0 (sqrtPriceX96 + tick + protocolFee + lpFee)  → +0
//   feeGrowthGlobal0X128                                → +1
//   feeGrowthGlobal1X128                                → +2
//   liquidity                                           → +3
//   mapping(int24 => TickInfo) ticks                    → +4  (virtual)
//   mapping(int16 => uint256)  tickBitmap               → +5  (virtual)
//   mapping(bytes32 => Position.State) positions        → +6  (virtual)

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

// ── ABI encoding / decoding helpers ───────────────────────────────────────────

/** uint256 → 32-byte hex (no 0x prefix) */
function encodeUint256(n: bigint): string {
  return (n & MASK256).toString(16).padStart(64, '0')
}

/** int24 (tick) → 32-byte hex as int256 (sign-extended, no 0x prefix) */
function encodeTick(tick: number): string {
  const v = tick < 0 ? (BigInt(tick) + (1n << 256n)) : BigInt(tick)
  return v.toString(16).padStart(64, '0')
}

/** int24 (tick) → 3-byte hex (two's complement, no 0x prefix) */
function int24ToHex(v: number): string {
  return (v < 0 ? (v + 0x1000000) : v).toString(16).padStart(6, '0')
}

/** Read 32-byte word at slot i from a 0x-prefixed hex string as uint256 BigInt */
function word(hex: string, i: number): bigint {
  return BigInt('0x' + hex.slice(2 + i * 64, 2 + i * 64 + 64))
}

/** keccak256 of raw hex bytes (no 0x prefix) → hex string (no 0x prefix) */
function keccak256(hexStr: string): string {
  return keccak256Hash(Buffer.from(hexStr, 'hex'))
}

// ── JSON-RPC batch helper ─────────────────────────────────────────────────────

interface RpcRequest  { id: number; to: string; data: string }
interface RpcResponse { id: number; result: string }

/**
 * Sends multiple eth_call requests in a single HTTP batch to reduce round-trips.
 * Returns results indexed by their original id.
 */
async function ethCallBatch(rpcUrl: string, calls: RpcRequest[]): Promise<Map<number, string>> {
  const body = calls.map(({ id, to, data }) => ({
    jsonrpc: '2.0', id,
    method:  'eth_call',
    params:  [{ to, data }, 'latest'],
  }))

  const response = await fetch(rpcUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`RPC HTTP error: ${response.status}`)

  const json = await response.json() as RpcResponse[]
  const map  = new Map<number, string>()
  for (const item of json) {
    map.set(item.id, item.result ?? '0x')
  }
  return map
}

// ── Shared fee computation ────────────────────────────────────────────────────

export interface UncollectedFees {
  fees0: bigint   // raw token0 units (not yet divided by 10^decimals)
  fees1: bigint
}

/**
 * Core feeGrowthInside formula, used by both V3 and V4.
 */
function computeFees(
  fg0: bigint, fg1: bigint,
  fgo0Lower: bigint, fgo1Lower: bigint,
  fgo0Upper: bigint, fgo1Upper: bigint,
  fgi0Last: bigint, fgi1Last: bigint,
  liquidity: bigint,
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): UncollectedFees {
  // feeGrowthBelow(tickLower)
  const fgb0 = currentTick >= tickLower ? fgo0Lower : (fg0 - fgo0Lower) & MASK256
  const fgb1 = currentTick >= tickLower ? fgo1Lower : (fg1 - fgo1Lower) & MASK256

  // feeGrowthAbove(tickUpper)
  const fga0 = currentTick < tickUpper ? fgo0Upper : (fg0 - fgo0Upper) & MASK256
  const fga1 = currentTick < tickUpper ? fgo1Upper : (fg1 - fgo1Upper) & MASK256

  // feeGrowthInside (current) — wrapping subtraction mod 2^256
  const fgi0 = (fg0 - fgb0 - fga0) & MASK256
  const fgi1 = (fg1 - fgb1 - fga1) & MASK256

  // fees = liquidity × (feeGrowthInside − feeGrowthInsideLast) / 2^128
  const fees0 = (liquidity * ((fgi0 - fgi0Last) & MASK256)) / Q128
  const fees1 = (liquidity * ((fgi1 - fgi1Last) & MASK256)) / Q128

  return { fees0, fees1 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// V3 — reads via NonfungiblePositionManager + Pool contract view functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes uncollected fees for a single V3 position using on-chain data.
 *
 * Sends 5 eth_calls in one HTTP batch:
 *   1. NonfungiblePositionManager.positions(tokenId)
 *   2. Pool.feeGrowthGlobal0X128()
 *   3. Pool.feeGrowthGlobal1X128()
 *   4. Pool.ticks(tickLower)
 *   5. Pool.ticks(tickUpper)
 */
export async function getUncollectedFeesV3(
  chain:       string,
  tokenId:     string,
  poolAddress: string,
  tickLower:   number,
  tickUpper:   number,
  currentTick: number,
): Promise<UncollectedFees> {
  try {
    const rpcUrl = getRpcUrl(chain)

    const calls: RpcRequest[] = [
      { id: 0, to: NFT_POSITION_MANAGER, data: SEL_POSITIONS + encodeUint256(BigInt(tokenId)) },
      { id: 1, to: poolAddress,          data: SEL_FG0 },
      { id: 2, to: poolAddress,          data: SEL_FG1 },
      { id: 3, to: poolAddress,          data: SEL_TICKS + encodeTick(tickLower) },
      { id: 4, to: poolAddress,          data: SEL_TICKS + encodeTick(tickUpper) },
    ]

    const results = await ethCallBatch(rpcUrl, calls)

    // NonfungiblePositionManager.positions: [7]=liquidity, [8]=fgi0Last, [9]=fgi1Last
    const posData = results.get(0)!
    const liquidity = word(posData, 7)
    const fgi0Last  = word(posData, 8)
    const fgi1Last  = word(posData, 9)

    const fg0 = word(results.get(1)!, 0)
    const fg1 = word(results.get(2)!, 0)

    // Pool.ticks: [2]=feeGrowthOutside0X128, [3]=feeGrowthOutside1X128
    const fgo0Lower = word(results.get(3)!, 2)
    const fgo1Lower = word(results.get(3)!, 3)
    const fgo0Upper = word(results.get(4)!, 2)
    const fgo1Upper = word(results.get(4)!, 3)

    return computeFees(fg0, fg1, fgo0Lower, fgo1Lower, fgo0Upper, fgo1Upper, fgi0Last, fgi1Last, liquidity, currentTick, tickLower, tickUpper)
  } catch (error) {
    console.warn(JSON.stringify({
      warning: 'getUncollectedFeesV3 failed — returning 0',
      chain, tokenId, error: String(error), timestamp: new Date().toISOString(),
    }))
    return { fees0: 0n, fees1: 0n }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// V4 — reads PoolManager internal storage via extsload()
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes uncollected fees for a single V4 position by reading PoolManager
 * internal storage via extsload().
 *
 * V4 pools store state inside the PoolManager singleton:
 *   mapping(PoolId => Pool.State) at mapping slot 6
 *   Pool.State.positions mapping stores per-position feeGrowthInsideLast
 *
 * The position key in V4 is:
 *   keccak256(abi.encodePacked(address(PositionManager), int24(tickLower), int24(tickUpper), bytes32(tokenId)))
 *
 * We need 10 extsload reads (all parallelized into a single RPC batch):
 *   slot0 (contains current tick), feeGrowthGlobal0, feeGrowthGlobal1,
 *   tickLower.fgo0, tickLower.fgo1, tickUpper.fgo0, tickUpper.fgo1,
 *   position.liquidity, position.fgi0Last, position.fgi1Last
 */
export async function getUncollectedFeesV4(
  chain:       string,
  poolId:      string,    // 32-byte pool ID (no 0x prefix)
  tickLower:   number,
  tickUpper:   number,
  tokenId:     string,    // NFT token ID from V4 PositionManager
): Promise<UncollectedFees> {
  const positionManager = V4_POSITION_MANAGER[chain]
  if (!positionManager) return { fees0: 0n, fees1: 0n }

  try {
    const rpcUrl = getRpcUrl(chain)

    // Strip 0x prefix from poolId if present
    const pid = poolId.startsWith('0x') ? poolId.slice(2) : poolId

    // Pool base storage slot = keccak256(poolId || uint256(POOLS_MAPPING_SLOT))
    const poolBaseSlot = keccak256(pid + encodeUint256(POOLS_MAPPING_SLOT))
    const poolBase = BigInt('0x' + poolBaseSlot)

    // slot0 slot (contains sqrtPriceX96 in lower 160 bits, tick in bits 160-183)
    const slot0Slot = encodeUint256(poolBase)
    // feeGrowthGlobal slots
    const fg0Slot = encodeUint256(poolBase + 1n)
    const fg1Slot = encodeUint256(poolBase + 2n)

    // Tick data: mapping at virtual slot (poolBase + 4)
    const ticksVirtSlot = encodeUint256(poolBase + 4n)

    function tickSlotBase(tick: number): bigint {
      return BigInt('0x' + keccak256(encodeTick(tick) + ticksVirtSlot))
    }
    const tlBase = tickSlotBase(tickLower)
    const tuBase = tickSlotBase(tickUpper)

    // TickInfo: [0]=liquidityGross+Net, [1]=feeGrowthOutside0, [2]=feeGrowthOutside1
    const tlFgo0Slot = encodeUint256(tlBase + 1n)
    const tlFgo1Slot = encodeUint256(tlBase + 2n)
    const tuFgo0Slot = encodeUint256(tuBase + 1n)
    const tuFgo1Slot = encodeUint256(tuBase + 2n)

    // Position data: mapping at virtual slot (poolBase + 6)
    const positionsVirtSlot = encodeUint256(poolBase + 6n)

    // Position key = keccak256(abi.encodePacked(positionManager, tickLower, tickUpper, salt))
    // where salt = bytes32(tokenId)
    const pmHex = positionManager.startsWith('0x') ? positionManager.slice(2) : positionManager
    const salt = BigInt(tokenId).toString(16).padStart(64, '0')
    const packed = pmHex + int24ToHex(tickLower) + int24ToHex(tickUpper) + salt
    const posKey = keccak256(packed)
    const posSlotBase = BigInt('0x' + keccak256(posKey + positionsVirtSlot))

    // Position.State: [0]=liquidity(uint128), [1]=fgi0Last, [2]=fgi1Last
    const posLiqSlot  = encodeUint256(posSlotBase)
    const posFgi0Slot = encodeUint256(posSlotBase + 1n)
    const posFgi1Slot = encodeUint256(posSlotBase + 2n)

    // Build batch: 10 extsload calls
    const slots = [
      slot0Slot, fg0Slot, fg1Slot,
      tlFgo0Slot, tlFgo1Slot, tuFgo0Slot, tuFgo1Slot,
      posLiqSlot, posFgi0Slot, posFgi1Slot,
    ]

    const calls: RpcRequest[] = slots.map((slot, i) => ({
      id:   i,
      to:   POOL_MANAGER_V4,
      data: SEL_EXTSLOAD + slot,
    }))

    const results = await ethCallBatch(rpcUrl, calls)

    const slot0Val = BigInt(results.get(0)!)
    const fg0      = BigInt(results.get(1)!)
    const fg1      = BigInt(results.get(2)!)
    const fgo0Lower = BigInt(results.get(3)!)
    const fgo1Lower = BigInt(results.get(4)!)
    const fgo0Upper = BigInt(results.get(5)!)
    const fgo1Upper = BigInt(results.get(6)!)
    const posLiqRaw = BigInt(results.get(7)!)
    const fgi0Last  = BigInt(results.get(8)!)
    const fgi1Last  = BigInt(results.get(9)!)

    // Extract current tick from slot0 (bits 160-183, int24 sign-extend)
    const rawTick = Number((slot0Val >> 160n) & 0xFFFFFFn)
    const currentTick = rawTick >= 0x800000 ? rawTick - 0x1000000 : rawTick

    // Position liquidity is uint128 (lower 128 bits)
    const liquidity = posLiqRaw & ((1n << 128n) - 1n)

    if (liquidity === 0n) return { fees0: 0n, fees1: 0n }

    return computeFees(fg0, fg1, fgo0Lower, fgo1Lower, fgo0Upper, fgo1Upper, fgi0Last, fgi1Last, liquidity, currentTick, tickLower, tickUpper)
  } catch (error) {
    console.warn(JSON.stringify({
      warning: 'getUncollectedFeesV4 failed — returning 0',
      chain, poolId, tokenId, error: String(error), timestamp: new Date().toISOString(),
    }))
    return { fees0: 0n, fees1: 0n }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Batch wrappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches uncollected fees for multiple V3 positions (max 5 concurrent).
 */
export async function getUncollectedFeesBatchV3(
  chain:     string,
  positions: Array<{
    tokenId:     string
    poolAddress: string
    tickLower:   number
    tickUpper:   number
    currentTick: number
  }>,
): Promise<Map<string, UncollectedFees>> {
  const CONCURRENCY = 5
  const result = new Map<string, UncollectedFees>()

  for (let i = 0; i < positions.length; i += CONCURRENCY) {
    const batch = positions.slice(i, i + CONCURRENCY)
    const resolved = await Promise.all(
      batch.map((p) => getUncollectedFeesV3(chain, p.tokenId, p.poolAddress, p.tickLower, p.tickUpper, p.currentTick))
    )
    batch.forEach((p, idx) => result.set(p.tokenId, resolved[idx]))
  }

  return result
}

/**
 * Fetches uncollected fees for multiple V4 positions (max 5 concurrent).
 *
 * Each position needs a tokenId (from the V4 Position entity subgraph),
 * which is used as the salt in the position key.
 */
export async function getUncollectedFeesBatchV4(
  chain:     string,
  positions: Array<{
    tokenId:   string     // from V4 Position entity
    poolId:    string     // 32-byte PoolId
    tickLower: number
    tickUpper: number
  }>,
): Promise<Map<string, UncollectedFees>> {
  const CONCURRENCY = 5
  const result = new Map<string, UncollectedFees>()

  for (let i = 0; i < positions.length; i += CONCURRENCY) {
    const batch = positions.slice(i, i + CONCURRENCY)
    const resolved = await Promise.all(
      batch.map((p) => getUncollectedFeesV4(chain, p.poolId, p.tickLower, p.tickUpper, p.tokenId))
    )
    batch.forEach((p, idx) => result.set(p.tokenId, resolved[idx]))
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// V4 PositionManager — resolve tokenId → (poolId, tickLower, tickUpper)
// ═══════════════════════════════════════════════════════════════════════════════

// The V4 PositionManager stores `positionInfo[tokenId]` at storage slot 9.
// Value is packed as: poolId(25 bytes) | tickUpper(3 bytes) | tickLower(3 bytes) | hasSubscriber(1 byte)
const PM_POSITION_INFO_SLOT = 9n

export interface V4PositionInfo {
  tokenId:   string
  poolId:    string   // first 25 bytes of the packed value (50 hex chars)
  tickLower: number
  tickUpper: number
}

/**
 * Reads positionInfo for V4 tokenIds from the PositionManager's on-chain storage.
 * Returns only entries that match a known poolId (to filter closed/irrelevant positions).
 */
export async function resolveV4TokenIds(
  chain:    string,
  tokenIds: string[],
  knownPoolIds: Set<string>,
): Promise<V4PositionInfo[]> {
  const pm = V4_POSITION_MANAGER[chain]
  if (!pm || tokenIds.length === 0) return []

  const rpcUrl = getRpcUrl(chain)
  const CONCURRENCY = 10
  const results: V4PositionInfo[] = []

  for (let i = 0; i < tokenIds.length; i += CONCURRENCY) {
    const batch = tokenIds.slice(i, i + CONCURRENCY)

    // Read positionInfo[tokenId] via eth_getStorageAt
    const resolved = await Promise.all(batch.map(async (tid) => {
      const storageSlot = '0x' + keccak256(
        encodeUint256(BigInt(tid)) + encodeUint256(PM_POSITION_INFO_SLOT)
      )
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'eth_getStorageAt',
          params: [pm, storageSlot, 'latest'],
        }),
      })
      const json = await response.json() as { result?: string }
      return { tid, val: json.result ?? '0x0' }
    }))

    for (const { tid, val } of resolved) {
      const raw = BigInt(val)
      if (raw === 0n) continue

      // Decode packed PositionInfo:
      // bytes32 = [poolId: 25 bytes][tickUpper: 3 bytes][tickLower: 3 bytes][hasSubscriber: 1 byte]
      const hex = raw.toString(16).padStart(64, '0')
      const poolIdPart = '0x' + hex.slice(0, 50)

      const tickLowerHex = hex.slice(56, 62)
      let tickLower = parseInt(tickLowerHex, 16)
      if (tickLower >= 0x800000) tickLower -= 0x1000000

      const tickUpperHex = hex.slice(50, 56)
      let tickUpper = parseInt(tickUpperHex, 16)
      if (tickUpper >= 0x800000) tickUpper -= 0x1000000

      // Match against known pool IDs (the 25-byte prefix must match the start of a 32-byte poolId)
      const matchingPoolId = Array.from(knownPoolIds).find((pid) => {
        const pidClean = pid.startsWith('0x') ? pid.toLowerCase() : '0x' + pid.toLowerCase()
        return pidClean.startsWith(poolIdPart.toLowerCase())
      })

      if (matchingPoolId) {
        results.push({ tokenId: tid, poolId: matchingPoolId, tickLower, tickUpper })
      }
    }
  }

  return results
}
