import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import {
  LayoutDashboard, Users, Briefcase, Package, Star,
  ShieldCheck, LogOut, CheckCircle,
  Clock, Activity, Wallet, Landmark, Lock, Unlock, Plus, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../components/common'
import { getStatus, STATUS_MAP } from '../design-system/status.js'

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'projects',  label: 'Proyectos',     icon: Briefcase },
  { id: 'users',     label: 'Usuarios',      icon: Users },
  { id: 'services',  label: 'Servicios',     icon: Package },
  { id: 'ratings',   label: 'Calificaciones', icon: Star },
]

// admin_finanzas solo ve Finanzas — es justo el punto del rol (separar quién
// puede crear/supervisar de quién puede aprobar que salga dinero real).
const FINANZAS_NAV = [
  { id: 'finanzas', label: 'Finanzas', icon: Wallet },
]

const PROJECT_STATUSES = ['pendiente', 'en_revision', 'aprobado', 'en_progreso', 'pausado', 'completado', 'cancelado']

const QUOTE_STATUS_LABEL = {
  solicitud_pendiente: 'Solicitud pendiente', pendiente: 'Pendiente', revisada: 'Revisada',
  aceptada: 'Aceptada', rechazada: 'Rechazada', expirada: 'Expirada',
}
const QUOTE_STATUS_CLASS = {
  solicitud_pendiente: 'bg-gray-100 text-gray-600', pendiente: 'bg-gray-100 text-gray-600',
  revisada: 'bg-blue-100 text-blue-700', aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700', expirada: 'bg-gray-100 text-gray-400',
}

const CATEGORY_LABEL = {
  pintura: 'Pintura', enchapes: 'Enchapes', electricidad: 'Electricidad', plomeria: 'Plomería',
  obra_gris: 'Obra Gris', carpinteria: 'Carpintería', impermeabilizacion: 'Impermeabilización', otro: 'Otro',
}
const PRICE_UNIT_LABEL = {
  por_hora: 'Por hora', por_m2: 'Por m²', por_proyecto: 'Por proyecto', a_convenir: 'A convenir',
}

/* ─── Sidebar ─────────────────────────────────────────────── */
/* Estructura fija/no responsive intencionalmente sin tocar en esta fase —
   solo se tokenizan colores (#111 → ink, #E8432D → brand). */
