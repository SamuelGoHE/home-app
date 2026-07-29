import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Briefcase, CheckCircle2, Check, FileText } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useWorker } from '../hooks/useApi'
import api from '../services/api'
import toast from 'react-hot-toast'

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
        <button onClick={() => navigate(-1)} className="px-5 py-2 bg-gray-200 rounded-xl font-bold">Volver</button>
      </div>
    )
  }

  const { data: workerData, loading: loadingData } = useWorker(user.id)

  const [form, setForm] = useState({ bio: '', years_experience: '' })
  const [selectedServices, setSelectedServices] = useState(new Set())
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

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (selectedServices.size === 0) {
      toast.error('Selecciona al menos un servicio')
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
          : [user.city]
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
        <span className="w-8 h-8 border-4 border-[#E8432D]/30 border-t-[#E8432D] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-[480px] bg-[#f8f9fb] min-h-screen shadow-2xl relative flex flex-col animate-fade-in">
        
        {/* ── HEADER ROJO (Igual al Dashboard) ── */}
        <div className="bg-[#E8432D] pt-16 pb-24 px-6 text-center relative">
          {/* Botón Volver */}
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-12 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>

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
                  className="w-full bg-gray-50 border-none rounded-[24px] p-6 text-[15px] font-medium text-[#111] outline-none focus:ring-2 focus:ring-[#E8432D]/10 transition-all resize-none placeholder:text-gray-200"
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
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#E8432D] shadow-sm flex-shrink-0">
                  <Briefcase size={20} />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Años"
                    value={form.years_experience}
                    onChange={set('years_experience')}
                    className="w-full bg-transparent border-none p-0 text-[18px] font-black text-[#111] outline-none placeholder:text-gray-200"
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
                  <span className="text-[10px] font-black text-[#E8432D] bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">
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
                        ? 'border-[#E8432D] bg-orange-50 text-[#E8432D] shadow-md shadow-orange-500/5'
                        : 'border-gray-50 bg-gray-50/50 text-gray-400'
                      }`}
                  >
                    <Icon size={18} className={selected ? 'text-[#E8432D]' : 'text-gray-300'} />
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
        <div className="absolute bottom-0 inset-x-0 p-8 pt-0 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb]/80 to-transparent z-50">
          <button
            onClick={handleSubmit}
            disabled={saving || selectedServices.size === 0}
            className="w-full py-5 bg-[#E8432D] text-white rounded-[24px] font-black text-[15px] uppercase tracking-widest shadow-2xl shadow-orange-500/30 active:scale-[.97] transition-all flex items-center justify-center gap-3 disabled:opacity-30"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
