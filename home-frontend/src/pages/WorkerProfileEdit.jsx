import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, CheckCircle2, FileText, DollarSign } from 'lucide-react'
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
  { key: 'pintura',            label: 'Pintura',                 icon: Palette },
  { key: 'electricidad',       label: 'Instalaciones Eléctricas', icon: Zap },
  { key: 'enchapes',           label: 'Enchapes',                icon: Layers },
  { key: 'plomeria',           label: 'Plomería General',        icon: Droplets },
  { key: 'impermeabilizacion', label: 'Impermeabilización',      icon: Waves },
  { key: 'obra_gris',          label: 'Obra Gris',               icon: Construction },
  { key: 'carpinteria',        label: 'Carpintería',             icon: Hammer },
  { key: 'otro',               label: 'Otro',                    icon: PencilRuler },
]

const RATE_UNITS = [
  { key: 'por_proyecto', label: 'Por proyecto' },
  { key: 'por_dia', label: 'Por día' },
  { key: 'por_m2', label: 'Por m²' },
  { key: 'por_hora', label: 'Por hora' },
  { key: 'a_convenir', label: 'A convenir' },
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

  const [form, setForm] = useState({ bio: '', years_experience: '' })
  const [selectedServices, setSelectedServices] = useState(new Set())
  const [serviceRates, setServiceRates] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (workerData?.workerProfile) {
      setForm({
        bio: workerData.workerProfile.bio || '',
        years_experience: workerData.workerProfile.years_experience || '',
      })
      // Cargar especialidades guardadas previamente
      const saved = workerData.workerProfile.specialties || []
      setSelectedServices(new Set(saved))
      setServiceRates(Object.fromEntries((workerData.serviceRates || []).map(rate => [rate.specialty, {
        price_unit: rate.price_unit,
        amount: rate.amount || '',
        includes_materials: !!rate.includes_materials,
        note: rate.note || '',
      }])))
    }
  }, [workerData])

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const toggleService = (key) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setServiceRates(prev => {
      if (prev[key]) {
        const { [key]: _removed, ...remaining } = prev
        return remaining
      }
      return { ...prev, [key]: { price_unit: 'por_proyecto', amount: '', includes_materials: false, note: '' } }
    })
  }

  const updateRate = (specialty, field, value) => setServiceRates(prev => ({
    ...prev,
    [specialty]: { ...prev[specialty], [field]: value },
  }))

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (selectedServices.size === 0) {
      toast.error('Selecciona al menos un servicio')
      return
    }
    const rates = Array.from(selectedServices).map(specialty => ({ specialty, ...serviceRates[specialty] }))
    if (rates.some(rate => rate.price_unit !== 'a_convenir' && (!rate.amount || Number(rate.amount) <= 0))) {
      toast.error('Indica un precio válido para cada especialidad')
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
        service_rates: rates.map(rate => ({ ...rate, amount: rate.amount === '' ? null : Number(rate.amount) })),
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
              Selecciona únicamente los oficios que puedes realizar. Después publica una tarifa para cada uno.
            </p>
          </div>

          {/* TARIFAS POR ESPECIALIDAD */}
          <div className="space-y-4">
            <div className="px-1">
              <label className="text-[12px] font-black text-gray-300 uppercase tracking-widest">Tus precios publicados</label>
              <p className="text-[12px] text-gray-400 mt-1">El cliente verá este precio al buscar el servicio. Los materiales se aclaran por separado.</p>
            </div>
            {Array.from(selectedServices).map(specialty => {
              const service = ALL_SERVICES.find(item => item.key === specialty)
              const rate = serviceRates[specialty] || { price_unit: 'por_proyecto', amount: '', includes_materials: false, note: '' }
              return (
                <div key={specialty} className="bg-gray-50 rounded-[24px] p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white text-brand flex items-center justify-center"><DollarSign size={18} /></div>
                    <p className="text-[14px] font-black text-ink">{service?.label || specialty}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_1.2fr] gap-3">
                    <select value={rate.price_unit} onChange={e => updateRate(specialty, 'price_unit', e.target.value)} className="bg-white rounded-xl px-3 text-[13px] font-bold text-ink outline-none">
                      {RATE_UNITS.map(unit => <option key={unit.key} value={unit.key}>{unit.label}</option>)}
                    </select>
                    {rate.price_unit === 'a_convenir' ? (
                      <div className="bg-white rounded-xl px-3 flex items-center text-[12px] font-semibold text-gray-400">Cotizas tras revisar</div>
                    ) : (
                      <input type="number" min="1" placeholder="Precio en COP" value={rate.amount} onChange={e => updateRate(specialty, 'amount', e.target.value)} className="bg-white rounded-xl px-3 text-[14px] font-bold text-ink outline-none" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
                    <input type="checkbox" checked={rate.includes_materials} onChange={e => updateRate(specialty, 'includes_materials', e.target.checked)} className="accent-brand" />
                    Incluye materiales
                  </label>
                  <input value={rate.note} maxLength="280" placeholder="Nota opcional, por ejemplo: incluye mano de obra" onChange={e => updateRate(specialty, 'note', e.target.value)} className="w-full bg-white rounded-xl px-3 py-3 text-[12px] font-medium text-ink outline-none" />
                </div>
              )
            })}
            {selectedServices.size === 0 && <p className="rounded-2xl bg-gray-50 p-4 text-[13px] text-gray-400">Primero selecciona tus especialidades para configurar sus precios.</p>}
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
