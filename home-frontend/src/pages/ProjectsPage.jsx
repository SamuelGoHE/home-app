import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Calendar, Star, Search, PlusCircle, X } from 'lucide-react'
import { useProjects } from '../hooks/useApi'
import { CardSkeleton, EmptyState, ErrorState, StatusBadge } from '../components/common'
import { Button, IconButton, Card } from '../components/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/* ─── Utilidades ─────────────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return null
  return format(new Date(d), "d MMM yyyy", { locale: es })
}

/* ══════════════════════════════════════════════════════════════════
   PROJECTS PAGE
══════════════════════════════════════════════════════════════════ */
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { data: projects, loading, error, refetch } = useProjects()

  const [filter, setFilter] = useState('todos') // todos, activos, completados
  const [search, setSearch] = useState('')

  const filteredProjects = useMemo(() => {
    if (!projects) return []
    let result = projects

    // Filtrar por estado
    if (filter === 'activos') {
      result = result.filter(p => !['completado', 'cancelado'].includes(p.status))
    } else if (filter === 'completados') {
      result = result.filter(p => p.status === 'completado')
    }

    // Filtrar por búsqueda
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.service?.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [projects, filter, search])

  return (
    <div className="min-h-screen bg-background page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-surface sticky top-0 z-20 border-b border-border pb-2">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <IconButton icon={ArrowLeft} variant="solid" aria-label="Volver" onClick={() => navigate('/home')} />
          <div className="flex-1">
            <h2 className="text-[18px] font-extrabold text-ink leading-tight">Mis Proyectos</h2>
            <p className="text-[12px] text-muted font-medium">Gestión y seguimiento</p>
          </div>
          <IconButton
            icon={PlusCircle}
            aria-label="Explorar servicios"
            onClick={() => navigate('/services')}
            className="!bg-red-50 !text-red-500 hover:!bg-red-100"
          />
        </div>

        {/* ── Búsqueda ── */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5 bg-gray-50/80 border border-border rounded-2xl px-4 py-3
                          focus-within:border-brand focus-within:bg-surface transition-all">
            <Search size={17} className="text-muted flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proyecto..."
              className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder-gray-400 text-ink"
            />
            {search && (
              <IconButton
                icon={X}
                variant="ghost"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch('')}
              />
            )}
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'activos', label: 'En curso' },
            { id: 'completados', label: 'Completados' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[13px] font-bold transition-all border
                ${filter === f.id
                  ? 'bg-brand text-white border-brand shadow-[0_4px_12px_rgba(232,67,45,0.25)]'
                  : 'bg-surface text-muted border-gray-200 hover:border-gray-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de Proyectos ── */}
      <div className="px-5 pt-4 pb-8 flex-1 flex flex-col gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="w-full h-36 rounded-3xl" />
        ))}

        {error && <ErrorState message={error} onRetry={refetch} />}

        {!loading && !error && projects?.length === 0 && (
          <div className="py-10">
            <EmptyState
              icon="📋"
              title="Sin proyectos aún"
              subtitle="Cuando contrates un servicio o inicies un proyecto, aparecerá aquí."
              action="Explorar servicios"
              onAction={() => navigate('/services')}
            />
          </div>
        )}

        {!loading && !error && projects?.length > 0 && filteredProjects.length === 0 && (
           <div className="py-10 text-center">
             <p className="text-[14px] text-muted">No hay proyectos que coincidan con la búsqueda.</p>
           </div>
        )}

        {!loading && !error && filteredProjects?.map(project => {
          const isCompleted = project.status === 'completado'
          const assignedWorker = project.tasks?.find(t => t.assignee)?.assignee

          // Tareas progress
          const tasks = project.tasks || []
          const done = tasks.filter(t => t.status === 'completada').length
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

          return (
            <Card
              key={project.id}
              padding="sm"
              onClick={() => navigate(`/projects/${project.id}`)}
              className="group active:scale-[.98] transition-transform cursor-pointer"
            >
              {/* Header de tarjeta */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <StatusBadge status={project.status} />
                  </div>
                  <h3 className="font-extrabold text-[16px] text-ink truncate">{project.title}</h3>
                  <p className="text-[13px] text-muted font-medium truncate mt-0.5">{project.service?.name || 'Servicio'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                  <ChevronRight size={16} className={isCompleted ? "text-muted group-hover:text-white" : "text-brand group-hover:text-white"} />
                </div>
              </div>

              {/* Info extra */}
              <div className="flex items-center gap-4 text-muted mb-4">
                {project.start_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted" />
                    <span className="text-[11px] font-medium text-muted">
                      {formatDate(project.start_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar — patrón canónico: track gris, fill brand en curso / success al completar */}
              {tasks.length > 0 && (
                <div className="mb-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold text-muted">Progreso</span>
                    <span className="text-[12px] font-extrabold text-ink">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-success' : 'bg-brand'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted mt-1.5 text-right font-medium">{done} de {tasks.length} completadas</p>
                </div>
              )}

              {/* Acciones Rápidas (Calificar) */}
              {isCompleted && assignedWorker && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Button
                    variant="secondary"
                    fullWidth
                    aria-label={`Calificar a ${assignedWorker.name.split(' ')[0]}`}
                    className="!bg-amber-50 !border-amber-100 hover:!bg-amber-100 !text-amber-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/rate?projectId=${project.id}&workerId=${assignedWorker.id}&workerName=${encodeURIComponent(assignedWorker.name)}`)
                    }}
                  >
                    <Star size={15} className="fill-amber-400 stroke-amber-400" />
                    Calificar a {assignedWorker.name.split(' ')[0]}
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
