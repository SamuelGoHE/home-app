import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, ChevronRight, Star, Zap, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useServices, useProjects } from '../hooks/useApi'
import { useNotifications } from '../hooks/useNotifications'
import { RowSkeleton, CardSkeleton, StatusBadge } from '../components/common'
import { IconButton, Card } from '../components/ui'
import { getFavoriteServices, toggleFavoriteService } from '../utils/favorites'
import { NotificationsPanel } from '../components/notifications/NotificationsPanel'

/* ─── Mapa de categorías ─────────────────────────────────────────── */
const CATEGORY_META = {
  pintura: { emoji: '🎨', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop' },
  enchapes: { emoji: '🪟', img: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=600&h=400&fit=crop' },
  electricidad: { emoji: '⚡', img: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=600&h=400&fit=crop' },
  plomeria: { emoji: '🔧', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=400&fit=crop' },
  obra_gris: { emoji: '🏗️', img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop' },
  carpinteria: { emoji: '🪚', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop' },
  impermeabilizacion: { emoji: '🌊', img: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&h=400&fit=crop' },
  otro: { emoji: '🔨', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' },
}

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=Imagen+no+disponible'

const getServiceImage = (svc) => {
  return svc?.image_url || CATEGORY_META[svc?.category]?.img || CATEGORY_META.otro.img || PLACEHOLDER_IMG
}

/* ─── Avatar con inicial ─────────────────────────────────────────── */
function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name}
      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
  }
  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-orange-500 flex items-center justify-center shadow-sm">
      <span className="text-white text-[13px] font-bold">{initials}</span>
    </div>
  )
}

/* ─── Categorías horizontales ────────────────────────────────────── */
function Categories({ services, onSelect }) {
  const unique = [...new Map(services.map(s => [s.category, s])).values()]
  return (
    <div className="flex overflow-x-auto gap-4 px-4 sm:px-6 pb-2 no-scrollbar snap-x snap-mandatory">
      {unique.map(svc => {
        const img = getServiceImage(svc)
        return (
          <button key={svc.category} onClick={() => onSelect(svc.category)}
            className="flex-none w-[110px] snap-start flex flex-col items-center gap-2.5 group">
            <div className="w-full aspect-square rounded-3xl overflow-hidden ring-2 ring-transparent
                            group-hover:ring-brand group-active:scale-95 transition-all duration-150 shadow-sm">
              <img src={img} alt={svc.category}
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG }}
                className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] font-bold text-gray-700 whitespace-nowrap capitalize text-center w-full overflow-hidden text-ellipsis">
              {svc.category.replace('_', ' ')}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Tarjeta de servicio destacado ─────────────────────────────── */
function ServiceCard({ svc, isFav, onToggleFav }) {
  const navigate = useNavigate()
  const img = getServiceImage(svc)

  return (
    <div className="flex-none w-[260px] snap-start rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm
                    active:scale-[.97] transition-transform cursor-pointer"
      onClick={() => navigate(`/services?category=${svc.category}`)}>
      <div className="relative">
        <img src={img} alt={svc.name}
          onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG }}
          className="w-full h-24 object-cover" />
        <button type="button"
          onClick={e => { e.stopPropagation(); onToggleFav(svc) }}
          aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={isFav}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm
                     flex items-center justify-center shadow-sm border border-white/50">
          <span aria-hidden="true" className={`text-[13px] ${isFav ? 'opacity-100' : 'opacity-40'}`}>❤️</span>
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="font-bold text-[13px] text-ink truncate">{svc.name}</p>
        <p className="text-[11px] text-gray-400 capitalize mt-0.5">
          {svc.category.replace('_', ' ')}
        </p>
      </div>
    </div>
  )
}

/* ─── Tarjeta de proyecto activo ─────────────────────────────────── */
function ProjectCard({ project }) {
  const navigate = useNavigate()
  const tasks = project.tasks || []
  const done = tasks.filter(t => t.status === 'completada').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <Card
      padding="sm"
      onClick={() => navigate(`/projects/${project.id}`)}
      className="cursor-pointer active:scale-[.98] transition-transform"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-ink truncate">{project.title || project.service?.name || 'Proyecto'}</p>
          <p className="text-[12px] text-gray-400 mt-0.5">{project.service?.name}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {tasks.length > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gradient-to-r from-brand to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="flex items-center gap-1 mt-3 text-brand">
        <span className="text-[12px] font-semibold">Ver detalle</span>
        <ChevronRight size={13} aria-hidden="true" />
      </div>
    </Card>
  )
}

export default function HomeScreen() {
  const [search, setSearch] = useState('')
  const [favIds, setFavIds] = useState(new Set())
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: services, loading: loadingSvc } = useServices()
  const { data: projects, loading: loadingProj } = useProjects()
  const { notifications, hasUnreadNotifs } = useNotifications()

  const firstName = user?.name?.split(' ')[0] || 'bienvenido'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches'

  const activeProjects = (projects || []).filter(p =>
    ['en_progreso', 'pendiente', 'aprobado'].includes(p.status)
  ).slice(0, 3)

  const filtered = search && services
    ? services.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    )
    : []

  useEffect(() => {
    const ids = getFavoriteServices().map(s => s.id)
    setFavIds(new Set(ids))
  }, [services])

  const handleToggleFav = (svc) => {
    const { favorites } = toggleFavoriteService(svc)
    setFavIds(new Set(favorites.map(f => f.id)))
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center w-full">
      <div className="w-full bg-white min-h-screen flex flex-col">
        <NotificationsPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} notifications={notifications} />

        {/* ── Header ── */}
        <div className="bg-white px-4 sm:px-6 pt-12 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="text-[12px] text-gray-400 font-medium">{greeting},</p>
              <p className="text-[16px] font-extrabold text-ink leading-tight truncate">{firstName} 👋</p>
            </div>
          </div>
          <div className="relative">
            <IconButton
              id="btn-home-notifications"
              icon={Bell}
              variant="solid"
              aria-label="Notificaciones"
              onClick={() => setIsNotifOpen(true)}
            />
            {hasUnreadNotifs && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full border-2 border-white pointer-events-none"
              />
            )}
          </div>
        </div>

        <div className="overflow-y-auto no-scrollbar pb-24">
          {/* ── Barra de búsqueda ── */}
          <div className="px-4 sm:px-6 pt-4 pb-4">
            <div className="flex items-center gap-2.5 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3
                            focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(232,67,45,0.1)] transition-all">
              <Search size={17} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
              <input id="input-home-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
                aria-label="Buscar servicio"
                placeholder="Buscar servicio..." className="flex-1 bg-transparent outline-none text-[14px] font-medium text-ink" />
            </div>

            {search && (
              <div className="mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {filtered.length > 0 ? (
                  filtered.map(s => (
                    <button key={s.id} onClick={() => navigate(`/quote?serviceId=${s.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                      <img src={getServiceImage(s)} alt={s.name}
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG }}
                        className="w-10 h-10 rounded-xl object-cover" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">{s.name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{s.category.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-[14px] text-gray-400">Sin resultados</div>
                )}
              </div>
            )}
          </div>

          {!search && (
            <>
              {/* ── Proyectos activos ── */}
              {!loadingProj && activeProjects.length > 0 && (
                <div className="px-4 sm:px-6 pb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-brand" />
                      <h2 className="text-[15px] font-extrabold text-ink">Proyectos activos</h2>
                    </div>
                    <button onClick={() => navigate('/projects')} className="text-[12px] text-brand font-semibold flex items-center gap-0.5 hover:underline">
                      Ver todos <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                  </div>
                </div>
              )}

              {/* ── Categorías ── */}
              <div className="pb-8">
                <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-brand" />
                    <h2 className="text-[15px] font-extrabold text-ink">Categorías</h2>
                  </div>
                  <button onClick={() => navigate('/services')} className="text-[12px] text-brand font-semibold hover:underline">
                    Ver todas
                  </button>
                </div>
                {loadingSvc ? <RowSkeleton count={5} /> : <Categories services={services || []} onSelect={cat => navigate(`/services?category=${cat}`)} />}
              </div>

              {/* ── Servicios destacados (Más solicitados) ── */}
              <div className="pb-8">
                <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
                  <div className="flex items-center gap-2">
                    <Star size={15} className="text-brand" />
                    <h2 className="text-[15px] font-extrabold text-ink">Más solicitados</h2>
                  </div>
                  <button onClick={() => navigate('/services?sort=popular')} className="text-[12px] text-brand font-semibold hover:underline">
                    Ver todas
                  </button>
                </div>
                {loadingSvc ? (
                  <div className="flex overflow-x-auto gap-4 px-4 sm:px-6 pb-2 no-scrollbar">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex-none w-[260px]">
                        <CardSkeleton className="h-40" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex overflow-x-auto gap-4 px-4 sm:px-6 pb-2 no-scrollbar snap-x snap-mandatory">
                    {services?.slice(0, 5).map(svc => (
                      <ServiceCard key={svc.id} svc={svc} isFav={favIds.has(svc.id)} onToggleFav={handleToggleFav} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Banner CTA ── */}
              <div className="px-4 sm:px-6 mb-2">
                <div className="bg-gradient-to-r from-brand to-orange-500 rounded-3xl px-4 sm:px-6 py-8 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="absolute -right-2 top-8 w-14 h-14 bg-white/10 rounded-full" />
                  <h3 className="text-white font-extrabold text-[18px] mb-1 relative z-10">¿Tienes un proyecto?</h3>
                  <p className="text-white/90 text-[13px] mb-5 relative z-10">Solicita una cotización gratis y recibe propuestas.</p>
                  <button onClick={() => navigate('/services')}
                    className="relative z-10 bg-white text-brand rounded-full px-6 py-3 text-[14px] font-extrabold active:scale-95 transition-all shadow-lg">
                    Cotizar ahora →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}