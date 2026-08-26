import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Heart, Search, Star, Filter } from 'lucide-react'
import { useServices } from '../hooks/useApi'
import { CardSkeleton, ErrorState, EmptyState } from '../components/common'
import { IconButton } from '../components/ui'
import { getFavoriteServices, toggleFavoriteService } from '../utils/favorites'

/* ─── Mapa de categorías ─────────────────────────────────────────── */
const CATEGORY_META = {
  pintura:             { emoji: '🎨', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop' },
  enchapes:            { emoji: '🪟', img: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=600&h=400&fit=crop' },
  electricidad:        { emoji: '⚡', img: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=600&h=400&fit=crop' },
  plomeria:            { emoji: '🔧', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=400&fit=crop' },
  obra_gris:           { emoji: '🏗️', img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop' },
  carpinteria:         { emoji: '🪚', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop' },
  impermeabilizacion:  { emoji: '🌊', img: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&h=400&fit=crop' },
  otro:                { emoji: '🔨', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' },
}

const CATEGORIES = ['pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro']

/* ─── Utilidad de precio ─────────────────────────────────────────── */
function formatPrice(price, unit) {
  if (!price) return null
  const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
  const units = { por_m2: '/m²', por_hora: '/hr', por_proyecto: '/proy', a_convenir: '' }
  return `${formatted}${units[unit] || ''}`
}

/* ══════════════════════════════════════════════════════════════════
   SERVICES SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ServicesScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || null
  
  const [search, setSearch] = useState('')
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  // Obtenemos todos los servicios (sin filtrar por categoría en API, filtramos localmente para mejor UX)
  const { data: allServices, loading, error, refetch } = useServices()

  // Sincronizar favoritos
  useEffect(() => {
    setFavoriteIds(new Set(getFavoriteServices().map((s) => s.id)))
  }, [allServices])

  // Filtrado compuesto
  const filteredServices = useMemo(() => {
    if (!allServices) return []
    let result = allServices
    
    // Filtrar por categoría
    if (activeCategory) {
      result = result.filter(s => s.category === activeCategory)
    }
    
    // Filtrar por texto
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.description?.toLowerCase().includes(q)
      )
    }
    
    return result
  }, [allServices, activeCategory, search])

  const setCategory = (cat) => {
    if (cat === activeCategory) setSearchParams({})
    else setSearchParams({ category: cat })
  }

  const handleToggleFavorite = (service, e) => {
    e.stopPropagation()
    const { favorites } = toggleFavoriteService(service)
    setFavoriteIds(new Set(favorites.map((f) => f.id)))
  }

  return (
    <div className="bg-background min-h-screen page-enter flex flex-col">
      {/* ── Header fijo ── */}
      <div className="bg-surface sticky top-0 z-20 border-b border-border pb-2">
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 xl:px-16 pt-12 pb-2">
          <IconButton icon={ArrowLeft} aria-label="Volver al inicio" onClick={() => navigate('/home')} />
          <div className="flex-1">
            <h2 className="text-[18px] font-extrabold text-ink leading-tight">Explorar</h2>
            <p className="text-[12px] text-muted font-medium">Servicios disponibles</p>
          </div>
        </div>

        {/* ── Búsqueda ── */}
        <div className="px-4 sm:px-6 lg:px-10 xl:px-16 pb-3">
          <div className="flex items-center gap-2.5 bg-gray-50/80 border border-border rounded-2xl px-4 py-3
                          focus-within:border-brand focus-within:bg-white transition-all">
            <Search size={17} className="text-muted flex-shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar reparación, pintura, etc..."
              className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder-gray-400 text-ink"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="text-muted hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* ── Filtro de categorías (Píldoras) ── */}
        <div className="flex gap-2 px-4 sm:px-6 lg:px-10 xl:px-16 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setSearchParams({})}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[13px] font-bold transition-all border
              ${!activeCategory
                ? 'bg-brand text-white border-brand shadow-[0_4px_12px_rgba(232,67,45,0.25)]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.otro
            const isActive = activeCategory === cat
            return (
              <button key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[13px] font-bold capitalize transition-all border flex items-center gap-1.5
                  ${isActive
                    ? 'bg-brand text-white border-brand shadow-[0_4px_12px_rgba(232,67,45,0.25)]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >
                {cat.replace('_', ' ')}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Lista de Servicios ── */}
      <div className="px-4 sm:px-6 lg:px-10 xl:px-16 pt-4 pb-8 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {loading && (
          <>
            <CardSkeleton className="aspect-square rounded-3xl" />
            <CardSkeleton className="aspect-square rounded-3xl" />
            <CardSkeleton className="aspect-square rounded-3xl" />
            <CardSkeleton className="aspect-square rounded-3xl" />
          </>
        )}

        {error && <div className="col-span-2"><ErrorState message={error} onRetry={refetch} /></div>}

        {!loading && !error && filteredServices?.length === 0 && (
          <div className="col-span-2">
            <EmptyState 
              icon="🔍" 
              title="Sin resultados" 
              subtitle={search ? `No encontramos nada para "${search}"` : "No hay servicios en esta categoría"}
              action="Limpiar filtros"
              onAction={() => { setSearch(''); setSearchParams({}) }}
            />
          </div>
        )}

        {!loading && !error && filteredServices?.map(svc => {
          const meta = CATEGORY_META[svc.category] || CATEGORY_META.otro
          const img = svc.image_url || meta.img
          const isFav = favoriteIds.has(svc.id)

          return (
            <div
              key={svc.id}
              onClick={() => navigate(`/quote?serviceId=${svc.id}&serviceName=${encodeURIComponent(svc.name)}&serviceCategory=${encodeURIComponent(svc.category || '')}`)}
              className="rounded-2xl overflow-hidden relative active:scale-95 transition-transform cursor-pointer shadow-sm group"
            >
              {/* Imagen con gradiente */}
              <div className="aspect-square w-full relative">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Botón Favorito — reskineado a mano (no IconButton: necesita
                    `fill` dinámico en el ícono, que IconButton no expone),
                    pero conserva el mínimo táctil 44×44 del design system. */}
                <button
                  type="button"
                  aria-label={isFav ? `Quitar ${svc.name} de favoritos` : `Agregar ${svc.name} a favoritos`}
                  onClick={(e) => handleToggleFavorite(svc, e)}
                  className="absolute top-1.5 right-1.5 w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                >
                  <Heart size={18} className={isFav ? 'text-brand fill-brand' : 'text-white'} aria-hidden="true" />
                </button>

                {/* Info sobre imagen */}
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-white text-[18px] font-extrabold leading-tight">{svc.name}</h3>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
