/* ==========================================================================
   UserCommentsTable — Historial de comentarios de un usuario
   --------------------------------------------------------------------------
   Muestra todos los comentarios de un usuario específico.
   El admin puede borrar cualquier comentario directamente desde aquí.
   ========================================================================== */

interface Review {
  id: number
  movie_id: number
}

interface User {
  id: number
  username: string
}

interface Comment {
  id: number
  content: string
  created_at: string
  users: User
  reviews: Review
}

interface UserCommentsTableProps {
  datos: Comment[]
  token: string
  onCommentDeleted: (commentId: number) => void
}

const API = "http://localhost:4000/api"

export default function UserCommentsTable({ datos, token, onCommentDeleted }: UserCommentsTableProps) {

  const borrarComentario = async (commentId: number) => {
    if (!confirm("¿Seguro que quieres borrar este comentario?")) return
    const res = await fetch(`${API}/rbac/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.error) {
      alert("Error: " + data.error.message)
    } else {
      onCommentDeleted(commentId)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-bold">💬 Comentarios del usuario</h2>

      {datos.length === 0 && (
        <p className="text-gray-500 text-sm">Este usuario no tiene comentarios.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Comentario</th>
              <th className="px-4 py-3 text-left">Reseña</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Acción</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((comentario, i) => (
              <tr
                key={comentario.id}
                className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}
              >
                <td className="px-4 py-3 text-gray-300 max-w-md truncate">
                  {comentario.content}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  #{comentario.reviews?.id}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(comentario.created_at).toLocaleString("es-ES")}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
                    onClick={() => borrarComentario(comentario.id)}
                  >
                    🗑️ Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}