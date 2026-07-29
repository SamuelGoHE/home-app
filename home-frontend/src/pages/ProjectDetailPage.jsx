import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, MapPin, FileText, CheckCircle2,
  Clock, AlertCircle, Phone, Star, ShieldCheck,
  MessageCircle, Check, Zap, Search
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useProject } from '../hooks/useApi'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import { CardSkeleton, EmptyState, ErrorState } from '../components/common'
import toast from 'react-hot-toast'

function formatDate(d) {
  if (!d) return 'Sin fecha asignada'
  return format(new Date(d), "d MMM yyyy", { locale: es })
}

const STATUS_UI = {
  pendiente: { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  en_revision: { label: 'En revisión', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle },
  aprobado: { label: 'Aprobado', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle2 },
  en_progreso: { label: 'En progreso', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock },
  pausado: { label: 'Pausado', color: 'text-gray-500', bg: 'bg-gray-100', icon: AlertCircle },
  completado: { label: 'Completado', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
  completada: { label: 'Completada', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
}

const PRIORITY_UI = {
  baja: { label: 'Baja', color: 'bg-gray-400' },
  media: { label: 'Media', color: 'bg-blue-500' },
  alta: { label: 'Alta', color: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-500' },
}

export default function ProjectDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const { data: project, loading, error, refetch } = useProject(id)
  const [updating, setUpdating] = useState(false)

  const canEdit = user?.role === 'admin' || user?.role === 'trabajador' || user?.role === 'cliente'

  const handleUpdateStatus = async (newStatus) => {
    if (updating) return
    setUpdating(true)
    try {
      await api.patch(`/projects/${id}/status`, { status: newStatus })
      toast.success(`Estado actualizado`)
      refetch()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setUpdating(false)
    }
  }

  const tasks = project?.tasks || []

  const getTaskWeight = (status) => {
    if (status === 'completada') return 1
    if (status === 'en_progreso') return 0.7
    if (status === 'en_revision') return 0.3
    return 0
  }

  const totalWeight = tasks.reduce((acc, t) => acc + getTaskWeight(t.status), 0)
  const pct = tasks.length ? Math.round((totalWeight / tasks.length) * 100) : 0
  const done = tasks.filter(t => t.status === 'completada').length

  const statusDef = project ? (STATUS_UI[project.status] || STATUS_UI.pendiente) : STATUS_UI.pendiente
  const StatusIcon = statusDef.icon

  const assignedWorker = tasks.find(t => t.assignee)?.assignee
  const isCompleted = project?.status === 'completado'

  const workerAction = () => {
    if (user?.role !== 'trabajador') return null
    if (!project) return null

    if (project.status === 'pendiente') {
      return { label: 'Comenzar trabajo', status: 'en_revision' }
    }
    if (['en_revision', 'aprobado', 'pausado'].includes(project.status)) {
      return { label: 'Continuar progreso', status: 'en_progreso' }
    }
    if (project.status === 'en_progreso') {
      return { label: 'Marcar como completado', status: 'completado' }
    }
    return null
  }

  const action = workerAction()

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-3xl bg-white min-h-screen">

        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b px-6 pt-10 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
          <div>
            <h2>{project?.title || 'Cargando...'}</h2>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {loading && <CardSkeleton />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && !project && <EmptyState title="No encontrado" />}

          {!loading && !error && project && (
            <>
              {/* HERO */}
              <div className="border p-4 rounded-xl">
                <StatusIcon />
                <h1>{project.title}</h1>
                <p>{project.service?.name}</p>

                {tasks.length > 0 && (
                  <div>
                    <p>{pct}%</p>
                    <div className="bg-gray-200 h-2">
                      <div style={{ width: `${pct}%` }} className="bg-orange-500 h-2" />
                    </div>
                  </div>
                )}
              </div>

              {/* BOTONES */}
              {action && (
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus(action.status)}
                  className="w-full py-3 bg-[#E8432D] text-white rounded-2xl font-bold text-sm active:scale-[.98] transition-all"
                >
                  {updating ? 'Actualizando...' : action.label}
                </button>
              )}

              {/* DETALLES */}
              <div className="border p-4 rounded-xl">
                <p>{project.address}</p>
                <p>{project.city}</p>
                <p>{formatDate(project.start_date)}</p>
              </div>

              {/* CONTACTO */}
              {(assignedWorker || project.client) && (
                <div className="border p-4 rounded-xl">
                  <p>
                    {user?.role === 'trabajador'
                      ? project.client?.name
                      : assignedWorker?.name}
                  </p>

                  <button onClick={() => navigate(`/chat/${project.id}`)}>
                    <MessageCircle />
                  </button>
                </div>
              )}

              {/* TAREAS */}
              <div className="border p-4 rounded-xl">
                <h3>Tareas ({done}/{tasks.length})</h3>

                {!tasks.length ? (
                  <p>No hay tareas</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => {
                      const tStatus = STATUS_UI[task.status] || STATUS_UI.pendiente

                      return (
                        <div key={task.id} className="border p-3 rounded-lg flex gap-3">
                          <div>
                            {task.status === 'completada'
                              ? <Check />
                              : <div className="w-2 h-2 bg-gray-300 rounded-full" />
                            }
                          </div>

                          <div>
                            <p className={task.status === 'completada' ? 'line-through' : ''}>
                              {task.title}
                            </p>
                            <span>{tStatus.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}