import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Smartphone, MapPin, EyeOff, Download, ShieldCheck, MonitorSmartphone, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'
import { Button, IconButton, Card, Input } from '../components/ui'

const loadSecuritySettings = () => {
  try {
    return JSON.parse(localStorage.getItem('home-security-settings')) || {
      locationEnabled: true,
      dataSharing: false,
      twoFactor: false
    }
  } catch {
    return { locationEnabled: true, dataSharing: false, twoFactor: false }
  }
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [settings, setSettings] = useState(loadSecuritySettings())
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    localStorage.setItem('home-security-settings', JSON.stringify(settings))
  }, [settings])

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAction = (message, icon = '✅') => {
    toast.success(message, { icon, duration: 3000 })
  }

  const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local'

  // Componente de Switch estilo iOS
  const ToggleSwitch = ({ checked, onChange }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-brand' : 'bg-gray-200'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${checked ? 'translate-x-5.5 left-0.5' : 'translate-x-0 left-0.5'}`}
      />
    </button>
  )

  return (
    <div className="min-h-screen bg-background page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-surface px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border sticky top-0 z-10">
        <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
        <h1 className="text-heading text-ink">Seguridad y privacidad</h1>
      </div>

      <div className="flex-1 px-5 pt-6 pb-12 overflow-y-auto">

        {/* ── Seguridad de la Cuenta ── */}
        <h3 className="text-label uppercase text-muted mb-2.5 ml-2">
          Seguridad de la Cuenta
        </h3>
        <Card padding="none" className="overflow-hidden mb-6">
          {!isOAuth && (
            <button
              onClick={() => setShowPwdModal(true)}
              className="w-full flex items-center gap-4 px-4 py-4 border-b border-border hover:bg-background/80 active:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-500 flex-shrink-0">
                <Key size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[15px] text-ink leading-tight">Cambiar contraseña</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Último cambio hace 3 meses</p>
              </div>
            </button>
          )}

          <div className="w-full flex items-center gap-4 px-4 py-4 border-b border-border">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500 flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-ink leading-tight">Autenticación (2FA)</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Seguridad adicional por SMS</p>
            </div>
            <ToggleSwitch checked={settings.twoFactor} onChange={() => handleToggle('twoFactor')} />
          </div>

          <div className="w-full flex items-center gap-4 px-4 py-4">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500 flex-shrink-0">
              <MonitorSmartphone size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-ink leading-tight">Dispositivos vinculados</p>
              <p className="text-[12px] text-emerald-500 font-medium mt-0.5">1 sesión activa en {user?.city || 'tu ciudad'}</p>
            </div>
          </div>
        </Card>

        {/* ── Privacidad y Permisos ── */}
        <h3 className="text-label uppercase text-muted mb-2.5 ml-2">
          Privacidad y Permisos
        </h3>
        <Card padding="none" className="overflow-hidden mb-6">
          <div className="w-full flex items-center gap-4 px-4 py-4 border-b border-border">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-red-50 text-brand flex-shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-ink leading-tight">Acceso a ubicación</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Para sugerir servicios cercanos</p>
            </div>
            <ToggleSwitch checked={settings.locationEnabled} onChange={() => handleToggle('locationEnabled')} />
          </div>

          <div className="w-full flex items-center gap-4 px-4 py-4">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gray-100 text-gray-500 flex-shrink-0">
              <EyeOff size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[15px] text-ink leading-tight">Compartir estadísticas</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Mejorar el servicio de forma anónima</p>
            </div>
            <ToggleSwitch checked={settings.dataSharing} onChange={() => handleToggle('dataSharing')} />
          </div>
        </Card>

        {/* ── Gestión de Datos ── */}
        <h3 className="text-label uppercase text-muted mb-2.5 ml-2">
          Gestión de Datos
        </h3>
        <button
          onClick={() => handleAction('Tu archivo de datos está siendo preparado. Te llegará al correo en 24h.', '📥')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-surface border border-border text-ink hover:bg-background active:scale-[.98] transition-all shadow-sm"
        >
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500 flex-shrink-0">
            <Download size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-[15px] leading-tight">Descargar mis datos</p>
            <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Obtén una copia de todo tu historial</p>
          </div>
        </button>
      </div>

      {/* ── Modal de Cambiar Contraseña ── */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPwdModal(false)} />
          <Card padding="lg" className="w-full sm:w-96 rounded-t-3xl sm:rounded-3xl relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-heading text-ink">Cambiar contraseña</h3>
              <IconButton icon={X} aria-label="Cerrar" onClick={() => setShowPwdModal(false)} />
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Contraseña actual"
                type="password"
                value={pwdForm.current}
                onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                placeholder="••••••••"
              />
              <Input
                label="Nueva contraseña"
                type="password"
                value={pwdForm.new}
                onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })}
                placeholder="••••••••"
              />
              <Input
                label="Confirmar nueva"
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              className="mt-6"
              onClick={() => {
                if (!pwdForm.current || !pwdForm.new || !pwdForm.confirm) {
                  toast.error('Llena todos los campos')
                  return
                }
                if (pwdForm.new !== pwdForm.confirm) {
                  toast.error('Las contraseñas no coinciden')
                  return
                }
                toast.success('Contraseña actualizada con éxito')
                setShowPwdModal(false)
                setPwdForm({ current: '', new: '', confirm: '' })
              }}
            >
              Guardar cambios
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
