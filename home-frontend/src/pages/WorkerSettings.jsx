import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Globe, Moon, Bell, Mail, 
  Trash2, ChevronRight, Check, Settings 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'

const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('home-worker-settings')) || {
      language: 'es',
      theme: 'light',
      pushEnabled: true,
      emailEnabled: true
    }
  } catch {
    return { language: 'es', theme: 'light', pushEnabled: true, emailEnabled: true }
  }
}

export default function WorkerSettings() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [settings, setSettings] = useState(loadSettings())
  const [showLangModal, setShowLangModal] = useState(false)

  useEffect(() => {
    localStorage.setItem('home-worker-settings', JSON.stringify(settings))
  }, [settings])

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success('Ajuste guardado')
  }

  const ToggleSwitch = ({ checked, onChange }) => (
    <button 
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-all relative ${checked ? 'bg-[#E8432D] shadow-lg shadow-orange-500/20' : 'bg-gray-200'}`}
    >
      <div 
        className={`w-5.5 h-5.5 bg-white rounded-full absolute transition-transform`}
        style={{ top: '3px', left: checked ? '22px' : '3px' }}
      />
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-x-hidden font-outfit">
      <div className="w-full max-w-[480px] bg-[#f8f9fb] min-h-screen shadow-2xl relative flex flex-col animate-fade-in">
        
        {/* ── HEADER ROJO ── */}
        <div className="bg-[#E8432D] pt-16 pb-24 px-6 text-center relative">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-12 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-20 h-20 bg-white rounded-[28px] mx-auto shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20 mb-4">
            <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-500">
              <Settings size={32} />
            </div>
          </div>
          <h1 className="text-xl font-black text-white">Configuración</h1>
          <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mt-1">Personaliza tu experiencia</p>
        </div>

        {/* ── CONTENIDO ── */}
        <div className="flex-1 px-4 -mt-10 pb-12 relative z-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 space-y-8">
            
            {/* PREFERENCIAS APP */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Preferencias</p>
              <div className="space-y-2">
                <button 
                  onClick={() => setShowLangModal(true)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-100 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                    <Globe size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-[#111]">Idioma</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{settings.language === 'es' ? 'Español' : 'English'}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-purple-500 shadow-sm">
                    <Moon size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-[#111]">Modo Oscuro</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Beta</p>
                  </div>
                  <ToggleSwitch checked={settings.theme === 'dark'} onChange={() => handleToggle('theme')} />
                </div>
              </div>
            </div>

            {/* NOTIFICACIONES */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Notificaciones</p>
              <div className="space-y-2">
                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-sm">
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-[#111]">Alertas Push</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Nuevos trabajos</p>
                  </div>
                  <ToggleSwitch checked={settings.pushEnabled} onChange={() => handleToggle('pushEnabled')} />
                </div>
              </div>
            </div>

            {/* ZONA PELIGRO */}
            <div className="pt-4">
              <button
                onClick={() => toast.error('Función no disponible en demo')}
                className="w-full flex items-center gap-4 p-5 bg-red-50 rounded-[28px] border border-red-100 group active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-500 shadow-sm">
                  <Trash2 size={22} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-[15px] text-red-500">Eliminar cuenta</p>
                  <p className="text-[11px] text-red-400 font-bold uppercase tracking-wider">Acción irreversible</p>
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* MODAL IDIOMA */}
        {showLangModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
            <div className="fixed inset-0 bg-[#111]/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowLangModal(false)} />
            <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl relative z-10 p-8 animate-slide-up">
              <h3 className="text-xl font-black text-[#111] mb-6">Idioma de la App</h3>
              <div className="space-y-3">
                {['Español', 'English'].map(l => (
                  <button 
                    key={l}
                    onClick={() => {
                      setSettings({...settings, language: l === 'Español' ? 'es' : 'en'})
                      setShowLangModal(false)
                    }}
                    className={`w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all
                      ${(l === 'Español' && settings.language === 'es') || (l === 'English' && settings.language === 'en')
                        ? 'border-[#E8432D] bg-orange-50 text-[#E8432D]'
                        : 'border-gray-50 bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="font-black text-[14px] uppercase tracking-wider">{l}</span>
                    {((l === 'Español' && settings.language === 'es') || (l === 'English' && settings.language === 'en')) && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
