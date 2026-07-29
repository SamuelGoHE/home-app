import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Briefcase, Star, MapPin, User } from 'lucide-react'
import {
  getFavoriteServices, toggleFavoriteService,
  getFavoriteWorkers, toggleFavoriteWorker
} from '../utils/favorites'

/* ─── Imágenes únicas por categoría de servicio ─────────────────── */
const SERVICE_IMAGES = {
  pintura:            'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop',
  enchapes:           'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop',
  electricidad:       'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=400&h=300&fit=crop',
  plomeria:           'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop',
  obra_gris:          'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop',
  carpinteria:        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop',
  impermeabilizacion: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=400&h=300&fit=crop',
  remodelacion:       'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
  techos:             'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
  pisos:              'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&h=300&fit=crop',
  pintura_ext:        'https://images.unsplash.com/photo-1572117331177-5c8e6d83afe3?w=400&h=300&fit=crop',
  otro:               'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop',
}

const SERVICE_LABEL = {
  pintura: 'Pintura Interior', enchapes: 'Enchapes de Baño',
  electricidad: 'Instalaciones Eléctricas', plomeria: 'Plomería General',
  obra_gris: 'Obra Gris', carpinteria: 'Carpintería en Madera',
  impermeabilizacion: 'Impermeabilización', remodelacion: 'Remodelación',
  techos: 'Techos y Cielos', pisos: 'Pisos', pintura_ext: 'Pintura Exterior', otro: 'Otro',
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('services')
  const [services, setServices] = useState([])
  const [workers, setWorkers] = useState([])

  useEffect(() => {
    setServices(getFavoriteServices())
    setWorkers(getFavoriteWorkers())
  }, [])

  const removeService = (svc) => {
    const { favorites: next } = toggleFavoriteService(svc)
    setServices(next)
  }

  const removeWorker = (w) => {
    const { favorites: next } = toggleFavoriteWorker(w)
    setWorkers(next)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] page-enter px-4 sm:px-6 lg:px-10 xl:px-16">

      {/* Header */}
      <div className="bg-white px-4 sm:px-6 lg:px-10 xl:px-16 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <h2 className="text-[20px] font-extrabold text-[#111] mb-4">Favoritos</h2>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all
              ${tab === 'services' ? 'bg-[#E8432D] text-white shadow-md shadow-[#E8432D]/25' : 'bg-gray-100 text-gray-500'}`}
          >
            <Briefcase size={14} />
            Trabajos
            {services.length > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-extrabold
                ${tab === 'services' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {services.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('workers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all
              ${tab === 'workers' ? 'bg-[#E8432D] text-white shadow-md shadow-[#E8432D]/25' : 'bg-gray-100 text-gray-500'}`}
          >
            <User size={14} />
            Trabajadores
            {workers.length > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-extrabold
                ${tab === 'workers' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {workers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 xl:px-16 pt-4 pb-24 grid grid-cols-1 gap-3 lg:grid-cols-2">

        {/* ── Trabajos favoritos ─────────────────────────────── */}
        {tab === 'services' && (
          <>
            {services.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm mt-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={24} className="text-[#E8432D]" />
                </div>
                <p className="font-bold text-gray-400 text-[15px]">Sin trabajos favoritos</p>
                <p className="text-gray-300 text-[13px] mt-1">Guarda servicios para acceder rápido.</p>
                <button
                  onClick={() => navigate('/services')}
                  className="mt-4 px-5 py-2.5 bg-[#E8432D] text-white rounded-xl text-[13px] font-bold"
                >
                  Explorar servicios
                </button>
              </div>
            ) : services.map((svc) => {
              const img = SERVICE_IMAGES[svc.category] || SERVICE_IMAGES.otro
              const label = svc.name
              return (
                <div
                  key={svc.id}
                  onClick={() => navigate(`/quote?serviceId=${svc.id}&serviceName=${encodeURIComponent(svc.name)}&serviceCategory=${encodeURIComponent(svc.category || '')}`)}
                  className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 cursor-pointer active:scale-[.99] transition-transform"
                >
                  <img
                    src={img}
                    alt={label}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[#111] truncate">{label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeService(svc) }}
                    className="w-9 h-9 rounded-xl bg-red-50 text-[#E8432D] flex items-center justify-center flex-shrink-0"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* ── Trabajadores favoritos ─────────────────────────── */}
        {tab === 'workers' && (
          <>
            {workers.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm mt-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={24} className="text-[#E8432D]" />
                </div>
                <p className="font-bold text-gray-400 text-[15px]">Sin trabajadores favoritos</p>
                <p className="text-gray-300 text-[13px] mt-1 leading-tight">Cuando veas un trabajador que te guste, guárdalo con el corazón ♡.</p>
              </div>
            ) : workers.map((w) => (
              <div
                key={w.id}
                onClick={() => navigate(`/worker/${w.id}`)}
                className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 cursor-pointer active:scale-[.99] transition-transform"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {w.avatar
                    ? <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-gray-300">
                        {w.name?.[0]?.toUpperCase()}
                      </div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-[#111] truncate">{w.name}</p>
                  {w.city && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-gray-400" />
                      <span className="text-[12px] text-gray-400">{w.city}</span>
                    </div>
                  )}
                  {w.rating_avg && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={11} className="fill-[#E8432D] stroke-none" />
                      <span className="text-[12px] font-bold text-[#111]">{w.rating_avg}</span>
                      <span className="text-[11px] text-gray-400">({w.rating_count ?? 0})</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeWorker(w) }}
                  className="w-9 h-9 rounded-xl bg-red-50 text-[#E8432D] flex items-center justify-center flex-shrink-0"
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
