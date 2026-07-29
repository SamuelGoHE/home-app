import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Briefcase, Award } from 'lucide-react'
import api from '../services/api'

function StarBar({ score, total, count }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 w-3">{score}</span>
            <Star size={11} className="fill-amber-400 stroke-none flex-shrink-0" />
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 w-5 text-right">{count}</span>
        </div>
    )
}

export default function WorkerProfileScreen() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`/ratings/worker/${id}`)
            .then(res => setData(res.data.data))
            .catch(() => navigate(-1))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#E8432D] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!data) return null;

    const { worker, ratings, distribution } = data
    const total = ratings.length

    return (
        <div className="min-h-screen bg-gray-50 page-enter">
            {/* Header rojo */}
            <div className="bg-[#E8432D] px-5 pt-14 pb-16">
                <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 mb-4">
                    <ArrowLeft size={18} color="white" />
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {worker?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-white text-xl font-extrabold">{worker?.name}</h2>
                        <div className="flex items-center gap-1 mt-1">
                            <Star size={14} className="fill-white stroke-none" />
                            <span className="text-white font-bold">{Number(worker?.rating_avg || 0).toFixed(1)}</span>
                            <span className="text-white/60 text-sm">({worker?.rating_count || 0} reseñas)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 -mt-8">
                {/* Card de distribución */}
                <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
                    <h3 className="font-bold text-[15px] text-[#111] mb-4">Calificaciones</h3>
                    <div className="flex gap-4 items-center">
                        {/* Número grande */}
                        <div className="text-center flex-shrink-0">
                            <p className="text-5xl font-extrabold text-[#111]">
                                {Number(worker?.rating_avg || 0).toFixed(1)}
                            </p>
                            <div className="flex gap-0.5 justify-center mt-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={12}
                                        className={s <= Math.round(worker?.rating_avg || 0)
                                            ? 'fill-amber-400 stroke-none'
                                            : 'stroke-gray-300 fill-transparent'} />
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{total} reseñas</p>
                        </div>
                        {/* Barras */}
                        <div className="flex-1 flex flex-col gap-1.5">
                            {[5, 4, 3, 2, 1].map(s => (
                                <StarBar key={s} score={s} count={distribution[s] || 0} total={total} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reseñas */}
                <h3 className="font-bold text-[15px] text-[#111] mb-3">Reseñas</h3>
                <div className="flex flex-col gap-3 pb-8">
                    {ratings.length === 0 && (
                        <div className="bg-white rounded-2xl p-6 text-center text-gray-400">
                            <p className="text-3xl mb-2">⭐</p>
                            <p className="font-medium">Sin reseñas aún</p>
                        </div>
                    )}
                    {ratings.map(r => (
                        <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                                        {r.reviewer?.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[13px] text-[#111]">{r.reviewer?.name}</p>
                                        <p className="text-[11px] text-gray-400">{r.project?.title}</p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={12}
                                            className={s <= r.score ? 'fill-amber-400 stroke-none' : 'stroke-gray-200 fill-transparent'} />
                                    ))}
                                </div>
                            </div>
                            {r.comment && (
                                <p className="text-[13px] text-gray-600 leading-relaxed">{r.comment}</p>
                            )}
                            <p className="text-[11px] text-gray-300 mt-2">
                                {new Date(r.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}