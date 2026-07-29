import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import { 
  LogOut, ChevronRight, User, Heart, Star, 
  FileText, Settings, HelpCircle, Shield, Bell
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationsPanel } from '../components/notifications/NotificationsPanel'

/* ─── Agrupación de Menú ─────────────────────────────────────────── */
const MENU_GROUPS = [
  {
    title: '',
    items: [
      { icon: FileText, label: 'Mis proyectos', path: '/projects', color: 'text-blue-500', bg: 'bg-blue-50' },
      { icon: Heart, label: 'Favoritos', path: '/favorites', color: 'text-red-500', bg: 'bg-red-50' },
      { icon: Star, label: 'Mis calificaciones', path: '/ratings/my', color: 'text-amber-500', bg: 'bg-amber-50' },
    ]
  },
  {
    title: 'Cuenta',
    items: [
      { icon: User, label: 'Mis datos personales', path: '/profile/edit', color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { icon: Bell, label: 'Notificaciones', path: null, color: 'text-orange-500', bg: 'bg-orange-50' },
      { icon: Shield, label: 'Seguridad y privacidad', path: '/security', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ]
  },
  {
    title: 'Aplicación',
    items: [
      { icon: HelpCircle, label: 'Centro de ayuda', path: '/help', color: 'text-gray-500', bg: 'bg-gray-100' },
      { icon: Settings, label: 'Configuración', path: '/settings', color: 'text-gray-500', bg: 'bg-gray-100' },
    ]
  }
]

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const { notifications, hasUnreadNotifs } = useNotifications()

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada correctamente')
    navigate('/welcome')
  }

  // Si tiene un provider OAuth distinto a 'local', podemos mostrar un indicador
  const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local'

  return (
    <div className="min-h-screen bg-[#f8f9fb] page-enter flex flex-col px-4 sm:px-6 lg:px-10 xl:px-16">
      <NotificationsPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} notifications={notifications} />

      {/* ── Header con Gradiente ── */}
      <div className="relative bg-gradient-to-b from-[#E8432D] to-[#c93820] pt-14 pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 bottom-0 w-32 h-32 bg-black/10 rounded-full blur-xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-[28px] bg-white p-1 shadow-xl">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-[24px]" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-[24px] flex items-center justify-center text-3xl font-extrabold text-gray-400">
                  {user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
                </div>
              )}
            </div>
            {isOAuth && (
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px]">
                  {user.oauth_provider === 'google' ? 'G' : user.oauth_provider === 'facebook' ? 'f' : '🍎'}
                </div>
              </div>
            )}
          </div>

          <h2 className="text-[22px] font-extrabold text-white leading-tight">
            {user?.name || 'Usuario'}
          </h2>
          <p className="text-white/80 text-[14px] font-medium mt-0.5">
            {user?.email}
          </p>
          
          <div className="mt-3 flex gap-2">
            <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 capitalize">
              {user?.role === 'trabajador' ? 'Trabajador' : 'Cliente'}
            </span>
            {user?.city && (
              <span className="bg-black/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-black/10">
                📍 {user.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 px-4 sm:px-6 lg:px-10 xl:px-16 -mt-10 pb-10 relative z-20">
        
        {/* Grupos de menú */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {MENU_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="stagger" style={{ animationDelay: `${gIdx * 0.1}s` }}>
              {group.title && (
                <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                  {group.title}
                </h3>
              )}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {group.items.map((item, iIdx) => {
                  const isNotif = item.label === 'Notificaciones'

                  return (
                    <button
                      key={iIdx}
                      onClick={() => {
                        if (isNotif) setIsNotifOpen(true)
                        else if (item.path) navigate(item.path)
                        else toast('Esta sección estará disponible pronto', { icon: '🚧' })
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 active:bg-gray-100 transition-colors relative"
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                        <item.icon size={18} className={item.color} />
                      </div>
                      <span className="flex-1 text-left font-semibold text-[15px] text-[#111]">
                        {item.label}
                      </span>
                      {isNotif && hasUnreadNotifs && (
                        <div className="w-2 h-2 rounded-full bg-[#E8432D] absolute right-12" />
                      )}
                      <ChevronRight size={17} className="text-gray-300" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Botón de cerrar sesión */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 mt-8 py-4 rounded-2xl bg-white border-2 border-red-100 text-red-500 font-bold text-[15px] hover:bg-red-50 active:scale-[.98] transition-all shadow-sm"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
        
        <p className="text-center text-[11px] font-medium text-gray-400 mt-6">
          HOME App v1.0.0
        </p>

      </div>
    </div>
  )
}
