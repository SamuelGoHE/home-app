import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import {
  CheckCircle2, Clock, Wrench, Edit3, LogOut,
  AlertTriangle, ChevronRight, MapPin, Star,
  ListTodo, RefreshCw, Bell, X, Check, User, Calendar,
  TrendingUp, DollarSign, Briefcase, LayoutDashboard, Settings,
  Award, Zap, Search, Shield, Heart, HelpCircle, Phone, MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSocket } from '../hooks/useChat'

/* ─── CONFIGURACIÓN DE ESTADOS ─────────────────────────── */
const STATUS_UI = {
  pendiente:    { label: 'Pendiente',    color: 'text-gray-500',   bg: 'bg-gray-50',   icon: Clock },
  en_revision:  { label: 'En revisión',  color: 'text-amber-600',  bg: 'bg-amber-50',  icon: AlertTriangle },
  aprobado:     { label: 'Aprobado',     color: 'text-blue-600',   bg: 'bg-blue-50',   icon: CheckCircle2 },
  en_progreso:  { label: 'En curso',      color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Wrench },
  completado:   { label: 'Finalizado',   color: 'text-emerald-600',bg: 'bg-emerald-50',icon: CheckCircle2 },
  cancelado:    { label: 'Cancelado',    color: 'text-red-600',    bg: 'bg-red-50',    icon: X },
}

/* ─── COMPONENTE: ITEM DE LISTA (Estilo Captura) ─────────── */
function MenuItem({ icon: Icon, label, color, onClick, badge }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-1 group active:opacity-60 transition-all">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center transition-transform group-active:scale-90`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 text-left font-bold text-[15px] text-[#111]">{label}</div>
      {badge && <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />}
      <ChevronRight size={18} className="text-gray-300" />
    </button>
  )
}

