import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Moon, Bell, Mail, Trash2, ChevronRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

// Utilidad simple para guardar configuración en localStorage
const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('home-settings')) || {
      language: 'es',
      theme: 'light',
      pushEnabled: true,
      emailEnabled: false
    }
  } catch {
    return { language: 'es', theme: 'light', pushEnabled: true, emailEnabled: false }
  }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(loadSettings())
  const [showLangModal, setShowLangModal] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)

  // Guardar cada vez que cambian
  useEffect(() => {
    localStorage.setItem('home-settings', JSON.stringify(settings))
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDeleteAccount = () => {
    toast.error('La eliminación de cuenta está deshabilitada en esta versión de demostración.', {
      icon: '🛡️',
      duration: 4000
    })
  }

  // Componente de Switch estilo iOS
  const ToggleSwitch = ({ checked, onChange }) => (
    <button 
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#E8432D]' : 'bg-gray-200'}`}
    >
      <div 
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${checked ? 'translate-x-5.5 left-0.5' : 'translate-x-0 left-0.5'}`}
      />
    </button>
  )

  return (
    <div className="min-h-screen bg-[#f8f9fb] page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-extrabold text-[17px] text-[#111]">Configuración</h1>
      </div>

      <div className="flex-1 px-5 pt-6 pb-12 overflow-y-auto">
        
        {/* ── Preferencias de la Aplicación ── */}
        <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
          Preferencias de la app
        </h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <button 
            onClick={() => setShowLangModal(true)}
            className="w-full flex items-center gap-4 px-4 py-4 border-b border-gray-50 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500 flex-shrink-0">
              <Globe size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-[#111] leading-tight">Idioma</p>
              <p className="text-[12px] text-gray-400 mt-0.5">{settings.language === 'es' ? 'Español' : 'Inglés'}</p>
            </div>
            <ChevronRight size={17} className="text-gray-300" />
          </button>

          <button 
            onClick={() => setShowThemeModal(true)}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-purple-50 text-purple-500 flex-shrink-0">
              <Moon size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-[#111] leading-tight">Apariencia</p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {settings.theme === 'light' ? 'Modo Claro' : settings.theme === 'dark' ? 'Modo Oscuro' : 'Sistema'}
              </p>
            </div>
            <ChevronRight size={17} className="text-gray-300" />
          </button>
        </div>

        {/* ── Notificaciones ── */}
        <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
          Notificaciones
        </h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="w-full flex items-center gap-4 px-4 py-4 border-b border-gray-50">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500 flex-shrink-0">
              <Bell size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-[#111] leading-tight">Notificaciones Push</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Alertas en tu teléfono</p>
            </div>
            <ToggleSwitch 
              checked={settings.pushEnabled} 
              onChange={() => handleToggle('pushEnabled')} 
            />
          </div>

          <div className="w-full flex items-center gap-4 px-4 py-4">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500 flex-shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-[#111] leading-tight">Correos promocionales</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Descuentos y novedades</p>
            </div>
            <ToggleSwitch 
              checked={settings.emailEnabled} 
              onChange={() => handleToggle('emailEnabled')} 
            />
          </div>
        </div>

        {/* ── Zona de peligro ── */}
        <h3 className="text-[13px] font-bold text-red-400 uppercase tracking-wider mb-2.5 ml-2">
          Zona de peligro
        </h3>
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-3xl bg-red-50 border-2 border-red-100 text-red-500 hover:bg-red-100 active:scale-[.98] transition-all shadow-sm"
        >
          <Trash2 size={18} />
          <div className="flex-1 text-left">
            <p className="font-bold text-[15px] leading-tight">Eliminar cuenta</p>
            <p className="text-[12px] text-red-400 mt-0.5 font-medium">Esta acción es irreversible</p>
          </div>
        </button>
      </div>

      {/* ── Modal de Idioma ── */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLangModal(false)} />
          <div className="bg-white w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <h3 className="text-[18px] font-extrabold text-[#111] mb-4">Seleccionar Idioma</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'es', label: 'Español' },
                { id: 'en', label: 'Inglés' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => {
                    updateSetting('language', lang.id)
                    setShowLangModal(false)
                    if (lang.id === 'en') toast('English language package will be downloaded shortly.', { icon: '🇬🇧' })
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all font-bold ${
                    settings.language === lang.id 
                      ? 'border-[#E8432D] bg-red-50 text-[#E8432D]' 
                      : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {lang.label}
                  {settings.language === lang.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Apariencia ── */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowThemeModal(false)} />
          <div className="bg-white w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5 relative z-10 animate-slide-up">
            <h3 className="text-[18px] font-extrabold text-[#111] mb-4">Apariencia</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'light', label: 'Modo Claro' },
                { id: 'dark', label: 'Modo Oscuro' },
                { id: 'system', label: 'Igual al sistema' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => {
                    updateSetting('theme', theme.id)
                    setShowThemeModal(false)
                    if (theme.id === 'dark') toast('El modo oscuro está en fase beta 🚧', { icon: '🌙' })
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all font-bold ${
                    settings.theme === theme.id 
                      ? 'border-[#E8432D] bg-red-50 text-[#E8432D]' 
                      : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {theme.label}
                  {settings.theme === theme.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
