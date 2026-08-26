import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, MessageSquare } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { IconButton, Card } from '../components/ui'
import { CardSkeleton, EmptyState } from '../components/common'

function StarRow({ score }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          className={n <= score ? 'fill-brand stroke-none' : 'stroke-gray-200 fill-gray-100'}
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
    <div className="min-h-screen bg-background page-enter">

      {/* Header */}
      <div className="bg-surface px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border sticky top-0 z-10">
        <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
        <h1 className="font-extrabold text-[17px] text-ink">Mis calificaciones</h1>
      </div>

      <div className="px-5 pt-5 pb-24 flex flex-col gap-3">

        {/* Loading skeleton */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="w-full h-28" />
        ))}

        {/* Empty state */}
        {!loading && ratings.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={<Star size={20} className="text-amber-400" />}
              title="Sin calificaciones aún"
              subtitle="Cuando completes un proyecto y califiques al trabajador, aparecerá aquí."
            />
          </div>
        )}

        {/* Rating cards */}
        {!loading && ratings.map(r => (
          <Card
            key={r.id}
            padding="sm"
            onClick={() => navigate(`/worker/${r.worker?.id}`)}
            className="cursor-pointer active:scale-[.99] transition-transform"
          >
            {/* Worker info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {r.worker?.avatar
                  ? <img src={r.worker.avatar} alt={r.worker.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-extrabold text-muted text-lg">
                      {r.worker?.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[15px] text-ink truncate">{r.worker?.name}</p>
                {r.project?.city && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-muted" />
                    <span className="text-[12px] text-muted">{r.project.city}</span>
                  </div>
                )}
              </div>
              {/* Date */}
              <span className="text-[11px] text-muted font-medium flex-shrink-0">
                {new Date(r.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Stars + project */}
            <div className="flex items-center justify-between mb-2">
              <StarRow score={r.score} />
              <span className="text-[11px] font-semibold text-muted truncate max-w-[55%] text-right">
                {r.project?.title}
              </span>
            </div>

            {/* Comment */}
            {r.comment && (
              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border">
                <MessageSquare size={13} className="text-muted flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-muted leading-relaxed">{r.comment}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
