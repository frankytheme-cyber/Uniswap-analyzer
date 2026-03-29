import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BankIcon, ArrowRightIcon, ArrowLeftIcon,
} from '@phosphor-icons/react'
import AaveLendingChart from '../components/learn/AaveLendingChart.tsx'
import Footer           from '../components/Footer.tsx'

interface Chapter {
  id: string
  number: string
  title: string
  subtitle: string
  Icon: React.ElementType
}

const chapters: Chapter[] = [
  { id: 'lending', number: '06', title: 'Prestiti & Collaterale', subtitle: 'Come funziona Aave e il Health Factor', Icon: BankIcon },
]

export default function LearnLending() {
  const [activeChapter, setActiveChapter] = useState('lending')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-chapter')
          if (id) setActiveChapter(id)
        }
      },
      { threshold: 0.3 },
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Kept for consistency with pattern — unused since only 1 chapter
  void activeChapter

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8 flex-1 w-full">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <Link
              to="/learn"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-4 px-3"
            >
              <ArrowLeftIcon size={11} weight="bold" />
              Tutte le sezioni
            </Link>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 px-3">Capitoli</p>
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <span className="text-xs font-mono text-emerald-300 mr-2">{ch.number}</span>
                {ch.title}
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-20">

          {/* ── Chapter 6: Prestiti & Collaterale ── */}
          <section
            id="lending" data-chapter="lending"
            ref={(el: HTMLElement | null) => { sectionRefs.current['lending'] = el }}
            className="scroll-mt-20"
          >
            <ChapterHeader ch={chapters[0]} />
            <p className="text-slate-600 leading-relaxed mb-2">
              I protocolli di <span className="text-slate-900 font-medium">lending</span> come Aave permettono di depositare
              un asset come collaterale e prendere in prestito un altro asset. Non c'è una controparte diretta:
              un algoritmo regola i tassi di interesse in tempo reale in base all'utilizzo del pool di liquidità.
            </p>
            <p className="text-slate-600 leading-relaxed mb-2">
              Il tasso di interesse non è fisso: cresce lentamente finché l'utilizzo è basso, poi sale
              <span className="text-slate-900 font-medium"> bruscamente</span> dopo una soglia chiamata{' '}
              <span className="text-amber-600 font-medium">kink</span> (tipicamente all'80%). Questo meccanismo incentiva
              i borrower a restituire il prestito e i lender a depositare di più quando la domanda è alta.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Il parametro più critico è l'<span className="text-slate-900 font-medium">Health Factor</span>: un numero che
              misura la salute della tua posizione. Scende quando il valore del collaterale diminuisce o il debito aumenta.
              Sotto <strong className="text-red-600">1.0</strong>, la posizione viene liquidata automaticamente da bot
              che guadagnano un bonus del 5% sul collaterale. Usa il simulatore per capire quanto sei lontano dalla liquidazione.
            </p>
            <div className="card p-4">
              <AaveLendingChart />
            </div>
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-slate-600">
              <strong className="text-red-700">Rischio chiave:</strong> il collaterale viene rivalutato in tempo reale.
              Un crollo del prezzo di ETH riduce il tuo Health Factor senza che tu faccia nulla.
              Mantieni sempre un cuscinetto: un HF sopra <strong className="text-slate-800">1.5</strong> è considerato prudente.
              Sotto <strong className="text-slate-800">1.2</strong> è consigliabile aggiungere collaterale o ridurre il debito.
            </div>
          </section>

          {/* CTA */}
          <div className="border-t border-slate-200 pt-12 pb-8 text-center space-y-4">
            <p className="text-slate-500 text-sm">Vuoi tornare alle pool di liquidità?</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/learn/dex"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50 transition-colors"
              >
                <ArrowLeftIcon size={14} weight="bold" />
                Pool di Liquidità
              </Link>
              <a href="/dashboard" className="btn-primary inline-flex items-center gap-2">
                Vai al tool <ArrowRightIcon size={14} weight="bold" />
              </a>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

function ChapterHeader({ ch }: { ch: Chapter }) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center shrink-0">
        <ch.Icon size={22} weight="duotone" className="text-emerald-600" />
      </div>
      <div>
        <div className="text-xs font-mono text-emerald-500 mb-0.5">{ch.number}</div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{ch.title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{ch.subtitle}</p>
      </div>
    </div>
  )
}
