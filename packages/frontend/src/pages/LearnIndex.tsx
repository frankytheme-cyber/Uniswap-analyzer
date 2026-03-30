import { Link } from 'react-router-dom'
import { GraduationCapIcon, DropIcon, BankIcon, ArrowRightIcon } from '@phosphor-icons/react'
import Footer from '../components/Footer.tsx'
import SEO from '../components/SEO.tsx'

interface Section {
  path: string
  number: string
  title: string
  description: string
  chapters: string[]
  Icon: React.ElementType
  color: 'violet' | 'emerald'
}

const sections: Section[] = [
  {
    path: '/learn/dex',
    number: '01 – 05',
    title: 'Pool di Liquidità',
    description: "Come funzionano gli AMM, la liquidità concentrata V3, il price impact, l'impermanent loss e le strategie di ribilanciamento.",
    chapters: [
      '01 — La Curva AMM (x · y = k)',
      '02 — Liquidità Concentrata V3',
      '03 — Comprare un Token',
      '04 — Impermanent Loss',
      '05 — Il Ribilanciamento',
    ],
    Icon: DropIcon,
    color: 'violet',
  },
  {
    path: '/learn/lending',
    number: '06',
    title: 'Prestiti & Collaterale',
    description: 'Come funzionano i money market protocol come Aave: tassi di interesse, curva di utilizzo, Health Factor e rischio di liquidazione.',
    chapters: [
      '06 — Curva di Utilizzo e Tassi di Interesse',
      '06 — Simulatore Health Factor',
      '06 — Scenari di Liquidazione',
      '06 — APY live (Aave V3)',
    ],
    Icon: BankIcon,
    color: 'emerald',
  },
]

const colorMap = {
  violet: {
    icon: 'bg-violet-50 border-violet-200 text-violet-600',
    number: 'text-violet-400',
    badge: 'bg-violet-50 text-violet-600',
    arrow: 'text-violet-600 group-hover:text-violet-700',
    border: 'hover:border-violet-200',
  },
  emerald: {
    icon: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    number: 'text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-600',
    arrow: 'text-emerald-600 group-hover:text-emerald-700',
    border: 'hover:border-emerald-200',
  },
}

export default function LearnIndex() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO
        title="Guida Interattiva DeFi"
        description="Impara come funzionano le pool di liquidità, gli AMM, la liquidità concentrata V3, l'impermanent loss, le strategie di ribilanciamento e i protocolli di lending come Aave."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: 'Guida Interattiva alla DeFi',
          description: 'Corso interattivo su AMM, liquidità concentrata V3, impermanent loss e lending DeFi',
          provider: { '@type': 'Person', name: 'Simone Puliti', url: 'https://simonepuliti.dev' },
          isAccessibleForFree: true,
        }}
      />
      <div className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full">

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCapIcon size={24} weight="duotone" className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Learn</h1>
            <p className="text-slate-400 text-sm mt-1">
              Guide interattive su AMM, liquidità concentrata e lending protocol
            </p>
          </div>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((sec) => {
            const c = colorMap[sec.color]
            return (
              <Link
                key={sec.path}
                to={sec.path}
                className={`group block bg-white border border-slate-200 ${c.border} rounded-xl p-6 transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 border rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
                    <sec.Icon size={22} weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-mono mb-0.5 ${c.number}`}>{sec.number}</div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">{sec.title}</h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{sec.description}</p>
                    {/* Chapter list */}
                    <ul className="space-y-1 mb-4">
                      {sec.chapters.map((ch) => (
                        <li key={ch} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.badge}`} />
                          {ch}
                        </li>
                      ))}
                    </ul>
                    <div className={`flex items-center gap-1 text-sm font-medium ${c.arrow} transition-colors`}>
                      Inizia <ArrowRightIcon size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <Footer />
    </div>
  )
}
