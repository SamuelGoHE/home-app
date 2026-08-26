import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Briefcase, CheckCircle2, Check, FileText, DollarSign, CalendarDays, FileSignature } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useWorker } from '../hooks/useApi'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Button, IconButton, LoadingState } from '../components/ui'

/* ─── Servicios disponibles en la plataforma ─────────────────────── */
import { 
  Palette, Zap, Droplets, Construction, Waves, 
  Hammer, Home, Layers, Shovel, PencilRuler, PenTool 
} from 'lucide-react'

const ALL_SERVICES = [
  { key: 'pintura',            label: 'Pintura Interior',        icon: Palette },
  { key: 'pintura_ext',        label: 'Pintura Exterior',        icon: PenTool },
  { key: 'electricidad',       label: 'Instalaciones Eléctricas', icon: Zap },
  { key: 'enchapes',           label: 'Enchapes de Baño',        icon: Layers },
  { key: 'plomeria',           label: 'Plomería General',        icon: Droplets },
  { key: 'impermeabilizacion', label: 'Impermeabilización',      icon: Waves },
  { key: 'obra_gris',          label: 'Obra Gris',               icon: Construction },
  { key: 'carpinteria',        label: 'Carpintería en Madera',   icon: Hammer },
  { key: 'remodelacion',       label: 'Remodelación',            icon: Home },
  { key: 'techos',             label: 'Techos y Cielos',         icon: Layers },
  { key: 'pisos',              label: 'Pisos',                   icon: Shovel },
  { key: 'otro',               label: 'Otro',                    icon: PencilRuler },
]

