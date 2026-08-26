import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Heart, RefreshCw, SlidersHorizontal, AlertCircle, X } from 'lucide-react'
import { useWorkers } from '../hooks/useApi'
import { getFavoriteWorkers, toggleFavoriteWorker } from '../utils/favorites'
import { Button, IconButton, Card, Badge } from '../components/ui'

function formatCOP(n) {
  if (!n) return ''
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

export default function ResultsScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const quoteId = searchParams.get('quoteId') || ''
  const serviceId = searchParams.get('serviceId') || ''
  const city = searchParams.get('city') || ''
  const serviceName = searchParams.get('serviceName') || ''
  const serviceCategory = searchParams.get('serviceCategory') || ''
  const address = searchParams.get('address') || ''
  const sqMeters = searchParams.get('sq_meters') || ''
  const occupied = searchParams.get('occupied') || ''
  const notes = searchParams.get('notes') || ''
  
  const { data: workers, loading } = useWorkers(city, serviceCategory)
  const [favs, setFavs] = useState(() => new Set(getFavoriteWorkers().map(w => w.id)))
  const [currency, setCurrency] = useState('COP')
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    setFavs(new Set(getFavoriteWorkers().map(w => w.id)))
  }, [])

  const handleFilterCity = (selectedCity) => {
    const params = new URLSearchParams(searchParams)
    if (selectedCity) {
      params.set('city', selectedCity)
    } else {
      params.delete('city')
    }
    setSearchParams(params)
    setShowFilter(false)
  }

  const toggleFav = (worker, e) => {
    e.stopPropagation()
    toggleFavoriteWorker(worker)
    setFavs(new Set(getFavoriteWorkers().map(w => w.id)))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col page-enter">
      {/* Results header */}
      <div className="bg-surface px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
        <div className="flex-1">
          <div className="font-bold text-[17px] text-ink">Trabajadores disponibles</div>
        </div>
        <div className="relative">
          <IconButton
            icon={SlidersHorizontal}
            aria-label="Filtrar por ciudad"
            onClick={() => setShowFilter(true)}
          />
          {city && <div className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border border-white pointer-events-none" />}
        </div>
      </div>

      {/* Result count */}
      <div className="px-5 py-3">
        {loading ? (
          <p className="text-sm text-gray-500 font-medium">Buscando trabajadores...</p>
        ) : (
          <p className="text-sm text-gray-500 font-medium">
            {workers?.length || 0} trabajadores disponibles {city && `en ${city}`}
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 px-5 flex flex-col gap-4 pb-4 stagger">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : !workers || workers.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} className="text-brand" aria-hidden="true" />
            </div>
            <h3 className="text-[16px] font-extrabold text-ink mb-1">Sin resultados</h3>
            <p className="text-[13px] text-gray-500">
              No encontramos trabajadores disponibles en <strong>{city || 'tu área'}</strong> en este momento.
            </p>
          </Card>
        ) : (
          workers.map(w => {
            const profile = w.workerProfile || {}
            return (
              <Card
                padding="sm"
                key={w.id}
                className="flex gap-4 shadow-card text-left active:scale-[.99] transition-transform relative"
              >
                {/* Fav button — IconButton no soporta `fill` dinámico en el ícono
                    (siempre renderiza el ícono con stroke=currentColor, sin props
                    extra), así que este toggle se queda reskineado a mano en vez
                    de forzarlo al componente; conserva el mismo mínimo táctil 44×44. */}
                <button
                  type="button"
                  aria-label={favs.has(w.id) ? `Quitar a ${w.name} de favoritos` : `Agregar a ${w.name} a favoritos`}
                  onClick={e => toggleFav(w, e)}
                  className="absolute top-1.5 right-1.5 w-11 h-11 flex items-center justify-center rounded-full z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <Heart
                    size={17}
                    strokeWidth={2}
                    className={favs.has(w.id) ? 'fill-brand stroke-brand' : 'stroke-gray-300'}
                  />
                </button>

                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <img src={w.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'} alt={w.name} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex flex-col justify-between min-w-0 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[17px] text-ink truncate">{w.name.split(' ')[0]}</span>
                      {profile.is_verified && <Badge tone="success">Verificado</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-muted flex-shrink-0" aria-hidden="true" />
                      <span className="text-[12px] text-muted truncate">
                        {profile.cities_covered?.[0] || city || 'Varias ciudades'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={13} className="fill-brand stroke-none" aria-hidden="true" />
                      <span className="text-[13px] font-bold text-ink">
                        {w.rating_avg ? parseFloat(w.rating_avg).toFixed(1) : '--'}
                      </span>
                      <span className="text-[12px] text-muted">
                        ({w.rating_count ?? 0})
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      serviceName,
                      serviceId,
                      serviceCategory,
                      city,
                      address,
                      sq_meters: sqMeters,
                      occupied,
                      notes,
                    })
                    navigate(`/worker/${w.id}?${params.toString()}`)
                  }}
                  className="absolute inset-0 rounded-3xl z-0"
                  aria-label={`Ver perfil de ${w.name}`}
                />
              </Card>
            )
          })
        )}
      </div>

      {/* Currency button */}
      <div className="px-5 pb-6">
        <Button
          variant="primary"
          aria-label={`Cambiar moneda, actualmente ${currency}`}
          onClick={() => setCurrency(c => c === 'COP' ? 'USD' : 'COP')}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {currency}
        </Button>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilter(false)}></div>
          <div className="bg-surface w-full sm:w-96 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-ink">Filtrar por Ciudad</h3>
              <IconButton icon={X} variant="solid" aria-label="Cerrar" className="!bg-gray-100 !border-0 !text-gray-500" onClick={() => setShowFilter(false)} />
            </div>

            <div className="flex flex-col gap-3">
              {[
                { value: '', label: 'Todas las ciudades' },
                { value: 'Medellín', label: 'Medellín' },
                { value: 'Bogotá', label: 'Bogotá' },
                { value: 'Cali', label: 'Cali' },
                { value: 'Pereira', label: 'Pereira' }
              ].map(opt => (
                <Button
                  key={opt.label}
                  variant="secondary"
                  className="!justify-start !rounded-2xl !border-0 !bg-gray-50 hover:!bg-brand hover:!text-white"
                  onClick={() => handleFilterCity(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
