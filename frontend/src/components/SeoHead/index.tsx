/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-namespace */
import { Helmet } from 'react-helmet-async'
import type React from 'react'

type OpenGraphType = 'website' | 'video.movie' | 'profile'

type BaseSeoProps = {
  title: string
  description: string
  canonical: string
  image: string
  type: OpenGraphType
  robots: string
  structuredData?: string
}

type PageSeoProps = {
  title: string
  description: string
  canonical: string
  image?: string
  structuredData?: string
}

type MovieSeoProps = {
  title: string
  description: string
  canonical: string
  image: string
  structuredData: string
}

type ProfileSeoProps = {
  title: string
  description: string
  canonical: string
  image?: string
}

type NoIndexSeoProps = {
  title: string
  description: string
  canonical: string
  image?: string
}

// CAMBIADO: imagen OG propia de la app en lugar de whiplash2.jpg
const DEFAULT_IMAGE = 'https://cinevault.art/og-home.jpg'

const clampText = (value: string, max: number) => value.trim().slice(0, max)

const normalizeCanonical = (value: string) => {
  try {
    const url = new URL(value)
    url.search = ''
    return url.toString().replace(/\/$/, '') || url.origin
  } catch {
    return value
  }
}

const SeoBase = ({
  title,
  description,
  canonical,
  image,
  type,
  robots,
  structuredData,
}: BaseSeoProps) => {
  const safeTitle = clampText(title, 60)
  const safeDescription = clampText(description, 155)
  const safeCanonical = normalizeCanonical(canonical)

  return (
    <Helmet prioritizeSeoTags>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDescription} />
      <meta name="robots" content={robots} />

      {/* Open Graph */}
      <meta property="og:site_name" content="CineVault" />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={safeCanonical} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="es_ES" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={safeCanonical} />
      {structuredData ? <script type="application/ld+json">{structuredData}</script> : null}
    </Helmet>
  )
}

export namespace SeoHead {
  export const Page: React.FC<PageSeoProps> = ({ title, description, canonical, image, structuredData }) => (
    <SeoBase
      title={title}
      description={description}
      canonical={canonical}
      image={image || DEFAULT_IMAGE}
      type="website"
      robots="index, follow"
      structuredData={structuredData}
    />
  )

  export const Movie: React.FC<MovieSeoProps> = ({ title, description, canonical, image, structuredData }) => (
    <SeoBase
      title={title}
      description={description}
      canonical={canonical}
      image={image}
      type="video.movie"
      robots="index, follow"
      structuredData={structuredData}
    />
  )

  export const Profile: React.FC<ProfileSeoProps> = ({ title, description, canonical, image }) => (
    <SeoBase
      title={title}
      description={description}
      canonical={canonical}
      image={image || DEFAULT_IMAGE}
      type="profile"
      robots="index, follow"
    />
  )

  export const NoIndex: React.FC<NoIndexSeoProps> = ({ title, description, canonical, image }) => (
    <SeoBase
      title={title}
      description={description}
      canonical={canonical}
      image={image || DEFAULT_IMAGE}
      type="website"
      robots="noindex, nofollow"
    />
  )
}