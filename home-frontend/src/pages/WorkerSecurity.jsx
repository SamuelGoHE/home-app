import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Key, ShieldCheck, MonitorSmartphone, 
  MapPin, EyeOff, Download, X, CheckCircle2 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'
import { IconButton } from '../components/ui'

const loadSecuritySettings = () => {
  try {
    return JSON.parse(localStorage.getItem('home-worker-security')) || {
      locationEnabled: true,
      dataSharing: false,
      twoFactor: false
    }
  } catch {
    return { locationEnabled: true, dataSharing: false, twoFactor: false }
  }
}

export default function WorkerSecurity() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [settings, setSettings] = useState(loadSecuritySettings())
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    localStorage.setItem('home-worker-security', JSON.stringify(settings))
  }, [settings])

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success('Ajuste actualizado')
  }

  const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local'

  // Componente de Switch estilo iOS Premium
  const ToggleSwitch = ({ checked, onChange }) => (
    <button 
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-all relative ${checked ? 'bg-brand shadow-lg shadow-orange-500/20' : 'bg-gray-200'}`}
    >
      <div 
        className={`w-5.5 h-5.5 bg-white rounded-full absolute top-0.5.5 shadow-md transition-transform ${checked ? 'translate-x-5.5 left-0.5' : 'translate-x-0 left-0.5'}`}
        style={{ top: '3px', left: checked ? '22px' : '3px' }}
      />
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-x-hidden font-outfit">
      <div className="w-full max-w-[480px] bg-background min-h-screen shadow-2xl relative flex flex-col animate-fade-in">
        
        {/* ── HEADER ROJO (Consistente) ── */}
        <div className="bg-brand pt-16 pb-24 px-6 text-center relative">
          <IconButton
            icon={ArrowLeft}
            variant="ghost"
            aria-label="Volver"
            className="absolute top-12 left-6 !bg-white/20 !text-white backdrop-blur-md active:scale-90"
            onClick={() => navigate(-1)}
          />

          <div className="w-20 h-20 bg-white rounded-[28px] mx-auto shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20 mb-4">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl font-black text-gray-200">
                {user?.name?.[0].toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-xl font-black text-white">Seguridad</h1>
          <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mt-1">Protege tu cuenta profesional</p>
        </div>

        {/* ── CONTENIDO EN TARJETA ── */}
        <div className="flex-1 px-4 -mt-10 pb-12 relative z-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 space-y-8">
            
            {/* SECCIÓN: ACCESO */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Acceso y Seguridad</p>
              <div className="space-y-2">
                {!isOAuth && (
                  <button 
                    onClick={() => setShowPwdModal(true)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl hover:bg-white border border-transparent hover:border-gray-100 transition-all active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                      <Key size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-[14px] text-ink">Cambiar Contraseña</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Última vez hace 3 meses</p>
                    </div>
                  </button>
                )}

                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-ink">Autenticación (2FA)</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Doble factor por SMS</p>
                  </div>
                  <ToggleSwitch checked={settings.twoFactor} onChange={() => handleToggle('twoFactor')} />
                </div>

                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                    <MonitorSmartphone size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-ink">Sesiones Activas</p>
                    <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider">1 dispositivo ahora</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN: PRIVACIDAD */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Privacidad y Datos</p>
              <div className="space-y-2">
                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-brand shadow-sm">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-ink">Ubicación en tiempo real</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Para trabajos cercanos</p>
                  </div>
                  <ToggleSwitch checked={settings.locationEnabled} onChange={() => handleToggle('locationEnabled')} />
                </div>

                <div className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-transparent">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                    <EyeOff size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-[14px] text-ink">Perfil Invisible</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Solo tú ves tu actividad</p>
                  </div>
                  <ToggleSwitch checked={settings.dataSharing} onChange={() => handleToggle('dataSharing')} />
                </div>
              </div>
            </div>

            {/* BOTÓN DESCARGAR DATOS */}
            <button
              onClick={() => toast.success('Solicitud enviada. Recibirás tus datos en el correo vinculado.', { icon: '📥' })}
              className="w-full flex items-center gap-4 p-5 bg-orange-50 rounded-[28px] border border-orange-100 group active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand shadow-sm">
                <Download size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-[15px] text-brand">Descargar mis datos</p>
                <p className="text-[11px] text-brand/60 font-bold uppercase tracking-wider">Copia legal de tu historial</p>
              </div>
            </button>

          </div>
        </div>

        {/* ── MODAL CAMBIAR CONTRASEÑA ── */}
        {showPwdModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
            <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPwdModal(false)} />
            <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl relative z-10 p-8 animate-slide-up border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Key size={28} />
                </div>
                <IconButton
                  icon={X}
                  variant="ghost"
                  aria-label="Cerrar"
                  className="!bg-gray-50 !text-gray-400"
                  onClick={() => setShowPwdModal(false)}
                />
              </div>

              <h3 className="text-2xl font-black text-ink mb-2">Nueva Contraseña</h3>
              <p className="text-sm text-gray-400 font-medium mb-8">Asegúrate de usar al menos 8 caracteres</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-gray-300 uppercase tracking-widest ml-1 mb-2 block">Contraseña actual</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand/10"
                    value={pwdForm.current}
                    onChange={(e) => setPwdForm({...pwdForm, current: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-300 uppercase tracking-widest ml-1 mb-2 block">Nueva contraseña</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-brand/10"
                    value={pwdForm.new}
                    onChange={(e) => setPwdForm({...pwdForm, new: e.target.value})}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success('Contraseña actualizada correctamente')
                  setShowPwdModal(false)
                }}
                className="w-full mt-10 py-5 bg-brand text-white rounded-[24px] font-black text-[14px] uppercase tracking-wider shadow-xl shadow-orange-100 active:scale-[0.97] transition-all"
              >
                Actualizar Ahora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
