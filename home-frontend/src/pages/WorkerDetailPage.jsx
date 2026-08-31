import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Shield, Phone, MessageCircle, CalendarDays, FileSignature } from 'lucide-react'
import { useWorker } from '../hooks/useApi'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'
import { Button, IconButton, LoadingState } from '../components/ui'
import { EmptyState } from '../components/common'

const RATE_UNITS = { por_hora: 'por hora', por_dia: 'por día', por_m2: 'por m²', por_proyecto: 'por proyecto' }
const formatCOP = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

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
        <LoadingState />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-5">
        <EmptyState
          title="Trabajador no encontrado"
          action="Volver"
          onAction={() => navigate(-1)}
        />
      </div>
    )
  }

  const profile = worker.workerProfile || {}
  const selectedRate = worker.serviceRates?.find(rate => rate.specialty === serviceCategory)
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

    // Pasar todos los datos necesarios para crear la solicitud en CalendarScreen,
    // incluidas las tarifas fijas del trabajador para mostrarlas ahí.
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
      workerRateUnit: selectedRate?.price_unit || '',
      workerRateAmount: selectedRate?.amount || '',
      workerRateNote: selectedRate?.note || '',
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
        <IconButton
          icon={ArrowLeft}
          variant="ghost"
          aria-label="Volver"
          className="absolute top-14 left-5 !rounded-xl !bg-white/20 !text-white backdrop-blur-sm hover:!bg-white/30"
          onClick={() => navigate(-1)}
        />
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
            <p className="text-[17px] font-extrabold text-ink">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio + Especialidades */}
      <div className="px-5 py-5 flex-1">
        <h3 className="font-bold text-[15px] text-ink mb-2">Sobre mí</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{profile.bio || 'Profesional dedicado y comprometido con la excelencia.'}</p>

        {/* Precio específico para el servicio que escogió el cliente */}
        {selectedRate && (
          <div className="mt-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Precio para este servicio</p>
            {selectedRate.price_unit === 'a_convenir' ? (
              <p className="text-[14px] font-bold text-ink">Cotización después de revisar el trabajo</p>
            ) : (
              <p className="text-[21px] font-black text-ink">{formatCOP(selectedRate.amount)} <span className="text-[13px] text-gray-500">{RATE_UNITS[selectedRate.price_unit]}</span></p>
            )}
            <p className="text-[12px] text-gray-500 mt-2">{selectedRate.includes_materials ? 'Incluye materiales.' : 'No incluye materiales.'}{selectedRate.note ? ` ${selectedRate.note}` : ''}</p>
          </div>
        )}

        {/* Servicio solicitado */}
        {serviceName && serviceName !== 'Servicio' && (
          <div className="mt-4 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
            <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wide mb-0.5">Servicio a contratar</p>
            <p className="text-[14px] font-bold text-ink">{decodeURIComponent(serviceName)}</p>
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
                    className={`px-4 py-3 text-[14px] font-semibold text-ink bg-white ${
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
          {/* Llamar/Chat: funcionalidad simulada (solo toast) — se preserva tal
              cual, solo se reskinea con el componente Button del design system. */}
          <Button
            variant="secondary"
            fullWidth
            aria-label="Llamar"
            className="!bg-gray-100 !border-0 !rounded-2xl !text-gray-600 hover:!bg-gray-200"
            onClick={() => toast('Contrata a este profesional para ver su teléfono', { icon: '📞' })}
          >
            <Phone size={16} /> Llamar
          </Button>
          <Button
            variant="secondary"
            fullWidth
            aria-label="Chat"
            className="!bg-gray-100 !border-0 !rounded-2xl !text-gray-600 hover:!bg-gray-200"
            onClick={() => toast('Inicia el proyecto primero para chatear', { icon: '💬' })}
          >
            <MessageCircle size={16} /> Chat
          </Button>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 pt-2">
        <Button
          variant="primary"
          fullWidth
          disabled={loading}
          onClick={handleConfirm}
        >
          {loading ? 'Cargando...' : `Contratar a ${worker.name.split(' ')[0]}`}
        </Button>
        <p className="text-center text-[12px] text-gray-400 mt-2">
          Elegirás las fechas en el siguiente paso
        </p>
      </div>
    </div>
  )
}
