const PARAMETERS = [
  {
    id:      'TVL',
    label:   'TVL Reale?',
    color:   'text-indigo-400',
    border:  'border-indigo-900',
    how:     'Calcola la liquidità attiva (AVL) nei tick entro ±1–10% dal prezzo corrente rispetto al TVL totale.',
    formula: 'AVL ratio = liquidità attiva / TVL totale',
    api:     'pool.tick · ticks[].liquidityGross · pool.totalValueLockedUSD',
    good:    '> 70% — la maggior parte della liquidità è effettivamente usata',
    warn:    '40–70% — parte della liquidità è fuori range',
    bad:     '< 40% — TVL probabilmente gonfiato da posizioni inattive',
  },
  {
    id:      'Vol',
    label:   'Volume Organico?',
    color:   'text-blue-400',
    border:  'border-blue-900',
    how:     'Analizza la concentrazione degli swap per wallet tramite l\'indice di Herfindahl (HHI). Un indice vicino a 0 indica volume distribuito; vicino a 1 indica che un wallet domina.',
    formula: 'HHI = Σ(quota_wallet²)',
    api:     'swaps[500].amountUSD · swaps[500].sender · poolDayDatas[1].volumeUSD',
    good:    'HHI < 0.15 e volume/wallet > $5k',
    warn:    'HHI < 0.30 e volume/wallet > $1k',
    bad:     'HHI ≥ 0.30 — possibile wash trading',
  },
  {
    id:      'Fee',
    label:   'Fee APR',
    color:   'text-green-400',
    border:  'border-green-900',
    how:     'Annualizza le fee generate dalla pool negli ultimi 365 giorni rispetto al TVL medio. Se la pool è più giovane, il dato viene estrapolato.',
    formula: 'Fee APR = (fee_365gg / TVL_medio) × 100',
    api:     'poolDayDatas[365].feesUSD · poolDayDatas[365].tvlUSD',
    good:    '> 20% — fee giustificano ampiamente il capitale bloccato',
    warn:    '10–20% — rendimento marginale',
    bad:     '< 10% — le fee non compensano il rischio',
  },
  {
    id:      'Comp',
    label:   'Fee Competitiva?',
    color:   'text-yellow-400',
    border:  'border-yellow-900',
    how:     'Confronta il Fee APR della pool con la mediana delle top 20 pool dello stesso fee tier sulla stessa chain.',
    formula: 'Score = Fee APR pool / mediana competitor',
    api:     'pools[stesso feeTier].feesUSD · pools[stesso feeTier].totalValueLockedUSD',
    good:    '> 1.2x — almeno 20% sopra la mediana di mercato',
    warn:    '0.8–1.2x — in linea con il mercato',
    bad:     '< 0.8x — sotto la mediana, pool meno efficiente',
  },
  {
    id:      'Eff',
    label:   'Efficienza Capitale V3',
    color:   'text-purple-400',
    border:  'border-purple-900',
    how:     'Misura quante ore nelle ultime 168 (7 giorni) il prezzo è rimasto dentro un range standard (±1% stablecoin, ±5% major, ±10% altcoin).',
    formula: 'In-range ratio = ore nel range / 168',
    api:     'poolHourDatas[168].tick · poolHourDatas[168].liquidity',
    good:    '> 75% — il capitale è produttivo la maggior parte del tempo',
    warn:    '50–75% — frequenti uscite dal range',
    bad:     '< 50% — il capitale è spesso inattivo',
  },
  {
    id:      'Inc',
    label:   'Incentivi Artificiali?',
    color:   'text-rose-400',
    border:  'border-rose-900',
    how:     'Rileva spike improvvisi di TVL (+50% in 24h) e misura la correlazione di Pearson tra TVL e fee. Su Uniswap le fee sono l\'unica fonte di rendimento: se il TVL cresce ma le fee no, c\'è qualcosa di artificiale.',
    formula: 'r = correlazione Pearson(TVL, fee) su 90gg',
    api:     'poolDayDatas[90].tvlUSD · poolDayDatas[90].feesUSD',
    good:    'Nessuno spike e r > 0.6 — fee e TVL crescono insieme',
    warn:    '≤ 2 spike o r > 0.4 — monitorare',
    bad:     'Spike frequenti o r ≤ 0.4 — possibili incentivi esterni',
  },
]

export default function ParameterLegend() {
  return (
    <section className="mt-12 border-t border-gray-800 pt-8">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Come funziona l'analisi
      </h2>
      <p className="text-xs text-gray-600 mb-6">
        Ogni pool viene valutata su 6 parametri indipendenti. Ogni parametro vale 1 punto.
        Il punteggio finale è <span className="text-gray-400">(parametri positivi / 6) × 100</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARAMETERS.map((p) => (
          <div key={p.id} className={`bg-gray-900 border ${p.border} rounded-xl p-4 space-y-2`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-gray-800 ${p.color}`}>
                {p.id}
              </span>
              <span className="text-sm font-semibold text-white">{p.label}</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">{p.how}</p>

            <div className="bg-gray-800 rounded px-2.5 py-1.5">
              <code className="text-xs text-gray-300">{p.formula}</code>
            </div>

            <div className="bg-gray-800/50 rounded px-2.5 py-1.5 flex gap-1.5 items-start">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0 mt-px">API</span>
              <code className="text-[10px] text-gray-400 leading-relaxed break-all">{p.api}</code>
            </div>

            <div className="space-y-0.5 text-xs">
              <div className="flex gap-1.5">
                <span className="text-green-500 flex-shrink-0">verde</span>
                <span className="text-gray-500">{p.good}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-amber-500 flex-shrink-0">giallo</span>
                <span className="text-gray-500">{p.warn}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-red-500 flex-shrink-0">rosso</span>
                <span className="text-gray-500">{p.bad}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
