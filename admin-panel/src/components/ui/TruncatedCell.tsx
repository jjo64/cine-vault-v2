/* ==========================================================================
   TruncatedCell — Celda truncada responsive
   --------------------------------------------------------------------------
   Desktop: trunca el texto y muestra el completo en tooltip hover.
   Móvil:   trunca el texto y expande al pulsar.
   Reutilizable en todas las tablas del panel.
   ========================================================================== */

import { useState } from "react"

interface TruncatedCellProps {
  text: string | null | undefined
  maxChars?: number
  className?: string
}

export default function TruncatedCell({
  text,
  maxChars = 60,
  className = "",
}: TruncatedCellProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text) {
    return <span className="text-gray-600 text-xs">—</span>
  }

  const needsTruncation = text.length > maxChars
  const truncated = needsTruncation ? text.slice(0, maxChars) + "..." : text

  return (
    <span
      className={`text-xs ${className}`}
      title={needsTruncation ? text : undefined}
      onClick={() => needsTruncation && setExpanded(prev => !prev)}
    >
      {/* Desktop — truncado con tooltip nativo en hover */}
      <span className="hidden sm:inline cursor-default">
        {truncated}
      </span>

      {/* Móvil — expandible al pulsar */}
      <span className="sm:hidden">
        <span className={expanded ? "" : "line-clamp-2"}>
          {expanded ? text : truncated}
        </span>
        {needsTruncation && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(prev => !prev) }}
            className="ml-1 text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            {expanded ? "ver menos" : "ver más"}
          </button>
        )}
      </span>
    </span>
  )
}