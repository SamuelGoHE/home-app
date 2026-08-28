import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import {
  LayoutDashboard, Users,
  ShieldCheck, LogOut, CheckCircle,
  Clock, Activity, Wallet, Landmark
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../components/common'
import { getStatus } from '../design-system/status.js'

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'users',     label: 'Usuarios',     icon: Users },
]

// admin_finanzas solo ve Finanzas — es justo el punto del rol (separar quién
// puede crear/supervisar de quién puede aprobar que salga dinero real).
const FINANZAS_NAV = [
  { id: 'finanzas', label: 'Finanzas', icon: Wallet },
]

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
  const [accounts, setAccounts] = useState([])
  const [payouts,  setPayouts]  = useState([])
  const [refunds,  setRefunds]  = useState([])
  const [approvingId, setApprovingId] = useState(null)

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

  const VIEWS = {
    dashboard: <DashboardView projects={projects} quotes={quotes} workers={workers} users={users} />,
    users:     <UsersView     users={users} />,
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