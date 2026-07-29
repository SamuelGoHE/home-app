import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Ruler, Home, FileText, Info, X, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

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
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col page-enter">
      {/* ── Header ── */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-extrabold text-[#111] leading-tight truncate">Cotizar</h2>
            <p className="text-[12px] text-gray-400 font-medium truncate">{serviceName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-20 flex flex-col gap-5 stagger">
        
        {/* Card Informativa */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-[#E8432D]" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-[#111]">Detalles del espacio</h3>
            <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">
              Completa estos datos para que los profesionales puedan darte un presupuesto exacto.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100">
          
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <MapPin size={18} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1 relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Ciudad *</label>
              <button 
                type="button"
                onClick={() => setShowCityModal(true)}
                className={`w-full text-left bg-transparent outline-none text-[15px] font-semibold flex items-center justify-between
                  ${form.city ? 'text-[#111]' : 'text-gray-300'}`}
              >
                {form.city || 'Ej: Bogotá, Medellín...'}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <MapPin size={18} className="text-gray-400 flex-shrink-0 opacity-0" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Dirección *</label>
              <input 
                type="text" 
                placeholder="Dirección completa del proyecto" 
                value={form.address} 
                onChange={set('address')} 
                className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#111] placeholder-gray-300"
              />
            </div>
          </div>

          <div className="flex">
            <div className="flex-1 p-4 border-r border-gray-50 flex items-center gap-3">
              <Ruler size={18} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Área (m²)</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Ej: 45" 
                  value={form.sq_meters} 
                  onChange={set('sq_meters')} 
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#111] placeholder-gray-300"
                />
              </div>
            </div>
            <div className="flex-1 p-4 flex items-center gap-3">
              <Home size={18} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Estado *</label>
                <button
                  type="button"
                  onClick={() => setShowOccupiedModal(true)}
                  className={`w-full text-left text-[15px] font-semibold flex items-center justify-between
                    ${form.occupied ? 'text-[#111]' : 'text-gray-300'}`}
                >
                  <span>{form.occupied === 'ocupada' ? 'Ocupada' : form.occupied === 'desocupada' ? 'Desocupada' : 'Seleccionar'}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Notas Adicionales */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
          <FileText size={18} className="text-gray-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Notas adicionales</label>
            <textarea 
              value={form.notes} 
              onChange={set('notes')}
              placeholder="Describe detalles específicos, requerimientos especiales, o cualquier cosa que el profesional deba saber..."
              rows={3}
              className="w-full bg-transparent outline-none text-[14px] text-[#111] placeholder-gray-300 resize-none"
            />
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-5 pb-8 sm:pb-5 z-30">
        <button 
          onClick={handleSubmit} 
          disabled={!isValid || loading}
          className="w-full py-4 bg-[#E8432D] text-white rounded-full text-[17px] font-bold disabled:opacity-50 hover:bg-[#c93820] active:scale-[.98] transition-all flex items-center justify-center shadow-[0_4px_16px_rgba(232,67,45,0.35)]"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Procesando...
            </>
          ) : (
            'Buscar profesionales'
          )}
        </button>
      </div>

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCityModal(false)}></div>
          <div className="bg-white w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-[#111]">Ciudad del servicio</h3>
              <button onClick={() => setShowCityModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {[
                { value: 'Medellín', label: 'Medellín' },
                { value: 'Bogotá', label: 'Bogotá' },
                { value: 'Cali', label: 'Cali' },
                { value: 'Pereira', label: 'Pereira' }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setForm(prev => ({ ...prev, city: opt.value }));
                    setShowCityModal(false);
                  }}
                  className="py-3 px-4 rounded-xl text-left text-[14px] font-bold transition-all bg-gray-50 text-gray-700 hover:bg-[#E8432D] hover:text-white hover:shadow-md"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Occupied Modal */}
      {showOccupiedModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowOccupiedModal(false)} />
          <div className="bg-white w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-[#111]">Estado del inmueble</h3>
              <button onClick={() => setShowOccupiedModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { value: 'ocupada', label: 'Ocupada' },
                { value: 'desocupada', label: 'Desocupada' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm(prev => ({ ...prev, occupied: opt.value }))
                    setShowOccupiedModal(false)
                  }}
                  className={`py-3 px-4 rounded-xl text-left text-[14px] font-bold transition-all
                    ${form.occupied === opt.value
                      ? 'bg-[#E8432D] text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-[#E8432D] hover:text-white hover:shadow-md'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