function Sidebar({ nav, active, setActive, user, onLogout }) {
  const isFinanzas = user?.role === 'admin_finanzas'
  return (
    <div className="w-56 bg-ink min-h-screen flex flex-col flex-shrink-0">
      <div className="px-5 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          {isFinanzas ? <Wallet size={18} className="text-brand" /> : <ShieldCheck size={18} className="text-brand" />}
          <span className="text-white font-bold text-[13px]">{isFinanzas ? 'Panel Finanzas' : 'Panel Supervisor'}</span>
        </div>
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">HOME Admin</p>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ id, label, icon: Icon }) => (
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
            <p className="text-white/40 text-[10px] truncate">{isFinanzas ? 'Finanzas' : 'Supervisor'}</p>
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
function DashboardView({ projects, quotes, workers, users, ratings }) {
  const inProgress  = projects?.filter(p => p.status === 'en_progreso').length ?? 0
  const completed   = projects?.filter(p => p.status === 'completado').length ?? 0
  const pendingReqs = quotes?.filter(q => q.status === 'solicitud_pendiente').length ?? 0
  const avgRating = ratings?.length
    ? (ratings.reduce((sum, r) => sum + Number(r.score || 0), 0) / ratings.length).toFixed(1)
    : '—'

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck size={22} className="text-brand" />
        <h1 className="text-2xl font-extrabold text-ink">Panel de Supervisión</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Estado global del sistema HOME</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Proyectos activos"  value={inProgress}  icon={Activity}      color="bg-brand" sub="en progreso" />
        <StatCard label="Completados"        value={completed}   icon={CheckCircle}   color="bg-green-500" sub="total histórico" />
        <StatCard label="Solicitudes pend."  value={pendingReqs} icon={Clock}         color="bg-amber-500" sub="en espera" />
        <StatCard label="Rating promedio"    value={avgRating}   icon={Star}          color="bg-yellow-500" sub={`${ratings?.length || 0} calificaciones`} />
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

/* ─── USERS VIEW ─────────────────────────────────────────────
   El backend ya soporta bloquear/reactivar (PATCH /users/:id/toggle-active) —
   antes la UI era de solo lectura y no lo exponía. Un admin no puede
   bloquearse a sí mismo ni a otro admin (regla del backend, ver
   authController/routes/users.js), así que el botón se oculta para
   role === 'admin' en vez de dejar que el usuario choque con un 403. */
function UsersView({ users, onToggleActive, togglingId }) {
  const [filter, setFilter] = useState('todos')
  const filtered = filter === 'todos' ? users
    : users?.filter(u => u.role === filter)

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink mb-1">Usuarios</h1>
      <p className="text-gray-400 text-sm mb-6">Cuentas registradas — bloquear restringe el acceso sin borrar datos</p>
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
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Acción</th>
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
                    ${u.role === 'admin' || u.role === 'admin_finanzas' ? 'bg-purple-100 text-purple-700'
                      : u.role === 'trabajador' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {u.is_active ? 'Activo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => onToggleActive(u.id)}
                      disabled={togglingId === u.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50
                        ${u.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {u.is_active ? <Lock size={12} /> : <Unlock size={12} />}
                      {togglingId === u.id ? '...' : u.is_active ? 'Bloquear' : 'Reactivar'}
                    </button>
                  )}
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

/* ─── PROYECTOS Y COTIZACIONES ────────────────────────────────
   Admin no tiene restricciones de transición (projectService.updateProjectStatus:
   "Permisos: Admin puede todo") — el select deja forzar cualquiera de los 7
   estados en vez de solo "avanzar un paso", que es lo único que valía la pena
   exponer para supervisión real de disputas o correcciones manuales. */
function ProjectsView({ projects, quotes, onProjectStatusChange, changingProjectId, onQuoteStatusChange, changingQuoteId }) {
  const [tab, setTab] = useState('proyectos')

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Briefcase size={22} className="text-brand" />
        <h1 className="text-2xl font-extrabold text-ink">Proyectos y Cotizaciones</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Supervisión y corrección manual de estados</p>

      <div className="flex gap-2 pb-3 mb-4">
        {[{ id: 'proyectos', label: `Proyectos (${projects?.length || 0})` }, { id: 'cotizaciones', label: `Cotizaciones (${quotes?.length || 0})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
              ${tab === t.id ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'proyectos' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {(!projects || projects.length === 0) ? (
            <div className="py-16 text-center text-gray-400 text-sm">No hay proyectos aún</div>
          ) : projects.map(p => {
            const doneTasks = p.tasks?.filter(t => t.status === 'completada').length || 0
            const totalTasks = p.tasks?.length || 0
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-ink truncate">{p.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {p.client?.name} → {p.worker?.name || 'Sin trabajador'} · {p.city} · {p.service?.name}
                  </p>
                  {totalTasks > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{doneTasks}/{totalTasks} tareas completadas</p>
                  )}
                </div>
                <select
                  value={p.status}
                  disabled={changingProjectId === p.id}
                  onChange={(e) => onProjectStatusChange(p.id, e.target.value)}
                  className="flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                >
                  {PROJECT_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'cotizaciones' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {(!quotes || quotes.length === 0) ? (
            <div className="py-16 text-center text-gray-400 text-sm">No hay cotizaciones</div>
          ) : quotes.map(q => (
            <div key={q.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-ink truncate">{q.service?.name}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {q.client?.name} → {q.worker?.name || 'Sin asignar'} · {q.city}
                </p>
                {q.estimated_price && (
                  <p className="text-[12px] font-bold text-brand mt-0.5">
                    ${Number(q.estimated_price).toLocaleString('es-CO')}
                  </p>
                )}
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${QUOTE_STATUS_CLASS[q.status] || 'bg-gray-100 text-gray-600'}`}>
                {QUOTE_STATUS_LABEL[q.status] || q.status}
              </span>
              {(q.status === 'solicitud_pendiente' || q.status === 'pendiente' || q.status === 'revisada') && (
                <div className="flex-shrink-0 flex gap-2">
                  <button onClick={() => onQuoteStatusChange(q.id, 'aceptada')} disabled={changingQuoteId === q.id}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                    Aprobar
                  </button>
                  <button onClick={() => onQuoteStatusChange(q.id, 'rechazada')} disabled={changingQuoteId === q.id}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── CATÁLOGO DE SERVICIOS ───────────────────────────────────
   El backend solo soporta GET (público) y POST (admin) — no hay endpoints
   de editar/borrar todavía, así que la UI no ofrece esas acciones en vez de
   simular algo que el API rechazaría. */
function NewServiceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', category: 'pintura', price_unit: 'a_convenir', base_price: '', estimated_days: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-brand"

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      await api.post('/services', {
        name: form.name.trim(),
        category: form.category,
        price_unit: form.price_unit,
        base_price: form.base_price ? Number(form.base_price) : null,
        estimated_days: form.estimated_days ? Number(form.estimated_days) : null,
        description: form.description.trim() || null,
      })
      toast.success('Servicio creado')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo crear el servicio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[18px] text-ink">Nuevo servicio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Nombre del servicio" value={form.name} onChange={set('name')} />
          <select className={inputCls} value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className={inputCls} value={form.price_unit} onChange={set('price_unit')}>
            {Object.entries(PRICE_UNIT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className={inputCls} type="number" min="0" placeholder="Precio base (opcional si es a convenir)" value={form.base_price} onChange={set('base_price')} />
          <input className={inputCls} type="number" min="1" placeholder="Días estimados (opcional)" value={form.estimated_days} onChange={set('estimated_days')} />
          <textarea className={inputCls} rows={3} placeholder="Descripción (opcional)" value={form.description} onChange={set('description')} />
          <button onClick={handleCreate} disabled={saving}
            className="w-full py-3 bg-brand text-white rounded-xl font-bold disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear servicio'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServicesView({ services, onCreated }) {
  const [showNew, setShowNew] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Package size={22} className="text-brand" />
          <h1 className="text-2xl font-extrabold text-ink">Catálogo de Servicios</h1>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 transition-opacity">
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-6">{services?.length || 0} servicios publicados</p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Servicio</th>
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Categoría</th>
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Precio</th>
              <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Días est.</th>
            </tr>
          </thead>
          <tbody>
            {services?.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4 font-bold text-[13px] text-ink">{s.name}</td>
                <td className="px-4 py-4 text-[12px] text-gray-500 font-medium">{CATEGORY_LABEL[s.category] || s.category}</td>
                <td className="px-4 py-4 text-[12px] text-gray-500 font-medium">
                  {s.base_price ? `$${Number(s.base_price).toLocaleString('es-CO')} · ` : ''}{PRICE_UNIT_LABEL[s.price_unit] || s.price_unit}
                </td>
                <td className="px-4 py-4 text-[12px] text-gray-500 font-medium">{s.estimated_days || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!services || services.length === 0) && (
          <div className="py-20 text-center text-gray-400 text-sm">No hay servicios en el catálogo</div>
        )}
      </div>

      {showNew && <NewServiceModal onClose={() => setShowNew(false)} onCreated={onCreated} />}
    </div>
  )
}

/* ─── CALIFICACIONES ─────────────────────────────────────────── */
function RatingsView({ ratings }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Star size={22} className="text-brand" />
        <h1 className="text-2xl font-extrabold text-ink">Calificaciones</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Todas las calificaciones emitidas por clientes — {ratings?.length || 0} en total</p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {(!ratings || ratings.length === 0) ? (
          <div className="py-20 text-center text-gray-400 text-sm">No hay calificaciones todavía</div>
        ) : ratings.map(r => (
          <div key={r.id} className="flex items-start gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[13px]
              ${r.score <= 2 ? 'bg-red-50 text-red-600' : r.score === 3 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
              {r.score}★
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] text-ink truncate">{r.worker?.name} <span className="text-gray-400 font-medium">calificado por</span> {r.reviewer?.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{r.project?.title}</p>
              {r.comment && <p className="text-[12px] text-gray-600 mt-1">"{r.comment}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── FINANZAS (admin_finanzas) ─────────────────────────────
   Aprobar payouts y verificar cuentas bancarias — el envío real a Wompi
   (payoutService.sendWompiPayout) todavía no está implementado (su API de
   Payouts está detrás de un login que no pudimos verificar), así que
   "Aprobar" hoy siempre responde con ese error explícito — es esperado,
   no un bug: el resto del flujo (elegibilidad, verificación de cuenta,
   estados) ya está completo y listo para cuando se conecte de verdad. */
const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const PAYOUT_STATUS_LABEL = {
  pendiente: 'Pendiente', aprobado: 'Aprobado', enviado: 'Enviado',
  completado: 'Completado', fallido: 'Fallido',
}
const PAYOUT_STATUS_CLASS = {
  pendiente: 'bg-amber-100 text-amber-700', aprobado: 'bg-blue-100 text-blue-700',
  enviado: 'bg-blue-100 text-blue-700', completado: 'bg-green-100 text-green-700',
  fallido: 'bg-red-100 text-red-700',
}

function RefundRow({ refund, onApprove, approving }) {
  const [penalty, setPenalty] = useState('')
  const paidAmount = Number(refund.payment?.amount || 0)
  const penaltyNum = Number(penalty)
  const canApprove = penalty !== '' && penaltyNum >= 0 && penaltyNum <= paidAmount

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] text-ink truncate">{refund.client?.name}</p>
        <p className="text-[11px] text-gray-400 truncate">{refund.project?.title} · pagó {formatCOP(paidAmount)}</p>
        <p className="text-[11px] text-gray-400 truncate">{refund.bank_name} · {refund.account_type} · cta. {refund.account_number}</p>
      </div>
      {refund.status === 'pendiente' ? (
        <>
          <input type="number" min="0" max={paidAmount} placeholder="Penalización"
            value={penalty} onChange={e => setPenalty(e.target.value)}
            className="w-28 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12px] text-right" />
          <button onClick={() => onApprove(refund.id, penaltyNum)} disabled={!canApprove || approving}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-brand/10 text-brand hover:bg-brand/20 transition-colors disabled:opacity-50">
            {approving ? 'Enviando...' : 'Aprobar'}
          </button>
        </>
      ) : (
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${PAYOUT_STATUS_CLASS[refund.status]}`}>
          {PAYOUT_STATUS_LABEL[refund.status]}
        </span>
      )}
    </div>
  )
}

function FinanzasView({ accounts, payouts, refunds, onVerifyAccount, onApprovePayout, onApproveRefund, approvingId }) {
  const [statusFilter, setStatusFilter] = useState('todos')
  const filteredPayouts = statusFilter === 'todos' ? payouts : payouts?.filter(p => p.status === statusFilter)

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Wallet size={22} className="text-brand" />
        <h1 className="text-2xl font-extrabold text-ink">Finanzas</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Cuentas bancarias y pagos a trabajadores</p>

      {/* Cuentas por verificar */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-bold text-[14px] text-ink uppercase tracking-wider">Cuentas por verificar</h2>
          <span className="text-[11px] font-bold text-gray-400">{accounts?.length || 0}</span>
        </div>
        {(!accounts || accounts.length === 0) ? (
          <div className="py-10 text-center text-gray-400 text-sm">No hay cuentas pendientes de revisión</div>
        ) : accounts.map(a => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
            <Landmark size={16} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] text-ink truncate">{a.worker?.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{a.bank_name} · terminada en {a.account_number_last4} · {a.worker?.email}</p>
            </div>
            <button onClick={() => onVerifyAccount(a.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
              Verificar
            </button>
          </div>
        ))}
      </div>

      {/* Payouts */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-[14px] text-ink uppercase tracking-wider mb-3">Payouts a trabajadores</h2>
          <div className="flex gap-2 overflow-x-auto">
            {['todos', 'pendiente', 'enviado', 'completado', 'fallido'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors
                  ${statusFilter === f ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {(!filteredPayouts || filteredPayouts.length === 0) ? (
          <div className="py-10 text-center text-gray-400 text-sm">No hay payouts en este estado</div>
        ) : filteredPayouts.map(p => {
          const eligible = new Date(p.eligible_at) <= new Date()
          return (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-ink truncate">{p.worker?.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{p.project?.title} · {formatCOP(p.amount)}</p>
                {p.status === 'pendiente' && !eligible && (
                  <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> Elegible desde {new Date(p.eligible_at).toLocaleString('es-CO')}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${PAYOUT_STATUS_CLASS[p.status]}`}>
                {PAYOUT_STATUS_LABEL[p.status]}
              </span>
              {p.status === 'pendiente' && eligible && (
                <button onClick={() => onApprovePayout(p.id)} disabled={approvingId === p.id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-brand/10 text-brand hover:bg-brand/20 transition-colors disabled:opacity-50">
                  {approvingId === p.id ? 'Enviando...' : 'Aprobar'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Reembolsos */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mt-6">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-[14px] text-ink uppercase tracking-wider">Reembolsos por cancelación</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Define la penalización caso por caso — no hay fórmula todavía</p>
        </div>
        {(!refunds || refunds.length === 0) ? (
          <div className="py-10 text-center text-gray-400 text-sm">No hay reembolsos pendientes</div>
        ) : refunds.map(r => (
          <RefundRow key={r.id} refund={r} onApprove={onApproveRefund} approving={approvingId === r.id} />
        ))}
      </div>
    </div>
  )
}

/* ─── MAIN ────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isFinanzas = user?.role === 'admin_finanzas'
  const nav = isFinanzas ? FINANZAS_NAV : ADMIN_NAV
  const [active, setActive] = useState(isFinanzas ? 'finanzas' : 'dashboard')
  const [projects, setProjects] = useState([])
  const [quotes,   setQuotes]   = useState([])
  const [workers,  setWorkers]  = useState([])
  const [users,    setUsers]    = useState([])
  const [services, setServices] = useState([])
  const [ratings,  setRatings]  = useState([])
  const [accounts, setAccounts] = useState([])
  const [payouts,  setPayouts]  = useState([])
  const [refunds,  setRefunds]  = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const [togglingUserId, setTogglingUserId] = useState(null)
  const [changingProjectId, setChangingProjectId] = useState(null)
  const [changingQuoteId, setChangingQuoteId] = useState(null)

  const loadData = async () => {
    try {
      const [pRes, qRes, wRes, uRes, sRes, rRes] = await Promise.all([
        api.get('/projects'),
        api.get('/quotes'),
        api.get('/workers'),
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/services'),
        api.get('/ratings').catch(() => ({ data: { data: [] } })),
      ])
      setProjects(pRes.data.data || [])
      setQuotes(qRes.data.data || [])
      setWorkers(wRes.data.data || [])
      setUsers(uRes.data.data || [])
      setServices(sRes.data.data || [])
      setRatings(rRes.data.data || [])
    } catch { toast.error('Error cargando datos') }
  }

  const loadFinanzas = async () => {
    try {
      const [aRes, pRes, rRes] = await Promise.all([
        api.get('/payouts/accounts/pending'),
        api.get('/payouts'),
        api.get('/refunds'),
      ])
      setAccounts(aRes.data.data || [])
      setPayouts(pRes.data.data || [])
      setRefunds(rRes.data.data || [])
    } catch { toast.error('Error cargando datos de finanzas') }
  }

  useEffect(() => { isFinanzas ? loadFinanzas() : loadData() }, [isFinanzas])

  const handleLogout = async () => { await logout(); navigate('/welcome') }

  const handleVerifyAccount = async (accountId) => {
    try {
      await api.post(`/payouts/accounts/${accountId}/verify`)
      toast.success('Cuenta verificada')
      loadFinanzas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo verificar la cuenta')
    }
  }

  const handleApprovePayout = async (payoutId) => {
    setApprovingId(payoutId)
    try {
      await api.post(`/payouts/${payoutId}/approve`)
      toast.success('Payout enviado')
      loadFinanzas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo aprobar el payout')
    } finally {
      setApprovingId(null)
    }
  }

  const handleApproveRefund = async (refundId, penaltyAmount) => {
    setApprovingId(refundId)
    try {
      await api.post(`/refunds/${refundId}/approve`, { penaltyAmount })
      toast.success('Reembolso enviado')
      loadFinanzas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo aprobar el reembolso')
    } finally {
      setApprovingId(null)
    }
  }

  const handleToggleActive = async (userId) => {
    setTogglingUserId(userId)
    try {
      const { data } = await api.patch(`/users/${userId}/toggle-active`)
      toast.success(data.message)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: data.data.is_active } : u))
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el usuario')
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleProjectStatusChange = async (projectId, status) => {
    setChangingProjectId(projectId)
    try {
      await api.patch(`/projects/${projectId}/status`, { status })
      toast.success(`Estado actualizado a: ${STATUS_MAP[status]?.label || status}`)
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p))
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el estado')
    } finally {
      setChangingProjectId(null)
    }
  }

  const handleQuoteStatusChange = async (quoteId, status) => {
    setChangingQuoteId(quoteId)
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status })
      toast.success(status === 'aceptada' ? 'Cotización aprobada' : 'Cotización rechazada')
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status } : q))
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar la cotización')
    } finally {
      setChangingQuoteId(null)
    }
  }

  const VIEWS = {
    dashboard: <DashboardView projects={projects} quotes={quotes} workers={workers} users={users} ratings={ratings} />,
    users:     <UsersView     users={users} onToggleActive={handleToggleActive} togglingId={togglingUserId} />,
    projects:  <ProjectsView  projects={projects} quotes={quotes}
                              onProjectStatusChange={handleProjectStatusChange} changingProjectId={changingProjectId}
                              onQuoteStatusChange={handleQuoteStatusChange} changingQuoteId={changingQuoteId} />,
    services:  <ServicesView  services={services} onCreated={loadData} />,
    ratings:   <RatingsView   ratings={ratings} />,
    finanzas:  <FinanzasView  accounts={accounts} payouts={payouts} refunds={refunds} approvingId={approvingId}
                              onVerifyAccount={handleVerifyAccount} onApprovePayout={handleApprovePayout}
                              onApproveRefund={handleApproveRefund} />,
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-outfit">
      <Sidebar nav={nav} active={active} setActive={setActive} user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-y-auto">{VIEWS[active]}</main>
    </div>
  )
}
