export const createSlug = (title: string): string => {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-"); // Remove duplicate hyphens
};

export function fmtCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function initials(name: string) {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'CV'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'CV'
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function formatDateLabel(dateIso?: string) {
  if (!dateIso) return 'Fecha desconocida'
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}
