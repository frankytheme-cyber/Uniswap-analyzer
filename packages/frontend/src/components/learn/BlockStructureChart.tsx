import { useState, useMemo } from 'react'

/* ── Simulated hash (deterministic, fast, looks like hex) ── */
function simpleHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const parts: string[] = []
  for (let i = 0; i < 8; i++) {
    const mix = Math.imul(h, 0x5bd1e995 + i) ^ (h >>> 13)
    parts.push(((mix >>> 0) & 0xffffffff).toString(16).padStart(8, '0'))
  }
  return parts.join('')
}

interface Tx { id: string; from: string; to: string; amount: string; originalAmount: string }

interface Block {
  index: number
  timestamp: string
  nonce: number
  transactions: Tx[]
  prevHash: string
  hash: string
}

const ORIGINAL_TX: Tx[][] = [
  [
    { id: 'tx-0a', from: 'Alice', to: 'Simone', amount: '0.5 BTC', originalAmount: '0.5 BTC' },
    { id: 'tx-0b', from: 'Carol', to: 'Dave', amount: '1.2 BTC', originalAmount: '1.2 BTC' },
  ],
  [
    { id: 'tx-1a', from: 'Simone', to: 'Eve', amount: '0.3 BTC', originalAmount: '0.3 BTC' },
    { id: 'tx-1b', from: 'Dave', to: 'Alice', amount: '0.8 BTC', originalAmount: '0.8 BTC' },
  ],
  [
    { id: 'tx-2a', from: 'Eve', to: 'Carol', amount: '2.0 BTC', originalAmount: '2.0 BTC' },
    { id: 'tx-2b', from: 'Alice', to: 'Dave', amount: '0.1 BTC', originalAmount: '0.1 BTC' },
  ],
]

const TIMES = ['10:04:12', '10:14:33', '10:25:01']

function buildChain(txSets: Tx[][]): Block[] {
  const blocks: Block[] = []
  let prevHash = '0'.repeat(64)

  for (let i = 0; i < txSets.length; i++) {
    const txData = txSets[i].map((t) => `${t.from}>${t.to}:${t.amount}`).join('|')
    const merkle = simpleHash(`merkle:${txData}`)
    const blockData = `${i}:${prevHash}:${merkle}:${TIMES[i]}:${42000 + i * 317}`
    const hash = simpleHash(blockData)
    blocks.push({
      index: i,
      timestamp: TIMES[i],
      nonce: 42000 + i * 317,
      transactions: txSets[i],
      prevHash,
      hash,
    })
    prevHash = hash
  }
  return blocks
}

function truncHash(h: string, len = 10) {
  return h.slice(0, len) + '…' + h.slice(-6)
}