export default function WorkerProfileEdit() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (!user || user.role !== 'trabajador') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
        <p className="text-gray-500 mb-4">Acceso denegado</p>
        <Button
          variant="secondary"
          className="!bg-gray-200 !border-0 !rounded-xl"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
      </div>
    )
  }

  const { data: workerData, loading: loadingData } = useWorker(user.id)

  const [form, setForm] = useState({ bio: '', years_experience: '', daily_rate: '', contract_pricing_note: '' })
  const [selectedServices, setSelectedServices] = useState(new Set())
  const [pricingModes, setPricingModes] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (workerData?.workerProfile) {
      setForm({
        bio: workerData.workerProfile.bio || '',
        years_experience: workerData.workerProfile.years_experience || '',
        daily_rate: workerData.workerProfile.daily_rate || '',
        contract_pricing_note: workerData.workerProfile.contract_pricing_note || '',
      })
      // Cargar especialidades guardadas previamente
      const saved = workerData.workerProfile.specialties || []
      setSelectedServices(new Set(saved))
      setPricingModes(new Set(workerData.workerProfile.pricing_modes || []))
    }
  }, [workerData])

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const toggleService = (key) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const togglePricingMode = (mode) => {
    setPricingModes(prev => {
      const next = new Set(prev)
      next.has(mode) ? next.delete(mode) : next.add(mode)
      return next
    })
  }

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (selectedServices.size === 0) {
      toast.error('Selecciona al menos un servicio')
      return
    }
    if (pricingModes.size === 0) {
      toast.error('Elige al menos una modalidad de cobro')
      return
    }
    if (pricingModes.has('por_dia') && !form.daily_rate) {
      toast.error('Indica tu tarifa por día')
      return
    }
    if (pricingModes.has('por_contrato') && !form.contract_pricing_note.trim()) {
      toast.error('Describe cómo cotizas tus contratos')
      return
    }
    setSaving(true)
    try {
      await api.put('/users/worker-profile', {
        bio: form.bio,
        years_experience: form.years_experience ? parseInt(form.years_experience, 10) : 0,
        specialties: Array.from(selectedServices),
        cities_covered: workerData?.workerProfile?.cities_covered?.length > 0
          ? workerData.workerProfile.cities_covered
          : [user.city],
        pricing_modes: Array.from(pricingModes),
        daily_rate: pricingModes.has('por_dia') && form.daily_rate ? parseFloat(form.daily_rate) : null,
        contract_pricing_note: pricingModes.has('por_contrato') && form.contract_pricing_note
          ? form.contract_pricing_note.trim()
          : null,
      })
      toast.success('Perfil actualizado correctamente')
      navigate(-1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-[480px] bg-background min-h-screen shadow-2xl relative flex flex-col animate-fade-in">
        
        {/* ── HEADER ROJO (Igual al Dashboard) ── */}
        <div className="bg-brand pt-16 pb-24 px-6 text-center relative">
          {/* Botón Volver */}
          <IconButton
            icon={ArrowLeft}
            variant="ghost"
            aria-label="Volver"
            className="absolute top-12 left-6 !bg-white/20 !text-white backdrop-blur-md active:scale-90"
            onClick={() => navigate(-1)}
          />

          <div className="w-24 h-24 bg-white rounded-[32px] mx-auto shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20 mb-4">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-3xl font-black text-gray-200">
                {user?.name?.[0].toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-white">{user.name}</h1>
          <p className="text-white/70 text-[13px] font-bold uppercase tracking-widest mt-1">Editar Perfil Público</p>
        </div>

        {/* ── CONTENIDO EN TARJETA SUPERPUESTA ── */}
        <div className="flex-1 px-4 -mt-10 pb-40 relative z-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 space-y-10">
            
            {/* SECCIÓN: BIOGRAFÍA */}
            <div className="space-y-4">
              <label className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1">Sobre mí</label>
              <div className="relative">
                <textarea
                  rows={4}
                  placeholder="Describe tu experiencia..."
                  value={form.bio}
                  onChange={set('bio')}
                  className="w-full bg-gray-50 border-none rounded-[24px] p-6 text-[15px] font-medium text-ink outline-none focus:ring-2 focus:ring-brand/10 transition-all resize-none placeholder:text-gray-200"
                />
                <div className="absolute top-6 right-6 text-gray-200">
                  <FileText size={18} />
                </div>
              </div>
            </div>

            {/* SECCIÓN: EXPERIENCIA */}
            <div className="space-y-4">
              <label className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1">Experiencia</label>
              <div className="bg-gray-50 rounded-[24px] p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand shadow-sm flex-shrink-0">
                  <Briefcase size={20} />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Años"
                    value={form.years_experience}
                    onChange={set('years_experience')}
                    className="w-full bg-transparent border-none p-0 text-[18px] font-black text-ink outline-none placeholder:text-gray-200"
                  />
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Años de trayectoria</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN: MODALIDAD DE COBRO */}
            <div className="space-y-4">
              <label className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1">Cómo cobras</label>
              <p className="text-[12px] text-gray-400 px-1 -mt-2">Por día define un precio fijo. Por contrato no hay un número único — depende de m², materiales y alcance — así que describes cómo cotizas y defines el monto al aceptar cada solicitud.</p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'por_dia', label: 'Por día', icon: CalendarDays, hint: 'Precio fijo por jornada' },
                  { key: 'por_contrato', label: 'Por contrato', icon: FileSignature, hint: 'Cotizas cada trabajo' },
                ].map(({ key, label, icon: Icon, hint }) => {
                  const selected = pricingModes.has(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePricingMode(key)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-[24px] border-2 text-left transition-all
                        ${selected ? 'border-brand bg-orange-50' : 'border-gray-50 bg-gray-50/50'}`}
                    >
                      <Icon size={20} className={selected ? 'text-brand' : 'text-gray-300'} />
                      <span className={`text-[13px] font-black ${selected ? 'text-brand' : 'text-gray-500'}`}>{label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{hint}</span>
                    </button>
                  )
                })}
              </div>

              {pricingModes.has('por_dia') && (
                <div className="bg-gray-50 rounded-[24px] p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand shadow-sm flex-shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="Ej: 120000"
                      value={form.daily_rate}
                      onChange={set('daily_rate')}
                      className="w-full bg-transparent border-none p-0 text-[18px] font-black text-ink outline-none placeholder:text-gray-200"
                    />
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Precio fijo por día ($)</p>
                  </div>
                </div>
              )}

              {pricingModes.has('por_contrato') && (
                <div className="bg-gray-50 rounded-[24px] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-brand" />
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">¿Cómo cotizas tus contratos?</p>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Ej: Cotizo según m² y materiales, te confirmo el precio después de revisar el trabajo"
                    value={form.contract_pricing_note}
                    onChange={set('contract_pricing_note')}
                    className="w-full bg-white border-none rounded-2xl p-4 text-[14px] font-medium text-ink outline-none focus:ring-2 focus:ring-brand/10 transition-all resize-none placeholder:text-gray-300"
                  />
                </div>
              )}
            </div>

            {/* SECCIÓN: SERVICIOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[12px] font-black text-gray-300 uppercase tracking-widest">Especialidades</label>
                {selectedServices.size > 0 && (
                  <span className="text-[10px] font-black text-brand bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedServices.size}
                  </span>
                )}
              </div>

            {/* Slide Bar Horizontal */}
            <div className="flex overflow-x-auto gap-3 py-4 -mx-8 px-8 no-scrollbar scroll-smooth">
              {ALL_SERVICES.map(svc => {
                const selected = selectedServices.has(svc.key)
                const Icon = svc.icon
                return (
                  <button
                    key={svc.key}
                    type="button"
                    onClick={() => toggleService(svc.key)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-full border-2 whitespace-nowrap transition-all active:scale-[.95]
                      ${selected
                        ? 'border-brand bg-orange-50 text-brand shadow-md shadow-orange-500/5'
                        : 'border-gray-50 bg-gray-50/50 text-gray-400'
                      }`}
                  >
                    <Icon size={18} className={selected ? 'text-brand' : 'text-gray-300'} />
                    <span className="text-[13px] font-black uppercase tracking-wider">
                      {svc.label}
                    </span>
                  </button>
                )
              })}
            </div>
            
            <p className="text-[11px] text-gray-400 mt-2 px-1 font-medium leading-relaxed">
              Desliza horizontalmente para ver todos los servicios. Selecciona tus especialidades favoritas.
            </p>
          </div>

          </div>
        </div>

        {/* BOTÓN DE GUARDADO FLOTANTE */}
        <div className="absolute bottom-0 inset-x-0 p-8 pt-0 bg-gradient-to-t from-background via-background/80 to-transparent z-50">
          <Button
            variant="primary"
            fullWidth
            loading={saving}
            disabled={selectedServices.size === 0}
            aria-label="Guardar cambios"
            className="!rounded-[24px] !py-5 uppercase tracking-widest !shadow-2xl !shadow-orange-500/30"
            onClick={handleSubmit}
          >
            {saving ? 'Guardando...' : (
              <span className="inline-flex items-center gap-3">
                <CheckCircle2 size={18} />
                Guardar Cambios
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
