const PARAMETERS = [
  {
    id:      'TVL',
    label:   'TVL Reale?',
    color:   'text-indigo-600',
    bg:      'bg-indigo-50 border-indigo-200',
    idBg:    'bg-indigo-100 text-indigo-600',
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
    color:   'text-sky-600',
    bg:      'bg-sky-50 border-sky-200',
    idBg:    'bg-sky-100 text-sky-600',
    how:     "Analizza la concentrazione degli swap per wallet tramite l'indice di Herfindahl (HHI). Un indice vicino a 0 indica volume distribuito; vicino a 1 indica che un wallet domina.",
    formula: 'HHI = Σ(quota_wallet²)',
    api:     'swaps[500].amountUSD · swaps[500].sender · poolDayDatas[1].volumeUSD',
    good:    'HHI < 0.15 e volume/wallet > $5k',
    warn:    'HHI < 0.30 e volume/wallet > $1k',
    bad:     'HHI ≥ 0.30 — possibile wash trading',
  },
  {
    id:      'Fee',
    label:   'Fee APR',
    color:   'text-emerald-600',
    bg:      'bg-emerald-50 border-emerald-200',
    idBg:    'bg-emerald-100 text-emerald-700',
    how:     'Annualizza le fee generate dalla pool negli ultimi 365 giorni rispetto al TVL medio.',
    formula: 'Fee APR = (fee_365gg / TVL_medio) × 100',
    api:     'poolDayDatas[365].feesUSD · poolDayDatas[365].tvlUSD',
    good:    '> 20% — fee giustificano ampiamente il capitale bloccato',
    warn:    '10–20% — rendimento marginale',
    bad:     '< 10% — le fee non compensano il rischio',
  },
  {
    id:      'Comp',
    label:   'Fee Competitiva?',
    color:   'text-amber-600',
    bg:      'bg-amber-50 border-amber-200',
    idBg:    'bg-amber-100 text-amber-700',
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
    color:   'text-violet-600',
    bg:      'bg-violet-50 border-violet-200',
    idBg:    'bg-violet-100 text-violet-700',
    how:     'Misura quante ore nelle ultime 168 (7 giorni) il prezzo è rimasto dentro un range standard.',
    formula: 'In-range ratio = ore nel range / 168',
    api:     'poolHourDatas[168].tick · poolHourDatas[168].liquidity',
    good:    '> 75% — il capitale è produttivo la maggior parte del tempo',
    warn:    '50–75% — frequenti uscite dal range',
    bad:     '< 50% — il capitale è spesso inattivo',
  },
  {
    id:      'Inc',
    label:   'Incentivi Artificiali?',
    color:   'text-rose-600',
    bg:      'bg-rose-50 border-rose-200',
    idBg:    'bg-rose-100 text-rose-600',
    how:     "Rileva spike improvvisi di TVL (+50% in 24h) e misura la correlazione di Pearson tra TVL e fee.",
    formula: 'r = correlazione Pearson(TVL, fee) su 90gg',
    api:     'poolDayDatas[90].tvlUSD · poolDayDatas[90].feesUSD',
    good:    'Nessuno spike e r > 0.6 — fee e TVL crescono insieme',
    warn:    '≤ 2 spike o r > 0.4 — monitorare',
    bad:     'Spike frequenti o r ≤ 0.4 — possibili incentivi esterni',
  },
  {
    id:      'Mat',
    label:   'Maturità Pool',
    color:   'text-cyan-600',
    bg:      'bg-cyan-50 border-cyan-200',
    idBg:    'bg-cyan-100 text-cyan-700',
    how:     'Valuta l\'età della pool e la stabilità storica di fee APR, volume e TVL tramite il coefficiente di variazione (CV = stddev/media).',
    formula: 'CV = σ / μ — su fee APR, volume e TVL giornalieri',
    api:     'pool.createdAtTimestamp · poolDayDatas[365].feesUSD · volumeUSD · tvlUSD',
    good:    '> 180gg e CV(fee) < 0.5, CV(vol) < 1.0, CV(TVL) < 0.3 — pool matura e stabile',
    warn:    '30–180gg o CV moderato — pool giovane o variabile',
    bad:     '< 30gg o CV molto alto — dati insufficienti o rendimenti instabili',
  },
]

export default function ParameterLegend() {
  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Come funziona l'analisi
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Ogni pool viene valutata su 7 parametri indipendenti. Ogni parametro vale 1 punto.
        Il punteggio finale è <span className="text-slate-600">(parametri positivi / 7) × 100</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARAMETERS.map((p) => (
          <div key={p.id} className={`bg-white border ${p.bg} rounded-lg p-4 space-y-2 shadow-card`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.idBg}`}>
                {p.id}
              </span>
              <span className="text-sm font-semibold text-slate-800">{p.label}</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">{p.how}</p>

            <div className="bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5">
              <code className="text-xs text-slate-600">{p.formula}</code>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 flex gap-1.5 items-start">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0 mt-px">API</span>
              <code className="text-[10px] text-slate-500 leading-relaxed break-all">{p.api}</code>
            </div>

            <div className="space-y-0.5 text-xs">
              <div className="flex gap-1.5">
                <span className="text-emerald-600 flex-shrink-0">verde</span>
                <span className="text-slate-400">{p.good}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-amber-500 flex-shrink-0">giallo</span>
                <span className="text-slate-400">{p.warn}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-red-500 flex-shrink-0">rosso</span>
                <span className="text-slate-400">{p.bad}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
