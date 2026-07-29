import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Shield, Phone, MessageCircle } from 'lucide-react'
import { useWorker } from '../hooks/useApi'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

const SERVICE_MAP = {
  pintura:            { label: 'Pintura Interior' },
  enchapes:           { label: 'Enchapes de Baño' },
  electricidad:       { label: 'Instalaciones Eléctricas' },
  plomeria:           { label: 'Plomería General' },
  obra_gris:          { label: 'Obra Gris' },
  carpinteria:        { label: 'Carpintería en Madera' },
  impermeabilizacion: { label: 'Impermeabilización' },
  remodelacion:       { label: 'Remodelación' },
  techos:             { label: 'Techos y Cielos' },
  pisos:              { label: 'Pisos' },
  pintura_ext:        { label: 'Pintura Exterior' },
  otro:               { label: 'Otro' },
}

export default function WorkerDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const { data: worker, loading } = useWorker(id)

  // Datos del servicio que vienen desde QuoteScreen → ResultsScreen
  const serviceName    = searchParams.get('serviceName') || 'Servicio'
  const serviceId      = searchParams.get('serviceId') || ''
  const serviceCategory = searchParams.get('serviceCategory') || ''
  const city           = searchParams.get('city') || ''
  const address        = searchParams.get('address') || ''
  const sqMeters       = searchParams.get('sq_meters') || ''
  const occupied       = searchParams.get('occupied') || ''
  const notes          = searchParams.get('notes') || ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-4 border-[#E8432D]/30 border-t-[#E8432D] rounded-full animate-spin" />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-gray-400">Trabajador no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-[#E8432D] font-semibold">Volver</button>
      </div>
    )
  }

  const profile = worker.workerProfile || {}
  const stats = worker.stats || {}

  const avgRating  = stats.rating_avg  ? `${stats.rating_avg} ★` : '-- ★'
  const reviewCount = stats.rating_count  ?? 0
  const projectCount = stats.completed_projects ?? profile.completed_jobs ?? 0
  const yearsExp   = profile.years_experience ?? 0

  const handleConfirm = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para contratar')
      navigate('/login')
      return
    }
    if (!serviceId) {
      toast.error('Falta la información del servicio. Vuelve a buscar.')
      navigate('/services')
      return
    }

    // Pasar todos los datos necesarios para crear la solicitud en CalendarScreen
    const params = new URLSearchParams({
      workerId: worker.id,
      serviceId,
      serviceName,
      serviceCategory,
      city,
      address,
      sq_meters: sqMeters,
      occupied,
      notes,
    })
    navigate(`/calendar?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col page-enter">
      {/* Header con foto */}
      <div className="relative">
        <div className="h-64 bg-gray-200 overflow-hidden">
          <img src={worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'} alt={worker.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <button onClick={() => navigate(-1)}
          className="absolute top-14 left-5 w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <ArrowLeft size={18} color="white" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white">{worker.name}</h2>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={13} className="text-white/70" />
                <span className="text-white/70 text-sm">{profile.cities_covered?.[0] || city || 'Varias ciudades'}</span>
              </div>
            </div>
            {profile.is_verified && (
              <div className="flex items-center gap-1 bg-[#0F6E56] px-3 py-1.5 rounded-full">
                <Shield size={13} color="white" />
                <span className="text-white text-[11px] font-bold">Verificado</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex border-b border-gray-100">
        {[
          { label: 'Calificación', value: avgRating },
          { label: 'Reseñas',      value: reviewCount },
          { label: 'Proyectos',    value: projectCount },
          { label: 'Años exp.',    value: yearsExp },
        ].map(s => (
          <div key={s.label} className="flex-1 py-4 text-center border-r border-gray-100 last:border-0">
            <p className="text-[17px] font-extrabold text-[#111]">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio + Especialidades */}
      <div className="px-5 py-5 flex-1">
        <h3 className="font-bold text-[15px] text-[#111] mb-2">Sobre mí</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{profile.bio || 'Profesional dedicado y comprometido con la excelencia.'}</p>

        {/* Servicio solicitado */}
        {serviceName && serviceName !== 'Servicio' && (
          <div className="mt-4 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
            <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wide mb-0.5">Servicio a contratar</p>
            <p className="text-[14px] font-bold text-[#111]">{decodeURIComponent(serviceName)}</p>
            {city && <p className="text-[12px] text-gray-500 mt-0.5">📍 {city} {address && `· ${address}`}</p>}
          </div>
        )}

        {/* Especialidades */}
        {profile.specialties && profile.specialties.length > 0 && (
          <div className="mt-5">
            <p className="text-[12px] text-gray-400 font-extrabold uppercase tracking-wider mb-3">
              Servicios que ofrece
            </p>
            <div className="flex flex-col rounded-2xl border border-gray-100 overflow-hidden">
              {profile.specialties.map((key, idx) => {
                const svc = SERVICE_MAP[key]
                const isLast = idx === profile.specialties.length - 1
                return (
                  <div
                    key={key}
                    className={`px-4 py-3 text-[14px] font-semibold text-[#111] bg-white ${
                      !isLast ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    {svc?.label || key}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => toast('Contrata a este profesional para ver su teléfono', { icon: '📞' })}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-2xl text-[14px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Phone size={16} /> Llamar
          </button>
          <button
            onClick={() => toast('Inicia el proyecto primero para chatear', { icon: '💬' })}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-2xl text-[14px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <MessageCircle size={16} /> Chat
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 pt-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-4 bg-[#E8432D] text-white rounded-full text-[17px] font-bold disabled:opacity-50 hover:opacity-90 active:scale-[.98] transition-all"
        >
          {loading ? 'Cargando...' : `Contratar a ${worker.name.split(' ')[0]}`}
        </button>
        <p className="text-center text-[12px] text-gray-400 mt-2">
          Elegirás las fechas en el siguiente paso
        </p>
      </div>
    </div>
  )
}