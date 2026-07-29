import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Calendar, Star, Search, PlusCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useProjects } from '../hooks/useApi'
import { CardSkeleton, EmptyState, ErrorState } from '../components/common'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/* ─── Utilidades ─────────────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return null
  return format(new Date(d), "d MMM yyyy", { locale: es })
}

const STATUS_UI = {
  pendiente:    { label: 'Pendiente',    color: 'text-gray-600',   bg: 'bg-gray-100',   icon: Clock },
  en_revision:  { label: 'En revisión',  color: 'text-amber-600',  bg: 'bg-amber-100',  icon: AlertCircle },
  aprobado:     { label: 'Aprobado',     color: 'text-blue-600',   bg: 'bg-blue-100',   icon: CheckCircle2 },
  en_progreso:  { label: 'En progreso',  color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock },
  pausado:      { label: 'Pausado',      color: 'text-gray-500',   bg: 'bg-gray-100',   icon: AlertCircle },
  completado:   { label: 'Completado',   color: 'text-emerald-600',bg: 'bg-emerald-100',icon: CheckCircle2 },
  cancelado:    { label: 'Cancelado',    color: 'text-red-600',    bg: 'bg-red-100',    icon: AlertCircle },
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
    <div className="min-h-screen bg-[#f8f9fb] page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <button onClick={() => navigate('/home')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-[18px] font-extrabold text-[#111] leading-tight">Mis Proyectos</h2>
            <p className="text-[12px] text-gray-400 font-medium">Gestión y seguimiento</p>
          </div>
          <button onClick={() => navigate('/services')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
            <PlusCircle size={18} />
          </button>
        </div>

        {/* ── Búsqueda ── */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5 bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-3
                          focus-within:border-[#E8432D] focus-within:bg-white transition-all">
            <Search size={17} className="text-gray-400 flex-shrink-0" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proyecto..."
              className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder-gray-400 text-[#111]" 
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
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
                  ? 'bg-[#E8432D] text-white border-[#E8432D] shadow-[0_4px_12px_rgba(232,67,45,0.25)]' 
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
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
             <p className="text-[14px] text-gray-400">No hay proyectos que coincidan con la búsqueda.</p>
           </div>
        )}

        {!loading && !error && filteredProjects?.map(project => {
          const isCompleted = project.status === 'completado'
          const assignedWorker = project.tasks?.find(t => t.assignee)?.assignee
          
          const statusDef = STATUS_UI[project.status] || STATUS_UI.pendiente
          const StatusIcon = statusDef.icon

          // Tareas progress
          const tasks = project.tasks || []
          const done = tasks.filter(t => t.status === 'completada').length
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

          return (
            <div 
              key={project.id} 
              className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 group active:scale-[.98] transition-transform cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {/* Header de tarjeta */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${statusDef.bg} ${statusDef.color} mb-2`}>
                    <StatusIcon size={12} strokeWidth={2.5} />
                    <span className="text-[10px] font-extrabold uppercase tracking-wide">{statusDef.label}</span>
                  </div>
                  <h3 className="font-extrabold text-[16px] text-[#111] truncate">{project.title}</h3>
                  <p className="text-[13px] text-gray-500 font-medium truncate mt-0.5">{project.service?.name || 'Servicio'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E8432D] group-hover:text-white transition-colors">
                  <ChevronRight size={16} className={isCompleted ? "text-gray-400 group-hover:text-white" : "text-[#E8432D] group-hover:text-white"} />
                </div>
              </div>

              {/* Info extra */}
              <div className="flex items-center gap-4 text-gray-400 mb-4">
                {project.start_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500">
                      {formatDate(project.start_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div className="mb-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500">Progreso</span>
                    <span className="text-[12px] font-extrabold text-[#111]">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#E8432D] to-[#f97316] rounded-full transition-all duration-500" 
                         style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 text-right font-medium">{done} de {tasks.length} completadas</p>
                </div>
              )}

              {/* Acciones Rápidas (Calificar) */}
              {isCompleted && assignedWorker && (
                <div className="mt-4 pt-3 border-t border-gray-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/rate?projectId=${project.id}&workerId=${assignedWorker.id}&workerName=${encodeURIComponent(assignedWorker.name)}`)
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 rounded-xl text-[13px] font-bold text-amber-600 hover:bg-amber-100 transition-colors border border-amber-100"
                  >
                    <Star size={15} className="fill-amber-400 stroke-amber-400" />
                    Calificar a {assignedWorker.name.split(' ')[0]}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}