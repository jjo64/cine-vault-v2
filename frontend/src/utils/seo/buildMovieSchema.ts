export type MovieSchemaInput = {
  name: string
  description: string
  image: string
  datePublished?: string
  directorName?: string
  genres?: string[]
  ratingValue?: number
  ratingCount?: number
}

const toTrimmed = (value: string, max: number) => value.trim().slice(0, max)

export function buildMovieSchema(movie: MovieSchemaInput): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: toTrimmed(movie.name, 120),
    description: toTrimmed(movie.description, 400),
    image: movie.image,
  }

  if (movie.datePublished) {
    schema.datePublished = movie.datePublished
  }

  if (movie.directorName) {
    schema.director = {
      '@type': 'Person',
      name: movie.directorName,
    }
  }

  if (movie.genres && movie.genres.length > 0) {
    schema.genre = movie.genres
  }

  if (typeof movie.ratingValue === 'number' && typeof movie.ratingCount === 'number' && movie.ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(movie.ratingValue.toFixed(1)),
      ratingCount: movie.ratingCount,
    }
  }

  return JSON.stringify(schema)
}

export function buildWebSiteSchema(siteUrl: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CineVault',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
}