/* ─── VISTA: INICIO (Dashboard) ─────────────────────────── */
function HomeView({ user, requests, projects, onRespond, navigate, setSelectedRequest }) {
  const activeProjects = projects.filter(p => p.status !== 'completado')
  
  return (
    <div className="animate-fade-in pb-10">
      {/* HEADER ROJO */}
      <div className="bg-[#E8432D] pt-16 pb-20 px-6 text-center">
        <div className="w-24 h-24 rounded-[32px] bg-white/20 border-2 border-white/30 mx-auto flex items-center justify-center text-white text-3xl font-black mb-4 backdrop-blur-md">
          {user?.name?.[0]?.toUpperCase() || 'P'}
        </div>
        <h2 className="text-white text-2xl font-black mb-1">¡Hola, {user?.name.split(' ')[0]}! 👋</h2>
        <p className="text-white/70 text-sm font-medium mb-4">Tienes {requests.length} solicitudes nuevas</p>
        <span className="bg-white/20 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md border border-white/10">
          En línea
        </span>
      </div>

      {/* CONTENIDO OVERLAP */}
      <div className="px-6 -mt-10 space-y-6">
        
        {/* Card de Solicitudes (Acción Inmediata) */}
        {requests.length > 0 ? (
          <div className="bg-white rounded-[32px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-50">
            <h3 className="text-[16px] font-black text-[#111] mb-4 flex items-center justify-between">
              Solicitudes Nuevas
              <span className="bg-[#E8432D] text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{requests.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map(req => (
                <div key={req.id} className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-black text-[15px] text-[#111] leading-tight">{req.service?.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight mt-1">{req.client?.name} • {req.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#E8432D]">${req.service?.base_price || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => setSelectedRequest(req)} 
                      className="flex-1 py-3 bg-[#E8432D] text-white rounded-xl text-[11px] font-black shadow-lg shadow-orange-100 active:scale-95 transition-all"
                    >
                      VER DETALLES
                    </button>
                    <button onClick={() => onRespond(req.id, 'rechazada')} className="px-5 py-3 bg-white text-gray-400 border border-gray-200 rounded-xl text-[11px] font-black active:scale-95 transition-all">RECHAZAR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-8 text-center border border-gray-100 shadow-sm">
            <Zap size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-bold text-gray-400">No hay solicitudes nuevas por ahora</p>
          </div>
        )}

        {/* Proyectos Actuales (Acceso Rápido) */}
        {activeProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[14px] font-black text-[#111] px-1">Trabajos en Curso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeProjects.slice(0, 4).map(p => {
                const statusInfo = STATUS_UI[p.status] || STATUS_UI.en_progreso
                const SIcon = statusInfo.icon
                return (
                  <div key={p.id} className="bg-[#111] rounded-[32px] p-6 shadow-xl text-white relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color}`}>
                        <SIcon size={10} />
                        {statusInfo.label}
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl">
                        <Wrench size={16} className="text-orange-500" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-lg font-black leading-tight mb-1">{p.title}</h4>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-tight flex items-center gap-1">
                        <User size={10} /> {p.client?.name}
                      </p>
                    </div>

                    <div className="w-full py-3 bg-white/10 group-hover:bg-white/20 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-center transition-all">
                      Gestionar Proyecto
                    </div>
                  </div>
                )
              })}
            </div>
            {activeProjects.length > 4 && (
              <button onClick={() => navigate('/worker/projects')} className="w-full py-3 text-gray-400 text-[11px] font-black uppercase tracking-widest">
                Ver todos los trabajos ({activeProjects.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── VISTA: PROYECTOS ─────────────────────────── */
function ProjectsView({ projects, navigate }) {
  const [filter, setFilter] = useState('todos')
  
  const filtered = projects.filter(p => {
    if (filter === 'todos') return true
    if (filter === 'en_progreso') return p.status !== 'completado'
    if (filter === 'completado') return p.status === 'completado'
    return true
  })

  return (
    <div className="animate-fade-in pb-10">
      <div className="bg-[#E8432D] pt-16 pb-20 px-6">
        <h1 className="text-white text-3xl font-black">Mis Trabajos</h1>
        <p className="text-white/70 text-sm mt-1">Gestiona tus servicios activos</p>
      </div>

      <div className="px-6 -mt-10 space-y-6">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['todos', 'en_progreso', 'completado'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
                ${filter === f ? 'bg-[#111] text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              {f === 'en_progreso' ? 'En curso' : f === 'todos' ? 'Todos' : 'Finalizados'}
            </button>
          ))}
        </div>

        {/* Lista de Proyectos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? filtered.map(p => {
            const tasks = p.tasks || []
            const getWeight = (s) => (s === 'completada' ? 1 : s === 'en_progreso' ? 0.7 : s === 'en_revision' ? 0.3 : 0)
            const totalW = tasks.reduce((acc, t) => acc + getWeight(t.status), 0)
            const pct = tasks.length ? Math.round((totalW / tasks.length) * 100) : 0
            const done = tasks.filter(t => t.status === 'completada').length

            return (
              <div key={p.id} className="bg-white rounded-[32px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-50 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-[17px] text-[#111] truncate mb-1">{p.title}</h4>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1">
                      <MapPin size={10} /> {p.city} • {p.client?.name}
                    </p>
                  </div>
                  {(() => {
                    const statusInfo = STATUS_UI[p.status] || STATUS_UI.en_progreso
                    return (
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </div>
                    )
                  })()}
                </div>

                {/* Barra de Progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase">
                    <span>Progreso</span>
                    <span className="text-[#E8432D]">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${p.status === 'completado' ? 'bg-green-500' : 'bg-[#E8432D]'}`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">
                    {done} de {tasks.length} tareas terminadas
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex-1 py-3 bg-[#111] text-white rounded-2xl text-[12px] font-black uppercase shadow-lg shadow-gray-200 active:scale-95 transition-all"
                  >
                    Ver Detalle
                  </button>
                  <button 
                    onClick={() => navigate(`/chat/${p.id}`)}
                    className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-100 active:scale-95 transition-all"
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>
            )
          }) : (
            <div className="py-20 text-center text-gray-300">
              <Briefcase size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No hay proyectos en esta categoría</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── VISTA: PERFIL ─────────────────────────── */
function ProfileView({ user, onLogout, navigate, activeProjects, ratings, setShowRatings }) {
  return (
    <div className="animate-fade-in pb-10">
      <div className="bg-[#E8432D] pt-16 pb-20 px-6 text-center">
        <div className="w-24 h-24 rounded-[32px] bg-white border-2 border-white/30 mx-auto flex items-center justify-center text-[#E8432D] text-3xl font-black mb-4 shadow-xl">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h2 className="text-white text-2xl font-black mb-1">{user?.name}</h2>
        <p className="text-white/70 text-sm font-medium mb-4">{user?.email}</p>
        <span className="bg-white/20 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md border border-white/10">
          Trabajador
        </span>
      </div>

      <div className="px-6 -mt-10 space-y-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* SECCIÓN: TRABAJO */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1 mb-4">Mi Trabajo</p>
            <div className="divide-y divide-gray-100">
              <MenuItem 
                icon={Star} 
                label="Mis calificaciones" 
                color="bg-orange-50 text-orange-500" 
                onClick={() => setShowRatings(true)}
                badge={ratings.length > 0} 
              />
              <MenuItem icon={DollarSign} label="Resumen de ingresos" color="bg-green-50 text-green-500" />
            </div>
          </div>

          {/* SECCIÓN: CUENTA */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1 mb-4">Cuenta</p>
            <div className="divide-y divide-gray-100">
              <MenuItem icon={User} label="Mis datos personales" color="bg-blue-50 text-blue-500" onClick={() => navigate('/worker/profile/edit')} />
              <MenuItem icon={Bell} label="Notificaciones" color="bg-orange-50 text-orange-500" />
              <MenuItem icon={Shield} label="Seguridad y privacidad" color="bg-green-50 text-green-500" onClick={() => navigate('/worker/security')} />
            </div>
          </div>

          {/* SECCIÓN: APLICACIÓN */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest px-1 mb-4">Aplicación</p>
            <div className="divide-y divide-gray-100">
              <MenuItem icon={HelpCircle} label="Centro de ayuda" color="bg-gray-50 text-gray-400" onClick={() => navigate('/worker/help')} />
              <MenuItem icon={Phone} label="Contactar soporte" color="bg-gray-50 text-gray-400" onClick={() => navigate('/worker/support')} />
              <MenuItem icon={Settings} label="Configuración" color="bg-gray-50 text-gray-400" onClick={() => navigate('/worker/settings')} />
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full pb-10">
          <button onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-500 rounded-[28px] font-black text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── COMPONENTE PRINCIPAL ──────────────────────────────── */
export default function WorkerDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [requests, setRequests] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)

  const socketRef = useSocket()

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!socketRef.current || !user) return
    socketRef.current.emit('join_user_room', user.id)
    socketRef.current.on('new_service_request', () => { loadRequests() })
    return () => { if (socketRef.current) socketRef.current.off('new_service_request') }
  }, [socketRef.current, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rRes, pRes] = await Promise.all([
        api.get('/quotes/worker'),
        api.get('/projects')
      ])
      setRequests(rRes.data.data?.filter(q => q.status === 'solicitud_pendiente') || [])
      setProjects(pRes.data.data || [])
    } catch { toast.error('Error al sincronizar datos') }
    finally { setLoading(false) }
  }

  const loadRequests = async () => {
    const res = await api.get('/quotes/worker')
    setRequests(res.data.data?.filter(q => q.status === 'solicitud_pendiente') || [])
  }

  const respondRequest = async (quoteId, status) => {
    setResponding(true)
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status })
      toast.success(status === 'aceptada' ? '¡Trabajo aceptado!' : 'Solicitud rechazada')
      await loadData()
      setSelectedRequest(null)
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al procesar la solicitud'
      toast.error(msg)
      console.error("Error responding:", err)
    } finally {
      setResponding(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/welcome') }

  const [showNotifs, setShowNotifs] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [ratings, setRatings] = useState([])
  const [showRatings, setShowRatings] = useState(false)

  // ── Cargar Calificaciones ──
  useEffect(() => {
    if (user?.id) {
      api.get(`/ratings/worker/${user.id}`)
        .then(res => { if (res.data.success) setRatings(res.data.data.ratings) })
        .catch(err => console.error("Error loading ratings", err))
    }
  }, [user])

  // ── Generar Notificaciones de Trabajo ──
  const workerNotifications = useMemo(() => {
    const list = []
    requests.forEach(r => {
      list.push({ 
        id: `req-${r.id}`, 
        type: 'request', 
        title: 'Nueva Solicitud', 
        message: `${r.client?.name} necesita ${r.service?.name}`,
        icon: <Briefcase size={16} />,
        color: 'bg-orange-50 text-orange-500',
        original: r
      })
    })
    projects.forEach(p => {
      const pendingTasks = p.tasks?.filter(t => t.status === 'pendiente') || []
      pendingTasks.forEach(t => {
        list.push({
          id: `task-${t.id}`,
          type: 'task',
          title: 'Tarea Pendiente',
          message: `${t.title} en ${p.title}`,
          icon: <ListTodo size={16} />,
          color: 'bg-blue-50 text-blue-500'
        })
      })
    })
    return list
  }, [requests, projects])

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10">
      <div className="w-10 h-10 border-4 border-orange-100 border-t-[#E8432D] rounded-full animate-spin mb-4" />
      <p className="text-gray-300 font-bold text-xs uppercase tracking-widest">Sincronizando App...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-outfit flex flex-col items-center">
      <div className="w-full max-w-5xl min-h-screen bg-white relative flex flex-col shadow-sm overflow-x-hidden">
        
        {/* ── APP HEADER ── */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 pt-12 pb-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8432D] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-100">
              H
            </div>
            <span className="text-xl font-black text-[#111] tracking-tight hidden sm:block">HOME SERVICES</span>
            <span className="text-xl font-black text-[#111] tracking-tight sm:hidden">HOME</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 relative active:scale-95 transition-all">
              <Bell size={20} />
              {workerNotifications.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
            </button>
            <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-white overflow-hidden flex items-center justify-center text-[#E8432D] font-bold text-xs">
              {user?.name?.[0]}
            </div>
          </div>

          {/* Panel de Notificaciones (Dropdown) */}
          {showNotifs && (
            <div className="absolute top-full right-6 mt-2 w-72 bg-white rounded-[28px] shadow-2xl border border-gray-100 py-4 z-[60] animate-slide-up origin-top-right">
              <div className="px-5 mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-[#111]">Notificaciones</p>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{workerNotifications.length} Pendientes</span>
              </div>
              <div className="max-h-80 overflow-y-auto px-2 space-y-1">
                {workerNotifications.length > 0 ? workerNotifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      if (n.type === 'request') setSelectedRequest(n.original)
                      setShowNotifs(false)
                    }}
                    className="flex gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-full ${n.color} flex items-center justify-center flex-shrink-0`}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#111]">{n.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">{n.message}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center">
                    <CheckCircle2 size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">¡Estás al día!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 pb-32">
          {activeTab === 'home' && <HomeView user={user} requests={requests} projects={projects} onRespond={respondRequest} navigate={navigate} setSelectedRequest={setSelectedRequest} />}
          {activeTab === 'projects' && <ProjectsView projects={projects} navigate={navigate} />}
          {activeTab === 'profile' && (
            <ProfileView 
              user={user} 
              onLogout={handleLogout} 
              navigate={navigate} 
              activeProjects={projects.filter(p => p.status !== 'completado')} 
              ratings={ratings}
              setShowRatings={setShowRatings}
            />
          )}
        </main>

        {/* BOTTOM NAV (Responsive) */}
        <nav className="fixed bottom-0 w-full max-w-5xl bg-white/90 backdrop-blur-lg border-t border-gray-100 px-10 py-5 flex justify-around items-center z-50">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#E8432D] scale-110' : 'text-gray-300'}`}>
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Inicio</span>
          </button>
          <button onClick={() => setActiveTab('projects')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'projects' ? 'text-[#E8432D] scale-110' : 'text-gray-300'}`}>
            <Briefcase size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Trabajos</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-[#E8432D] scale-110' : 'text-gray-300'}`}>
            <User size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Perfil</span>
          </button>
        </nav>

        {/* ── MODALES ── */}
        {selectedRequest && (
          <RequestDetailModal 
            req={selectedRequest} 
            loading={responding}
            onClose={() => !responding && setSelectedRequest(null)} 
            onRespond={(status) => respondRequest(selectedRequest.id, status)} 
          />
        )}

        {showRatings && (
          <RatingsModal 
            ratings={ratings} 
            onClose={() => setShowRatings(false)} 
          />
        )}
      </div>
    </div>
  )
}

/* ─── COMPONENTE: MODAL DE CALIFICACIONES ───────────────── */
function RatingsModal({ ratings, onClose }) {
  const avg = ratings.length 
    ? (ratings.reduce((acc, r) => acc + Number(r.score), 0) / ratings.length).toFixed(1)
    : 0

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 sm:items-center sm:p-0">
      <div className="fixed inset-0 bg-[#111]/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-slide-up border border-gray-100 flex flex-col max-h-[85vh]">
        
        {/* Header Fijo */}
        <div className="p-8 pb-4 border-b border-gray-50">
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center text-orange-500">
              <Star size={28} className="fill-orange-500" />
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-black text-[#111]">Calificaciones</h3>
            <div className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1 rounded-xl mb-1">
              <Star size={12} className="fill-white" />
              <span className="text-[14px] font-black">{avg}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium mt-1">Lo que tus clientes dicen de ti</p>
        </div>

        {/* Lista Scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {ratings.length > 0 ? ratings.map((r) => (
            <div key={r.id} className="bg-gray-50 rounded-[32px] p-5 border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#111] font-black text-sm shadow-sm border border-gray-100">
                    {r.reviewer?.name?.[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-[#111]">{r.reviewer?.name}</p>
                    <div className="flex items-center gap-0.5 text-orange-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} className={i < r.score ? 'fill-orange-500' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  {new Date(r.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed bg-white/50 p-3 rounded-2xl border border-white">
                "{r.comment || 'Sin comentarios'}"
              </p>
              <p className="text-[10px] font-bold text-gray-400 mt-3 flex items-center gap-1">
                <Check size={10} /> Proyecto: {r.project?.title || 'Servicio'}
              </p>
            </div>
          )) : (
            <div className="py-20 text-center opacity-30">
              <Star size={48} className="mx-auto mb-4" />
              <p className="font-black text-gray-400">Aún no tienes calificaciones</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── COMPONENTE: MODAL DETALLE DE SOLICITUD ───────────────── */
function RequestDetailModal({ req, onClose, onRespond, loading }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 sm:items-center sm:p-0">
      <div className="fixed inset-0 bg-[#111]/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-slide-up border border-gray-100">
        <div className="p-8">
          {/* Header Modal */}
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center text-[#E8432D]">
              <Briefcase size={28} />
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>

          <h3 className="text-2xl font-black text-[#111] leading-tight mb-2">Detalles de Solicitud</h3>
          <p className="text-sm text-gray-400 font-medium mb-8">Revisa los requerimientos antes de aceptar</p>

          <div className="space-y-6">
            {/* Cliente */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cliente</p>
                <p className="text-[15px] font-bold text-[#111]">{req.client?.name}</p>
              </div>
            </div>

            {/* Ubicación */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ubicación</p>
                <p className="text-[14px] font-bold text-[#111] leading-snug">{req.address}</p>
                <p className="text-[12px] text-gray-400 font-medium">{req.city}</p>
              </div>
            </div>

            {/* Fecha */}
            {req.start_date && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Fecha Propuesta</p>
                  <p className="text-[14px] font-bold text-[#111]">{req.start_date}</p>
                </div>
              </div>
            )}

            {/* Notas / Mensaje */}
            <div className="bg-gray-50 rounded-[24px] p-5 border border-gray-100">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ListTodo size={10} /> Notas del cliente
              </p>
              <p className="text-[13px] text-gray-600 leading-relaxed italic">
                "{req.notes || 'El cliente no ha proporcionado detalles adicionales.'}"
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="mt-10 flex flex-col gap-3">
            <button 
              onClick={() => onRespond('aceptada')}
              disabled={loading}
              className={`w-full py-5 bg-[#E8432D] text-white rounded-[24px] font-black text-[14px] uppercase tracking-wider shadow-xl shadow-orange-100 active:scale-[0.97] transition-all flex items-center justify-center gap-2
                ${loading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : 'Aceptar Solicitud'}
            </button>
            <button 
              onClick={() => onRespond('rechazada')}
              disabled={loading}
              className="w-full py-4 bg-white text-gray-400 font-black text-[13px] uppercase tracking-widest active:opacity-60 transition-all disabled:opacity-30"
            >
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}