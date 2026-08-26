import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Ruler, Home, FileText, Info, X, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'
import { Button, IconButton, Card } from '../components/ui'

export default function QuoteScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()

  const serviceId = searchParams.get('serviceId')
  const serviceName = searchParams.get('serviceName') || 'Servicio'

  const [form, setForm] = useState({ city: '', address: '', sq_meters: '', occupied: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [showCityModal, setShowCityModal] = useState(false)
  const [showOccupiedModal, setShowOccupiedModal] = useState(false)

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))
  
  // Validation
  const hasMeters = !form.sq_meters || Number(form.sq_meters) > 0
  const isValid = form.city.trim() && form.address.trim() && form.occupied && hasMeters

  const handleSubmit = () => {
    if (!serviceId) {
      toast('No seleccionaste un servicio válido')
      navigate('/services')
      return
    }

    if (form.sq_meters && Number(form.sq_meters) <= 0) {
      toast.error('El área en m² debe ser mayor a 0')
      return
    }

    // Pasar los datos del formulario a ResultsScreen como searchParams.
    // La solicitud se crea en CalendarScreen después de elegir trabajador + fechas.
    const serviceCategory = searchParams.get('serviceCategory') || ''
    const params = new URLSearchParams({
      serviceId,
      serviceName,
      serviceCategory,
      city: form.city,
      address: form.address,
      sq_meters: form.sq_meters || '',
      occupied: form.occupied === 'ocupada' ? 'true' : 'false',
      notes: form.notes || '',
    })
    navigate(`/results?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      {/* ── Header ── */}
      <div className="bg-surface sticky top-0 z-20 border-b border-border pb-2">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-extrabold text-ink leading-tight truncate">Cotizar</h2>
            <p className="text-[12px] text-muted font-medium truncate">{serviceName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-20 flex flex-col gap-5 stagger">

        {/* Card Informativa */}
        <Card padding="lg" className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-brand" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-ink">Detalles del espacio</h3>
            <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">
              Completa estos datos para que los profesionales puedan darte un presupuesto exacto.
            </p>
          </div>
        </Card>

        {/* Formulario */}
        <Card padding="none">

          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <MapPin size={18} className="text-muted flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 relative">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-0.5">Ciudad *</label>
              <button
                type="button"
                onClick={() => setShowCityModal(true)}
                className={`w-full text-left bg-transparent outline-none text-[15px] font-semibold flex items-center justify-between
                  ${form.city ? 'text-ink' : 'text-gray-300'}`}
              >
                {form.city || 'Ej: Bogotá, Medellín...'}
                <ChevronDown size={16} className="text-muted" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <MapPin size={18} className="text-muted flex-shrink-0 opacity-0" aria-hidden="true" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-0.5">Dirección *</label>
              <input
                type="text"
                placeholder="Dirección completa del proyecto"
                value={form.address}
                onChange={set('address')}
                className="w-full bg-transparent outline-none text-[15px] font-semibold text-ink placeholder-gray-300"
              />
            </div>
          </div>

          <div className="flex">
            <div className="flex-1 p-4 border-r border-gray-50 flex items-center gap-3">
              <Ruler size={18} className="text-muted flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-0.5">Área (m²)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 45"
                  value={form.sq_meters}
                  onChange={set('sq_meters')}
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-ink placeholder-gray-300"
                />
              </div>
            </div>
            <div className="flex-1 p-4 flex items-center gap-3">
              <Home size={18} className="text-muted flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-0.5">Estado *</label>
                <button
                  type="button"
                  onClick={() => setShowOccupiedModal(true)}
                  className={`w-full text-left text-[15px] font-semibold flex items-center justify-between
                    ${form.occupied ? 'text-ink' : 'text-gray-300'}`}
                >
                  <span>{form.occupied === 'ocupada' ? 'Ocupada' : form.occupied === 'desocupada' ? 'Desocupada' : 'Seleccionar'}</span>
                  <ChevronDown size={14} className="text-muted" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

        </Card>

        {/* Notas Adicionales */}
        <Card padding="md" className="flex items-start gap-3">
          <FileText size={18} className="text-muted flex-shrink-0 mt-1" aria-hidden="true" />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-1">Notas adicionales</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Describe detalles específicos, requerimientos especiales, o cualquier cosa que el profesional deba saber..."
              rows={3}
              className="w-full bg-transparent outline-none text-[14px] text-ink placeholder-gray-300 resize-none"
            />
          </div>
        </Card>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-border p-5 pb-8 sm:pb-5 z-30">
        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={loading}
          disabled={!isValid || loading}
          onClick={handleSubmit}
          className="!text-[17px]"
        >
          {loading ? 'Procesando...' : 'Buscar profesionales'}
        </Button>
      </div>

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCityModal(false)}></div>
          <div className="bg-surface w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-ink">Ciudad del servicio</h3>
              <IconButton icon={X} size="md" variant="solid" aria-label="Cerrar" className="!bg-gray-100 !border-0 !text-gray-500" onClick={() => setShowCityModal(false)} />
            </div>

            <div className="flex flex-col gap-2">
              {[
                { value: 'Medellín', label: 'Medellín' },
                { value: 'Bogotá', label: 'Bogotá' },
                { value: 'Cali', label: 'Cali' },
                { value: 'Pereira', label: 'Pereira' }
              ].map(opt => (
                <Button
                  key={opt.label}
                  variant="secondary"
                  className="!justify-start !rounded-xl !border-0 !bg-gray-50 hover:!bg-brand hover:!text-white"
                  onClick={() => {
                    setForm(prev => ({ ...prev, city: opt.value }));
                    setShowCityModal(false);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Occupied Modal */}
      {showOccupiedModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowOccupiedModal(false)} />
          <div className="bg-surface w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-ink">Estado del inmueble</h3>
              <IconButton icon={X} size="md" variant="solid" aria-label="Cerrar" className="!bg-gray-100 !border-0 !text-gray-500" onClick={() => setShowOccupiedModal(false)} />
            </div>

            <div className="flex flex-col gap-2">
              {[
                { value: 'ocupada', label: 'Ocupada' },
                { value: 'desocupada', label: 'Desocupada' },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={form.occupied === opt.value ? 'primary' : 'secondary'}
                  className={`!justify-start !rounded-xl ${form.occupied === opt.value ? '' : '!border-0 !bg-gray-50 hover:!bg-brand hover:!text-white'}`}
                  onClick={() => {
                    setForm(prev => ({ ...prev, occupied: opt.value }))
                    setShowOccupiedModal(false)
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
