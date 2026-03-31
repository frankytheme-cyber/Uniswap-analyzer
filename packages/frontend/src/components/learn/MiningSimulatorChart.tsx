import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ── Fast deterministic hash (FNV-1a variant → 64-char hex) ── */
function quickHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const parts: string[] = []
  for (let i = 0; i < 8; i++) {
    const mix = Math.imul(h ^ (i * 0x27d4eb2d), 0x5bd1e995) >>> 0
    parts.push(mix.toString(16).padStart(8, '0'))
  }
  return parts.join('')
}

function matchesDifficulty(hash: string, zeros: number): boolean {
  for (let i = 0; i < zeros; i++) {
    if (hash[i] !== '0') return false
  }
  return true
}

interface RunResult { id: number; attempts: number; time: number }

type Phase = 'idle' | 'mining' | 'found'

export default function MiningSimulatorChart() {
  const [difficulty, setDifficulty] = useState(2)
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentNonce, setCurrentNonce] = useState(0)
  const [currentHash, setCurrentHash] = useState('')
  const [runs, setRuns] = useState<RunResult[]>([])
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef(0)
  const nonceRef = useRef(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
  }, [])

  const targetDisplay = useMemo(() => {
    const zeros = '0'.repeat(difficulty)
    const rest = 'x'.repeat(Math.max(0, 8 - difficulty))
    return zeros + rest + '…'
  }, [difficulty])

  const theoreticalAttempts = useMemo(() => Math.pow(16, difficulty), [difficulty])

  const startMining = useCallback(() => {
    if (phase === 'mining') return
    setPhase('mining')
    setCurrentNonce(0)
    setCurrentHash('')
    setElapsed(0)
    nonceRef.current = 0
    startTimeRef.current = performance.now()

    // Timer for elapsed display
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - startTimeRef.current) / 100) / 10)
    }, 100)

    const blockHeader = `prev:a1b2c3d4|merkle:e5f67890|ts:${Date.now()}`

    function step() {
      const batchSize = difficulty <= 2 ? 300 : 80
      for (let b = 0; b < batchSize; b++) {
        nonceRef.current++
        const hash = quickHash(`${blockHeader}|nonce:${nonceRef.current}`)
        if (matchesDifficulty(hash, difficulty)) {
          const timeMs = performance.now() - startTimeRef.current
          setCurrentNonce(nonceRef.current)
          setCurrentHash(hash)
          setPhase('found')
          setElapsed(Math.round(timeMs / 100) / 10)
          clearInterval(timerRef.current)
          setRuns((prev) => [
            ...prev.slice(-14),
            { id: prev.length + 1, attempts: nonceRef.current, time: Math.round(timeMs) },
          ])
          return
        }
      }
      setCurrentNonce(nonceRef.current)
      setCurrentHash(quickHash(`${blockHeader}|nonce:${nonceRef.current}`))
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
  }, [phase, difficulty])

  const stopMining = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    setPhase('idle')
  }, [])

  const avgAttempts = useMemo(() => {
    if (runs.length === 0) return 0
    return Math.round(runs.reduce((s, r) => s + r.attempts, 0) / runs.length)
  }, [runs])

  const fmtN = (n: number) => n.toLocaleString('it-IT')

  return (
    <div className="space-y-5">

      {/* ── Step 1: What are we looking for? ── */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-2">L'obiettivo del miner</div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Il miner deve trovare un numero (<strong className="text-slate-800 dark:text-slate-100">nonce</strong>) che,
          combinato con i dati del blocco e passato nella funzione hash, produca un risultato che inizia con un
          certo numero di <strong className="text-amber-600 dark:text-amber-400">zeri</strong>.
          Più zeri sono richiesti, più è difficile trovare il nonce giusto.
        </p>
        <div className="flex items-center gap-3 text-sm font-mono">
          <span className="text-slate-400 dark:text-slate-500">Target:</span>
          <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700">
            <span className="text-amber-500 font-bold">{targetDisplay}</span>
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            (~1 su {fmtN(theoreticalAttempts)} hash)
          </span>
        </div>
      </div>

      {/* ── Step 2: Difficulty slider ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Difficoltà: <strong className="text-slate-800 dark:text-slate-200">{difficulty} {difficulty === 1 ? 'zero' : 'zeri'}</strong>
          </label>
          <button
            onClick={() => { setRuns([]); setPhase('idle'); setCurrentHash(''); setCurrentNonce(0) }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Resetta cronologia
          </button>
        </div>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((d) => (
            <button
              key={d}
              onClick={() => { if (phase !== 'mining') { setDifficulty(d); setRuns([]) } }}
              disabled={phase === 'mining'}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                difficulty === d
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } ${phase === 'mining' ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {'0'.repeat(d)}{'·'.repeat(Math.max(0, 3 - d))}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Facile — pochi tentativi</span><span>Difficile — migliaia di tentativi</span>
        </div>
      </div>

      {/* ── Step 3: The mining terminal ── */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs text-slate-500 font-mono ml-2">mining-simulator</span>
          {phase === 'mining' && (
            <span className="ml-auto text-xs text-amber-400 font-mono animate-pulse">{elapsed}s</span>
          )}
          {phase === 'found' && (
            <span className="ml-auto text-xs text-emerald-400 font-mono">{elapsed}s</span>
          )}
        </div>

        {/* Terminal body */}
        <div className="p-4 font-mono text-sm space-y-3">
          {/* Block data being hashed */}
          <div className="text-slate-500 text-xs">
            <span className="text-slate-600 dark:text-slate-400">$ </span>
            hash( blocco_dati + nonce ) → deve iniziare con <span className="text-amber-400">{'0'.repeat(difficulty)}</span>
          </div>

          {/* Nonce counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs w-14">nonce</span>
              <span className="text-amber-400 text-lg tabular-nums">
                {phase === 'idle' && currentNonce === 0 ? '—' : fmtN(currentNonce)}
              </span>
            </div>
          </div>

          {/* Current hash with character-by-character coloring */}
          <div>
            <span className="text-slate-500 text-xs">hash   </span>
            {currentHash ? (
              <span className="text-xs sm:text-sm break-all">
                {currentHash.split('').map((ch, i) => {
                  if (i < difficulty) {
                    const isZero = ch === '0'
                    return (
                      <span
                        key={i}
                        className={`font-bold ${
                          isZero
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {ch}
                      </span>
                    )
                  }
                  return <span key={i} className="text-slate-500">{ch}</span>
                })}
              </span>
            ) : (
              <span className="text-slate-600">in attesa…</span>
            )}
          </div>

          {/* Result message */}
          {phase === 'found' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-xs">✓</span>
              </div>
              <span className="text-emerald-400 text-sm">
                Blocco minato! Trovato dopo <strong>{fmtN(currentNonce)}</strong> tentativi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mining button ── */}
      <div className="flex items-center gap-3">
        {phase === 'mining' ? (
          <button
            onClick={stopMining}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={startMining}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            {phase === 'found' ? '⛏ Mina un altro blocco' : '⛏ Inizia Mining'}
          </button>
        )}

        {phase === 'idle' && runs.length === 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Premi il bottone e osserva il miner al lavoro!
          </span>
        )}
      </div>

      {/* ── Step 4: What does the miner earn? ── */}
      {phase === 'found' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Ricompensa del miner</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">3.125 BTC</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Block reward</div>
              <div className="text-[10px] text-slate-400 mt-0.5">dimezzato ogni ~4 anni</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">~0.2 BTC</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Fee transazioni</div>
              <div className="text-[10px] text-slate-400 mt-0.5">pagate dagli utenti</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200">~$210K</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Valore totale</div>
              <div className="text-[10px] text-slate-400 mt-0.5">a prezzi attuali (~$63K/BTC)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: History chart ── */}
      {runs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Storico mining — tentativi per blocco
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Media: <strong className="text-slate-700 dark:text-slate-200">{fmtN(avgAttempts)}</strong> tentativi
              {avgAttempts > 0 && (
                <span className="text-slate-400 ml-1">
                  ({((avgAttempts / theoreticalAttempts) * 100).toFixed(0)}% del valore teorico)
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={runs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="id" tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{ value: 'Blocco', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{ value: 'Tentativi', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
              />
              <Tooltip
                formatter={(v: number) => [fmtN(v), 'Tentativi']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0' }}
              />
              <Bar dataKey="attempts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Analogy box ── */}
      {runs.length >= 2 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300">
          <strong className="text-blue-700 dark:text-blue-400">Nota la varianza!</strong>{' '}
          Anche con la stessa difficoltà, ogni blocco richiede un numero diverso di tentativi.
          Trovare l'hash giusto è come lanciare un dado: a volte sei fortunato al primo colpo,
          altre volte servono migliaia di lanci. Per questo il mining è una <em>corsa</em> tra
          migliaia di miner nel mondo — chi ha più potenza di calcolo lancia più dadi al secondo
          e ha più probabilità di vincere.
        </div>
      )}
    </div>
  )
}
