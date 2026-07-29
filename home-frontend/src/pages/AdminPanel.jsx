import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Briefcase, FileText, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useFetch } from '../hooks/useApi'
import api from '../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pendiente:    { bg: 'bg-yellow-50',  text: 'text-yellow-700',  label: 'Pendiente' },
  en_revision:  { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'En revisión' },
  aprobado:     { bg: 'bg-green-50',   text: 'text-green-700',   label: 'Aprobado' },
  en_progreso:  { bg: 'bg-orange-50',  text: 'text-orange-700',  label: 'En progreso' },
  completado:   { bg: 'bg-gray-50',    text: 'text-gray-500',    label: 'Completado' },
  cancelado:    { bg: 'bg-red-50',     text: 'text-red-600',     label: 'Cancelado' },
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#111]">{value}</p>
        <p className="text-[12px] text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function ProjectCard({ project, onStatusChange }) {
  const s = STATUS_COLORS[project.status] || STATUS_COLORS.pendiente
  const [changing, setChanging] = useState(false)

  const nextStatus = {
    pendiente: 'en_revision',
    en_revision: 'aprobado',
    aprobado: 'en_progreso',
    en_progreso: 'completado',
  }

  const handleAdvance = async () => {
    const next = nextStatus[project.status]
    if (!next) return
    setChanging(true)
    try {
      await api.patch(`/projects/${project.id}/status`, { status: next })
      toast.success(`Estado actualizado a: ${STATUS_COLORS[next]?.label}`)
      onStatusChange()
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[15px] text-[#111] truncate">{project.title}</h3>
          <p className="text-[12px] text-gray-400">{project.client?.name} · {project.city}</p>
          <p className="text-[12px] text-gray-400">{project.service?.name}</p>
        </div>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>

      {project.tasks?.length > 0 && (() => {
        const done = project.tasks.filter(t => t.status === 'completada').length
        const total = project.tasks.length
        const pct = Math.round((done / total) * 100)
        return (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>{done}/{total} tareas</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#E8432D] rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      {nextStatus[project.status] && (
        <button
          onClick={handleAdvance}
          disabled={changing}
          className="w-full py-2 bg-[#E8432D] text-white rounded-xl text-[13px] font-bold disabled:opacity-50"
        >
          {changing ? 'Actualizando...' : `Avanzar → ${STATUS_COLORS[nextStatus[project.status]]?.label}`}
        </button>
      )}
    </div>
  )
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', city: '', address: '', client_id: '', service_id: '' })
  const [loading, setLoading] = useState(false)
  const { data: clients }  = useFetch('/workers') // reuse: get all users
  const { data: services } = useFetch('/services')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleCreate = async () => {
    if (!form.title || !form.city || !form.address || !form.client_id || !form.service_id) {
      toast.error('Completa todos los campos'); return
    }
    setLoading(true)
    try {
      await api.post('/projects', form)
      toast.success('Proyecto creado')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear proyecto')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#E8432D]"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[18px]">Nuevo proyecto</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Título del proyecto" value={form.title} onChange={set('title')} />
          <input className={inputCls} placeholder="Ciudad" value={form.city} onChange={set('city')} />
          <input className={inputCls} placeholder="Dirección" value={form.address} onChange={set('address')} />

          <select className={inputCls} value={form.service_id} onChange={set('service_id')}>
            <option value="">Selecciona un servicio</option>
            {Array.isArray(services) && services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <input className={inputCls} placeholder="ID del cliente (UUID)" value={form.client_id} onChange={set('client_id')} />

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-[#E8432D] text-white rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('projects')
  const [showCreate, setShowCreate] = useState(false)

  const { data: projects, loading: loadingP, refetch: refetchP } = useFetch('/projects')
  const { data: quotes,   loading: loadingQ, refetch: refetchQ } = useFetch('/quotes')
  const { data: workers,  loading: loadingW }                    = useFetch('/workers')

  const projectList = Array.isArray(projects) ? projects : []
  const quoteList   = Array.isArray(quotes)   ? quotes   : []
  const workerList  = Array.isArray(workers)  ? workers  : []

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="font-bold text-[18px] text-[#111]">Acceso restringido</p>
        <p className="text-gray-400 text-sm mt-2">Solo los administradores pueden ver este panel.</p>
        <button onClick={() => navigate('/home')} className="mt-6 px-6 py-2 bg-[#E8432D] text-white rounded-full font-bold">
          Volver al inicio
        </button>
      </div>
    )
  }

  const stats = [
    { icon: <Briefcase size={20} className="text-[#E8432D]" />, label: 'Proyectos', value: projectList.length, color: 'bg-red-50' },
    { icon: <Users size={20} className="text-blue-500" />,       label: 'Trabajadores', value: workerList.length, color: 'bg-blue-50' },
    { icon: <FileText size={20} className="text-green-500" />,   label: 'Cotizaciones', value: quoteList.length, color: 'bg-green-50' },
    { icon: <CheckCircle size={20} className="text-purple-500" />, label: 'Completados', value: projectList.filter(p => p.status === 'completado').length, color: 'bg-purple-50' },
  ]

  const handleQuoteStatus = async (quoteId, status) => {
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status })
      toast.success(status === 'aceptada' ? 'Cotización aprobada y proyecto creado' : 'Estado de cotización actualizado')
      refetchQ()
      refetchP()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar la cotización')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 page-enter">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/home')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-[#111]">Panel Admin</h2>
              <p className="text-[12px] text-gray-400">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-[#E8432D] text-white px-4 py-2 rounded-xl text-[13px] font-bold"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-5">
        {[
          { id: 'projects', label: 'Proyectos' },
          { id: 'quotes',   label: 'Cotizaciones' },
          { id: 'workers',  label: 'Trabajadores' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-3 px-4 text-[14px] font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-[#E8432D] text-[#E8432D]' : 'border-transparent text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-24 flex flex-col gap-3">

        {/* Proyectos */}
        {tab === 'projects' && (
          loadingP
            ? <p className="text-center text-gray-400 py-8">Cargando...</p>
            : projectList.length === 0
              ? <p className="text-center text-gray-400 py-8">No hay proyectos aún</p>
              : projectList.map(p => (
                  <ProjectCard key={p.id} project={p} onStatusChange={refetchP} />
                ))
        )}

        {/* Cotizaciones */}
        {tab === 'quotes' && (
          loadingQ
            ? <p className="text-center text-gray-400 py-8">Cargando...</p>
            : quoteList.length === 0
              ? <p className="text-center text-gray-400 py-8">No hay cotizaciones</p>
              : quoteList.map(q => (
                  <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[15px]">{q.service?.name}</p>
                        <p className="text-[12px] text-gray-400">{q.client?.name} · {q.city}</p>
                        <p className="text-[12px] text-gray-400">{q.address}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                        q.status === 'pendiente' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    {q.estimated_price && (
                      <p className="text-[#E8432D] font-extrabold text-[16px] mt-2">
                        ${Number(q.estimated_price).toLocaleString('es-CO')}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleQuoteStatus(q.id, 'aceptada')}
                        disabled={q.status === 'aceptada'}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-green-50 text-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleQuoteStatus(q.id, 'rechazada')}
                        disabled={q.status === 'rechazada'}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-50 text-red-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))
        )}

        {/* Trabajadores */}
        {tab === 'workers' && (
          loadingW
            ? <p className="text-center text-gray-400 py-8">Cargando...</p>
            : workerList.length === 0
              ? <p className="text-center text-gray-400 py-8">No hay trabajadores registrados</p>
              : workerList.map(w => (
                  <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E8432D] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {w.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] text-[#111]">{w.name}</p>
                      <p className="text-[12px] text-gray-400">{w.email}</p>
                      <p className="text-[12px] text-gray-400">{w.city || 'Sin ciudad'} · ⭐ {w.rating_avg || '0.0'}</p>
                    </div>
                  </div>
                ))
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={refetchP}
        />
      )}
    </div>
  )
}