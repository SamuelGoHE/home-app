import { Navigate, Outlet, useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'
import { Home, Tag, Heart, User } from 'lucide-react'

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/welcome" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin' || user?.role === 'admin_finanzas') return <Navigate to="/admin" replace />
    if (user?.role === 'trabajador') return <Navigate to="/worker" replace />
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}

export function AppShell() {
  const location = useLocation()
  const noTab = ['/lang', '/welcome', '/login', '/register']
  const hideTab = noTab.some(p => location.pathname.startsWith(p))
  return (
    <div className="min-h-screen bg-white font-outfit w-full relative flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      {!hideTab && <TabBar />}
    </div>
  )
}

const tabs = [
  { to: '/home',     icon: Home,  label: 'Inicio' },
  { to: '/services', icon: Tag,   label: 'Servicios' },
  { to: '/favorites',icon: Heart, label: 'Favoritos' },
  { to: '/profile',  icon: User,  label: 'Perfil' },
]

function TabBar() {
  const { user } = useAuthStore()
  if (user?.role === 'trabajador' || user?.role === 'admin') return null

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 flex z-50"
      style={{ height: 68 }}>
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors
           ${isActive ? 'text-[#E8432D]' : 'text-gray-400'}`}>
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}