import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function RatingScreen() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const projectId = searchParams.get('projectId')
    const workerId = searchParams.get('workerId')
    const workerName = searchParams.get('workerName') || 'el trabajador'

    const [score, setScore] = useState(0)
    const [hover, setHover] = useState(0)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [canRate, setCanRate] = useState(null)

    useEffect(() => {
        if (projectId) checkCanRate()
    }, [projectId])

    const checkCanRate = async () => {
        try {
            const res = await api.get(`/ratings/can-rate/${projectId}`)
            setCanRate(res.data.data)
        } catch { setCanRate({ canRate: false, reason: 'Error verificando estado' }) }
    }

    const handleSubmit = async () => {
        if (score === 0) return toast.error('Selecciona una calificación')
        setLoading(true)
        try {
            await api.post('/ratings', { score, comment, worker_id: workerId, project_id: projectId })
            toast.success('¡Calificación enviada! Gracias por tu opinión.')
            navigate('/projects')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al enviar')
        } finally { setLoading(false) }
    }

    const LABELS = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }

    if (canRate === null) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#E8432D] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col page-enter">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 pt-14 pb-5">
                <button onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
                    <ArrowLeft size={18} />
                </button>
                <h2 className="text-xl font-bold text-[#111]">Calificar servicio</h2>
            </div>

            <div className="flex-1 px-5 flex flex-col items-center">
                {/* Avatar trabajador */}
                <div className="w-20 h-20 rounded-full bg-[#E8432D]/10 flex items-center justify-center text-3xl font-bold text-[#E8432D] mb-3">
                    {decodeURIComponent(workerName)[0]?.toUpperCase()}
                </div>
                <h3 className="text-xl font-extrabold text-[#111] mb-1">{decodeURIComponent(workerName)}</h3>
                <p className="text-sm text-gray-400 mb-8">¿Cómo fue tu experiencia?</p>

                {!canRate.canRate ? (
                    <div className="w-full bg-gray-50 rounded-2xl p-6 text-center">
                        <p className="text-4xl mb-3">
                            {canRate.existing ? '✅' : '🔒'}
                        </p>
                        <p className="font-bold text-[#111] text-lg mb-1">
                            {canRate.existing ? 'Ya calificaste este proyecto' : 'No disponible'}
                        </p>
                        <p className="text-gray-400 text-sm">{canRate.reason}</p>
                        {canRate.existing && (
                            <div className="flex justify-center gap-1 mt-4">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={28}
                                        className={s <= canRate.existing.score ? 'fill-amber-400 stroke-amber-400' : 'stroke-gray-300'} />
                                ))}
                            </div>
                        )}
                        <button onClick={() => navigate('/projects')}
                            className="mt-5 px-6 py-3 bg-[#E8432D] text-white rounded-full text-sm font-bold">
                            Ver mis proyectos
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Estrellas */}
                        <div className="flex gap-3 mb-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s}
                                    onMouseEnter={() => setHover(s)}
                                    onMouseLeave={() => setHover(0)}
                                    onClick={() => setScore(s)}
                                    className="transition-transform hover:scale-110 active:scale-95">
                                    <Star size={44} strokeWidth={1.5}
                                        className={s <= (hover || score)
                                            ? 'fill-amber-400 stroke-amber-400'
                                            : 'stroke-gray-300 fill-transparent'
                                        } />
                                </button>
                            ))}
                        </div>

                        {/* Label */}
                        <p className="text-lg font-bold text-[#111] h-7 mb-6">
                            {hover ? LABELS[hover] : score ? LABELS[score] : ''}
                        </p>

                        {/* Comentario */}
                        <div className="w-full mb-4">
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                                rows={4}
                                maxLength={500}
                                className="w-full px-4 py-4 bg-gray-100 rounded-2xl text-[15px] outline-none resize-none placeholder-gray-400"
                            />
                            <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</p>
                        </div>

                        {/* Aspectos rápidos */}
                        <div className="w-full mb-8">
                            <p className="text-sm font-semibold text-gray-500 mb-2">¿Qué destacas? (opcional)</p>
                            <div className="flex flex-wrap gap-2">
                                {['Puntual', 'Limpio', 'Profesional', 'Buen precio', 'Comunicativo', 'Rápido'].map(tag => (
                                    <button key={tag}
                                        onClick={() => setComment(c => c.includes(tag) ? c.replace(` #${tag}`, '').replace(`#${tag}`, '') : c + ` #${tag}`)}
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all
                      ${comment.includes(tag)
                                                ? 'bg-[#E8432D] text-white border-[#E8432D]'
                                                : 'bg-white text-gray-600 border-gray-200'}`}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {canRate?.canRate && (
                <div className="px-5 pb-10 pt-4">
                    <button onClick={handleSubmit} disabled={score === 0 || loading}
                        className="w-full py-4 bg-[#E8432D] text-white rounded-full text-[17px] font-bold disabled:opacity-40 hover:opacity-90 active:scale-[.98] transition-all">
                        {loading ? 'Enviando...' : 'Enviar calificación'}
                    </button>
                </div>
            )}
        </div>
    )
}