export default function BlockStructureChart() {
  const [txData, setTxData] = useState<Tx[][]>(
    ORIGINAL_TX.map((set) => set.map((tx) => ({ ...tx }))),
  )
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null)
  const [editingTx, setEditingTx] = useState<{ block: number; tx: number } | null>(null)

  const originalChain = useMemo(() => buildChain(ORIGINAL_TX), [])
  const currentChain = useMemo(() => buildChain(txData), [txData])

  // Count how many blocks diverge from original
  const firstDirtyBlock = useMemo(() => {
    for (let i = 0; i < currentChain.length; i++) {
      if (currentChain[i].hash !== originalChain[i].hash) return i
    }
    return -1
  }, [currentChain, originalChain])

  const brokenCount = firstDirtyBlock >= 0 ? currentChain.length - firstDirtyBlock : 0
  const isTampered = firstDirtyBlock >= 0

  const handleAmountChange = (bIdx: number, tIdx: number, newAmount: string) => {
    setTxData((prev) => {
      const next = prev.map((set) => set.map((tx) => ({ ...tx })))
      next[bIdx][tIdx].amount = newAmount
      return next
    })
  }

  const handleReset = () => {
    setTxData(ORIGINAL_TX.map((set) => set.map((tx) => ({ ...tx }))))
    setEditingTx(null)
  }

  return (
    <div className="space-y-4">
      {/* Header + status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isTampered ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {isTampered ? (
              <>
                <strong className="text-red-600 dark:text-red-400">{brokenCount} blocchi</strong> invalidati a cascata
              </>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Catena valida</span>
            )}
          </span>
        </div>
        {isTampered && (
          <button
            onClick={handleReset}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
          >
            Ripristina catena
          </button>
        )}
      </div>

      {/* Instruction */}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Clicca su un blocco per espanderlo, poi modifica l'importo di una transazione per vedere come cambiano tutti gli hash a cascata.
      </p>

      {/* Blocks — vertical stack */}
      <div className="space-y-0">
        {currentChain.map((block, bIdx) => {
          const invalid = firstDirtyBlock >= 0 && bIdx >= firstDirtyBlock
          const hashChanged = block.hash !== originalChain[bIdx].hash
          const prevChanged = bIdx > 0 && block.prevHash !== originalChain[bIdx].prevHash
          const isExpanded = expandedBlock === bIdx
          const hasTamperedTx = txData[bIdx].some((tx, i) => tx.amount !== ORIGINAL_TX[bIdx][i].amount)

          return (
            <div key={bIdx}>
              {/* Chain connector */}
              {bIdx > 0 && (
                <div className="flex items-center gap-2 py-1 pl-6">
                  <div className={`w-0.5 h-6 ${
                    prevChanged
                      ? 'bg-red-300 dark:bg-red-700'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                  <span className={`text-xs font-mono ${
                    prevChanged
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}>
                    prevHash = hash del blocco precedente
                  </span>
                </div>
              )}

              {/* Block card */}
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : bIdx)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  invalid
                    ? 'border-red-300 bg-red-50/80 dark:border-red-700 dark:bg-red-950/30'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                } ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}
              >
                {/* Collapsed header — always visible */}
                <div className="flex items-center gap-3">
                  {/* Block icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    invalid
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}>
                    #{block.index}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold ${
                        invalid ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        Blocco {block.index}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{block.timestamp}</span>
                      {hasTamperedTx && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
                          modificato
                        </span>
                      )}
                      {invalid && !hasTamperedTx && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
                          invalido
                        </span>
                      )}
                    </div>
                    {/* Hash preview */}
                    <div className={`font-mono text-xs ${
                      hashChanged
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {truncHash(block.hash, 16)}
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <span className={`text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Block metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5 space-y-1.5">
                        <div className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Intestazione</div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">nonce</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">{block.nonce.toLocaleString('it-IT')}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400 shrink-0">prevHash</span>
                          <span className={`font-mono truncate ${
                            prevChanged ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {bIdx === 0 ? '0000…0000 (genesis)' : truncHash(block.prevHash, 12)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400 shrink-0">hash</span>
                          <span className={`font-mono truncate ${
                            hashChanged ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {truncHash(block.hash, 12)}
                          </span>
                        </div>
                      </div>

                      {/* Hash comparison */}
                      {hashChanged && (
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2.5 space-y-1.5">
                          <div className="text-red-500 dark:text-red-400 uppercase tracking-wider text-[10px] font-semibold">Hash cambiato!</div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Prima: </span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 break-all text-[11px]">{truncHash(originalChain[bIdx].hash, 20)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Dopo: </span>
                            <span className="font-mono text-red-500 dark:text-red-400 break-all text-[11px]">{truncHash(block.hash, 20)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transactions — editable */}
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                        Transazioni — clicca l'importo per modificarlo
                      </div>
                      <div className="space-y-1.5">
                        {block.transactions.map((tx, tIdx) => {
                          const isEditing = editingTx?.block === bIdx && editingTx?.tx === tIdx
                          const wasModified = tx.amount !== ORIGINAL_TX[bIdx][tIdx].amount

                          return (
                            <div
                              key={tx.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                                wasModified
                                  ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                                  : 'bg-slate-100 dark:bg-slate-700/50 border border-transparent'
                              }`}
                            >
                              <span className="text-slate-500 dark:text-slate-400 shrink-0">{tx.from}</span>
                              <span className="text-slate-300 dark:text-slate-600">→</span>
                              <span className="text-slate-500 dark:text-slate-400 shrink-0">{tx.to}</span>
                              <span className="text-slate-300 dark:text-slate-600 mx-1">:</span>

                              {isEditing ? (
                                <input
                                  autoFocus
                                  className="w-24 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-amber-400/50"
                                  defaultValue={tx.amount.replace(' BTC', '')}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim()
                                    if (val && val !== tx.amount.replace(' BTC', '')) {
                                      handleAmountChange(bIdx, tIdx, `${val} BTC`)
                                    }
                                    setEditingTx(null)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = (e.target as HTMLInputElement).value.trim()
                                      if (val) handleAmountChange(bIdx, tIdx, `${val} BTC`)
                                      setEditingTx(null)
                                    }
                                    if (e.key === 'Escape') setEditingTx(null)
                                  }}
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingTx({ block: bIdx, tx: tIdx })}
                                  className={`font-mono font-semibold px-2 py-0.5 rounded transition-colors ${
                                    wasModified
                                      ? 'text-red-600 dark:text-red-400 bg-red-200/50 dark:bg-red-800/30'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300'
                                  }`}
                                  title="Clicca per modificare"
                                >
                                  {tx.amount}
                                  {!wasModified && <span className="ml-1 text-slate-300 dark:text-slate-600">✎</span>}
                                </button>
                              )}

                              {wasModified && (
                                <span className="text-[10px] text-red-400 dark:text-red-500 ml-auto shrink-0">
                                  era {ORIGINAL_TX[bIdx][tIdx].amount}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Explanation panel */}
      {isTampered && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
            <div className="text-slate-600 dark:text-slate-300">
              <strong className="text-red-700 dark:text-red-400">Catena compromessa!</strong>{' '}
              Hai modificato una transazione nel Blocco {firstDirtyBlock}.{' '}
              {brokenCount > 1 ? (
                <>
                  Questo ha cambiato il suo hash, che è il <em>prevHash</em> del Blocco {firstDirtyBlock + 1} —
                  e così a cascata, tutti i <strong>{brokenCount} blocchi</strong> dal punto di modifica in poi sono ora invalidi.
                </>
              ) : (
                <>Questo ha cambiato il suo hash, rendendo il blocco invalido.</>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 pl-7">
            Per falsificare questa transazione, un attaccante dovrebbe ricalcolare il Proof of Work di{' '}
            <strong className="text-slate-700 dark:text-slate-200">{brokenCount} blocchi</strong> prima che la rete ne aggiunga di nuovi — con la potenza di calcolo attuale, un'impresa praticamente impossibile.
          </div>
        </div>
      )}

      {/* Visual explainer: how hashing works */}
      {!isTampered && expandedBlock === null && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300">
          <strong className="text-amber-700 dark:text-amber-400">Prova tu!</strong>{' '}
          Espandi un blocco cliccandoci sopra, poi modifica l'importo di una transazione (es. cambia "0.3 BTC" in "999").
          Vedrai l'hash del blocco cambiare istantaneamente e tutti i blocchi successivi diventare rossi —
          questo è il principio di <strong className="text-slate-800 dark:text-slate-100">immutabilità</strong> della blockchain.
        </div>
      )}
    </div>
  )
}
