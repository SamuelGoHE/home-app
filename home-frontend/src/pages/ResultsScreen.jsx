import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Heart, RefreshCw, SlidersHorizontal, AlertCircle, X } from 'lucide-react'
import { useWorkers } from '../hooks/useApi'
import { getFavoriteWorkers, toggleFavoriteWorker } from '../utils/favorites'

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
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="font-bold text-[17px] text-[#111]">Trabajadores disponibles</div>
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 relative"
        >
          <SlidersHorizontal size={17} />
          {city && <div className="absolute top-2 right-2 w-2 h-2 bg-[#E8432D] rounded-full border border-white"></div>}
        </button>
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
            <span className="w-8 h-8 border-4 border-[#E8432D]/30 border-t-[#E8432D] rounded-full animate-spin" />
          </div>
        ) : !workers || workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} className="text-[#E8432D]" />
            </div>
            <h3 className="text-[16px] font-extrabold text-[#111] mb-1">Sin resultados</h3>
            <p className="text-[13px] text-gray-500">
              No encontramos trabajadores disponibles en <strong>{city || 'tu área'}</strong> en este momento.
            </p>
          </div>
        ) : (
          workers.map(w => {
            const profile = w.workerProfile || {}
            return (
              <article
                key={w.id}
                className="bg-white rounded-3xl p-4 flex gap-4 shadow-card text-left active:scale-[.99] transition-transform relative"
              >
                {/* Fav button */}
                <button
                  type="button"
                  onClick={e => toggleFav(w, e)}
                  className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 z-10"
                >
                  <Heart
                    size={17}
                    strokeWidth={2}
                    className={favs.has(w.id) ? 'fill-[#E8432D] stroke-[#E8432D]' : 'stroke-gray-300'}
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
                      <span className="font-extrabold text-[17px] text-[#111] truncate">{w.name.split(' ')[0]}</span>
                      {profile.is_verified && (
                        <span className="text-[10px] bg-[#E8F9F4] text-[#0F6E56] px-2 py-0.5 rounded-full font-semibold">
                          Verificado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-[12px] text-gray-400 truncate">
                        {profile.cities_covered?.[0] || city || 'Varias ciudades'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={13} className="fill-[#E8432D] stroke-none" />
                      <span className="text-[13px] font-bold text-[#111]">
                        {w.rating_avg ? parseFloat(w.rating_avg).toFixed(1) : '--'}
                      </span>
                      <span className="text-[12px] text-gray-400">
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
              </article>
            )
          })
        )}
      </div>

      {/* Currency button */}
      <div className="px-5 pb-6">
        <button
          onClick={() => setCurrency(c => c === 'COP' ? 'USD' : 'COP')}
          className="flex items-center gap-2 px-5 py-3 bg-[#E8432D] text-white rounded-full text-[14px] font-bold"
        >
          <RefreshCw size={16} />
          {currency}
        </button>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilter(false)}></div>
          <div className="bg-white w-full sm:w-96 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#111]">Filtrar por Ciudad</h3>
              <button onClick={() => setShowFilter(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {[
                { value: '', label: 'Todas las ciudades' },
                { value: 'Medellín', label: 'Medellín' },
                { value: 'Bogotá', label: 'Bogotá' },
                { value: 'Cali', label: 'Cali' },
                { value: 'Pereira', label: 'Pereira' }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleFilterCity(opt.value)}
                  className="py-3.5 px-4 rounded-2xl text-left text-[15px] font-bold transition-all bg-gray-50 text-gray-700 hover:bg-[#E8432D] hover:text-white hover:shadow-md"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
