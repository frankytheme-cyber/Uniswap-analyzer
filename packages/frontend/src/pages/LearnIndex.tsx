import { Link } from 'react-router-dom'
import { GraduationCapIcon, DropIcon, BankIcon, CubeIcon, ArrowRightIcon } from '@phosphor-icons/react'
import SEO from '../components/SEO.tsx'
import Footer from '../components/Footer.tsx'

interface Section {
  path: string
  number: string
  title: string
  description: string
  chapters: string[]
  Icon: React.ElementType
  accentVar: string
  badgeBgVar: string
  badgeBorderVar: string
  badgeTextVar: string
  dotVar: string
  hoverClass: string
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
    accentVar: '--home-violet',
    badgeBgVar: '--home-badge-violet-bg',
    badgeBorderVar: '--home-badge-violet-border',
    badgeTextVar: '--home-badge-violet-text',
    dotVar: '--home-violet',
    hoverClass: 'home-card-hover-violet',
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
    accentVar: '--home-green',
    badgeBgVar: '--home-badge-green-bg',
    badgeBorderVar: '--home-badge-green-border',
    badgeTextVar: '--home-badge-green-text',
    dotVar: '--home-green',
    hoverClass: 'home-card-hover-green',
  },
  {
    path: '/learn/blockchain',
    number: '07 – 10',
    title: 'Blockchain & Consenso',
    description: 'Come funzionano le blockchain Bitcoin ed Ethereum, il Proof of Work, il Proof of Stake, gli smart contract e il meccanismo delle gas fee.',
    chapters: [
      '07 — La Blockchain Bitcoin',
      '08 — Proof of Work',
      '09 — La Blockchain Ethereum',
      '10 — Proof of Stake',
    ],
    Icon: CubeIcon,
    accentVar: '--home-amber',
    badgeBgVar: '--home-badge-amber-bg',
    badgeBorderVar: '--home-badge-amber-border',
    badgeTextVar: '--home-badge-amber-text',
    dotVar: '--home-amber',
    hoverClass: 'home-card-hover-amber',
  },
]

export default function LearnIndex() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
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
      <div className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full">

        {/* Header */}
        <div className="flex items-start gap-4 mb-12">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <GraduationCapIcon size={22} weight="duotone" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Learn</h1>
            <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
              Guide interattive su AMM, liquidità concentrata e lending protocol
            </p>
          </div>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((sec) => (
            <Link
              key={sec.path}
              to={sec.path}
              className={`home-section-card group block rounded-xl p-6 transition-all duration-300 ${sec.hoverClass}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="home-icon-box w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                >
                  <sec.Icon size={20} weight="duotone" style={{ color: `var(${sec.accentVar})` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono tracking-widest"
                      style={{
                        backgroundColor: `var(${sec.badgeBgVar})`,
                        borderColor: `var(${sec.badgeBorderVar})`,
                        color: `var(${sec.badgeTextVar})`,
                      }}
                    >
                      {sec.number}
                    </span>
                    <ArrowRightIcon
                      size={13}
                      weight="bold"
                      className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
                      style={{ color: `var(${sec.accentVar})` }}
                    />
                  </div>
                  <h2 className="text-lg font-bold leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                    {sec.title}
                  </h2>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
                    {sec.description}
                  </p>

                  {/* Chapter list */}
                  <ul className="space-y-1.5 mb-4">
                    {sec.chapters.map((ch) => (
                      <li key={ch} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: `var(${sec.dotVar})` }}
                        />
                        {ch}
                      </li>
                    ))}
                  </ul>

                  <div
                    className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                    style={{ color: `var(${sec.accentVar})` }}
                  >
                    Inizia il percorso
                    <ArrowRightIcon size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
