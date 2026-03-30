import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE_NAME = 'Uniswap Pool Analyzer'
const BASE_URL = 'https://uniswap-analyzer.vercel.app'
const DEFAULT_DESCRIPTION =
  'Analizza la salute delle pool di liquidità Uniswap V3 e V4 su Ethereum, Arbitrum, Base e Polygon. Score di salute, simulatore impermanent loss, fee APR e strategie LP.'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

interface SEOProps {
  title?: string
  description?: string
  image?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  noindex = false,
  jsonLd,
}: SEOProps) {
  const { pathname } = useLocation()
  const canonical = `${BASE_URL}${pathname}`
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="it_IT" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  )
}
