export default function Footer() {
  return (
    <div
      className="border-t py-4 text-center text-xs space-y-2"
      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}
    >
      <div>
        Dati: The Graph · GeckoTerminal · DeFiLlama &nbsp;·&nbsp; Ethereum · Arbitrum · Base · Polygon
      </div>
      <div>
        Created by{' '}
        <a
          href="https://simonepuliti.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          Simone Puliti
        </a>
      </div>
    </div>
  )
}
