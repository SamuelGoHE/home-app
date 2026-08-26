import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, MessageCircle, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useProject } from '../hooks/useApi'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'
import { EmptyState, ErrorState, StatusBadge } from '../components/common'
import { Button, IconButton, Card, Skeleton } from '../components/ui'
import toast from 'react-hot-toast'

function formatDate(d) {
  if (!d) return 'Sin fecha asignada'
  return format(new Date(d), "d MMM yyyy", { locale: es })
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
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-3xl bg-surface min-h-screen">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border px-5 pt-10 pb-3 flex items-center gap-2">
          <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
          <h1 className="text-heading text-ink truncate">{project?.title || 'Cargando...'}</h1>
        </div>

        <div className="p-5 space-y-4">

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {error && <ErrorState message={error} onRetry={refetch} />}

          {!loading && !error && !project && (
            <EmptyState
              icon="🔍"
              title="Proyecto no encontrado"
              subtitle="Puede que haya sido eliminado o que no tengas acceso a él."
              action="Volver"
              onAction={() => navigate(-1)}
            />
          )}

          {!loading && !error && project && (
            <>
              {/* HERO */}
              <Card padding="lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption text-muted mb-1 truncate">{project.service?.name}</p>
                    <h2 className="text-heading text-ink truncate">{project.title}</h2>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                {tasks.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted">Progreso</span>
                      <span className="text-xs font-bold text-ink">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* ACCIÓN PRINCIPAL (solo trabajador) */}
              {action && (
                <Button
                  variant="primary"
                  fullWidth
                  loading={updating}
                  onClick={() => handleUpdateStatus(action.status)}
                >
                  {updating ? 'Actualizando...' : action.label}
                </Button>
              )}

              {/* DETALLES */}
              <Card padding="md">
                <h3 className="text-label uppercase text-muted mb-3">Detalles</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-muted flex-none mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-body text-ink truncate">{project.address}</p>
                      <p className="text-caption text-muted">{project.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-muted flex-none" aria-hidden="true" />
                    <p className="text-body text-ink">{formatDate(project.start_date)}</p>
                  </div>
                </div>
              </Card>

              {/* CONTACTO */}
              {(assignedWorker || project.client) && (
                <Card padding="md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-label uppercase text-muted mb-1">
                        {user?.role === 'trabajador' ? 'Cliente' : 'Profesional asignado'}
                      </p>
                      <p className="text-body font-semibold text-ink truncate">
                        {user?.role === 'trabajador' ? project.client?.name : assignedWorker?.name}
                      </p>
                    </div>
                    <IconButton
                      icon={MessageCircle}
                      variant="solid"
                      aria-label="Enviar mensaje"
                      onClick={() => navigate(`/chat/${project.id}`)}
                    />
                  </div>
                </Card>
              )}

              {/* TAREAS */}
              <Card padding="md">
                <h3 className="text-label uppercase text-muted mb-3">Tareas ({done}/{tasks.length})</h3>

                {!tasks.length ? (
                  <p className="text-caption text-muted">No hay tareas registradas todavía</p>
                ) : (
                  <div>
                    {tasks.map(task => {
                      const isDone = task.status === 'completada'
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                        >
                          <div
                            className={[
                              'w-5 h-5 rounded-full flex items-center justify-center flex-none',
                              isDone ? 'bg-brand' : 'border-2 border-border',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {isDone && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <p className={['flex-1 text-body truncate', isDone ? 'line-through text-muted' : 'text-ink'].join(' ')}>
                            {task.title}
                          </p>
                          <StatusBadge status={task.status} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
