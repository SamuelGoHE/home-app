import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, MessageSquare } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

function StarRow({ score }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          className={n <= score ? 'fill-[#E8432D] stroke-none' : 'stroke-gray-200 fill-gray-100'}
        />
      ))}
    </div>
  )
}

export default function MyRatingsPage() {
  const navigate = useNavigate()
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/ratings/my')
      .then(res => setRatings(res.data.data || []))
      .catch(() => toast.error('Error al cargar calificaciones'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f9fb] page-enter">

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-extrabold text-[17px] text-[#111]">Mis calificaciones</h1>
      </div>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-3">

        {/* Loading skeleton */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-2/3" />
                <div className="h-3 bg-gray-50 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && ratings.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm mt-4">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star size={26} className="text-amber-400" />
            </div>
            <p className="font-bold text-gray-400 text-[15px]">Sin calificaciones aún</p>
            <p className="text-gray-300 text-[13px] mt-1 leading-tight px-6">
              Cuando completes un proyecto y califiques al trabajador, aparecerá aquí.
            </p>
          </div>
        )}

        {/* Rating cards */}
        {!loading && ratings.map(r => (
          <div
            key={r.id}
            onClick={() => navigate(`/worker/${r.worker?.id}`)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[.99] transition-transform"
          >
            {/* Worker info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {r.worker?.avatar
                  ? <img src={r.worker.avatar} alt={r.worker.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-extrabold text-gray-300 text-lg">
                      {r.worker?.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[15px] text-[#111] truncate">{r.worker?.name}</p>
                {r.project?.city && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-gray-400" />
                    <span className="text-[12px] text-gray-400">{r.project.city}</span>
                  </div>
                )}
              </div>
              {/* Date */}
              <span className="text-[11px] text-gray-300 font-medium flex-shrink-0">
                {new Date(r.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Stars + project */}
            <div className="flex items-center justify-between mb-2">
              <StarRow score={r.score} />
              <span className="text-[11px] font-semibold text-gray-400 truncate max-w-[55%] text-right">
                {r.project?.title}
              </span>
            </div>

            {/* Comment */}
            {r.comment && (
              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-50">
                <MessageSquare size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-gray-500 leading-relaxed">{r.comment}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
