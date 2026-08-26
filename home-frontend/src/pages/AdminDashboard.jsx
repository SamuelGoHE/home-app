import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import {
  LayoutDashboard, Users,
  ShieldCheck, LogOut, CheckCircle,
  Clock, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../components/common'
import { getStatus } from '../design-system/status.js'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'users',     label: 'Usuarios',     icon: Users },
]

/* ─── Sidebar ─────────────────────────────────────────────── */
/* Estructura fija/no responsive intencionalmente sin tocar en esta fase —
   solo se tokenizan colores (#111 → ink, #E8432D → brand). */
function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <div className="w-56 bg-ink min-h-screen flex flex-col flex-shrink-0">
      <div className="px-5 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-brand" />
          <span className="text-white font-bold text-[13px]">Panel Supervisor</span>
        </div>
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">HOME Admin</p>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all
              ${active === id ? 'bg-brand text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-4 pb-6 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-[12px] font-semibold truncate">{user?.name}</p>
            <p className="text-white/40 text-[10px] truncate">Supervisor</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 text-white/40 hover:text-white text-[12px] font-medium transition-colors py-1">
          <LogOut size={13} />Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/* ─── StatCard ────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-3`}>
        <Icon size={18} strokeWidth={2} className="text-white" />
      </div>
      <p className="text-3xl font-extrabold text-ink">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/* ─── STATUS helpers ──────────────────────────────────────────
   Antes: dos mapas locales (STATUS_COLORS para el punto, STATUS_LABELS
   para la píldora) que duplicaban y hacían divergir el color de estado
   respecto al resto de la app. Ahora ambos se derivan del tono canónico
   de design-system/status.js — el punto reutiliza el mismo `tone` que ya
   resuelve StatusBadge, en vez de mantener su propia paleta por status. */
const TONE_DOT = {
  neutral: 'bg-gray-400',
  caution: 'bg-yellow-400',
  info: 'bg-blue-400',
  warning: 'bg-orange-400',
  success: 'bg-green-400',
  error: 'bg-red-400',
}
function StatusDot({ status }) {
  const { tone } = getStatus(status)
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TONE_DOT[tone] || TONE_DOT.neutral}`} />
}

/* ─── DASHBOARD (Supervisor overview) ─────────────────────── */
function DashboardView({ projects, quotes, workers, users }) {
  const inProgress  = projects?.filter(p => p.status === 'en_progreso').length ?? 0
  const completed   = projects?.filter(p => p.status === 'completado').length ?? 0
  const pendingReqs = quotes?.filter(q => q.status === 'solicitud_pendiente').length ?? 0
  const activeUsers = users?.filter(u => u.is_active).length ?? 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-brand" />
        <h1 className="text-2xl font-extrabold text-ink">Panel de Supervisión</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Estado global del sistema HOME</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Proyectos activos"  value={inProgress}  icon={Activity}      color="bg-brand" sub="en progreso" />
        <StatCard label="Completados"        value={completed}   icon={CheckCircle}   color="bg-green-500" sub="total histórico" />
        <StatCard label="Solicitudes pend."  value={pendingReqs} icon={Clock}         color="bg-amber-500" sub="en espera" />
        <StatCard label="Usuarios totales"   value={users?.length || 0} icon={Users}  color="bg-blue-500"  sub="registrados" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Proyectos recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-[14px] text-ink uppercase tracking-wider">Últimos Proyectos</h2>
          </div>
          {projects?.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
              <StatusDot status={p.status} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-ink truncate">{p.title}</p>
                <p className="text-[11px] text-gray-400">
                  {p.client?.name} → {p.worker?.name || 'Sin trabajador'}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>

        {/* Distribución de Usuarios */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-[14px] text-ink uppercase tracking-wider mb-6">Resumen de Usuarios</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-gray-600">Trabajadores</span>
              </div>
              <span className="text-sm font-bold text-ink">{workers?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-semibold text-gray-600">Clientes</span>
              </div>
              <span className="text-sm font-bold text-ink">{users?.filter(u => u.role === 'cliente').length || 0}</span>
            </div>
            <div className="pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between text-ink">
                <span className="text-sm font-bold">Total Sistema</span>
                <span className="text-lg font-black">{users?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── USERS VIEW (Solo lectura) ─────────────────────────── */
function UsersView({ users }) {
  const [filter, setFilter] = useState('todos')
  const filtered = filter === 'todos' ? users
    : users?.filter(u => u.role === filter)

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink mb-1">Usuarios</h1>
      <p className="text-gray-400 text-sm mb-6">Visualización de cuentas registradas</p>
      <div className="flex gap-2 pb-3 mb-4 overflow-x-auto">
        {['todos','cliente','trabajador'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-colors
              ${filter === f ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {f === 'todos' ? 'Todos los registros' : f}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ciudad</th>
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-[11px]">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-ink truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-[12px] text-gray-500 font-medium">{u.city || '—'}</td>
                <td className="px-4 py-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize
                    ${u.role === 'admin' ? 'bg-purple-100 text-purple-700'
                      : u.role === 'trabajador' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!filtered || filtered.length === 0) && (
          <div className="py-20 text-center text-gray-400 text-sm">No se encontraron registros</div>
        )}
      </div>
    </div>
  )
}

/* ─── MAIN ────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [active, setActive] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [quotes,   setQuotes]   = useState([])
  const [workers,  setWorkers]  = useState([])
  const [users,    setUsers]    = useState([])

  const loadData = async () => {
    try {
      const [pRes, qRes, wRes, uRes] = await Promise.all([
        api.get('/projects'),
        api.get('/quotes'),
        api.get('/workers'),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setProjects(pRes.data.data || [])
      setQuotes(qRes.data.data || [])
      setWorkers(wRes.data.data || [])
      setUsers(uRes.data.data || [])
    } catch { toast.error('Error cargando datos') }
  }

  useEffect(() => { loadData() }, [])

  const handleLogout = async () => { await logout(); navigate('/welcome') }

  const VIEWS = {
    dashboard: <DashboardView projects={projects} quotes={quotes} workers={workers} users={users} />,
    users:     <UsersView     users={users} />,
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-outfit">
      <Sidebar active={active} setActive={setActive} user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-y-auto">{VIEWS[active]}</main>
    </div>
  )
}