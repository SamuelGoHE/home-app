import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { format, startOfMonth, getDaysInMonth, getDay, addMonths, isBefore, isAfter, isEqual } from 'date-fns'
import { es } from 'date-fns/locale'

/* ─── Utilidades ─────────────────────────────────────────────────── */
const TODAY = new Date()
TODAY.setHours(0,0,0,0)

export default function CalendarScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [loading, setLoading] = useState(false)

  // Datos del trabajador y del servicio (vienen de WorkerDetailPage)
  const workerId       = searchParams.get('workerId')
  const serviceId      = searchParams.get('serviceId')
  const serviceName    = searchParams.get('serviceName') || 'Servicio'
  const city           = searchParams.get('city') || ''
  const address        = searchParams.get('address') || ''
  const sqMeters       = searchParams.get('sq_meters') || ''
  const occupied       = searchParams.get('occupied') === 'true'
  const notes          = searchParams.get('notes') || ''

  const months = useMemo(() => [TODAY, addMonths(TODAY, 1), addMonths(TODAY, 2)], [])

  const selectDay = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null)
    } else {
      if (isBefore(date, startDate)) { setEndDate(startDate); setStartDate(date) }
      else if (isEqual(date, startDate)) { setStartDate(null) }
      else setEndDate(date)
    }
  }

  const getState = (date) => {
    if (!startDate) return 'none'
    if (isEqual(date, startDate)) return 'start'
    if (endDate && isEqual(date, endDate)) return 'end'
    if (endDate && isAfter(date, startDate) && isBefore(date, endDate)) return 'range'
    return 'none'
  }

  const formatLabel = (d) => d ? format(d, "EEE d, MMM", { locale: es }) : 'Seleccionar'

  const handleConfirm = async () => {
    if (!startDate) return
    if (!workerId || !serviceId) {
      toast.error('Faltan datos del servicio. Vuelve a seleccionar el trabajador.')
      navigate(-1)
      return
    }

    setLoading(true)
    try {
      // ── CREAR LA SOLICITUD DIRIGIDA AL TRABAJADOR ──
      const res = await api.post('/quotes', {
        service_id: serviceId,
        worker_id: workerId,
        city,
        address,
        sq_meters: sqMeters ? parseFloat(sqMeters) : null,
        occupied,
        notes,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      })

      toast.success('¡Solicitud enviada! El profesional te responderá pronto.', {
        duration: 4000,
        icon: '📨',
      })
      navigate('/projects')
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al enviar la solicitud'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col page-enter">
      {/* ── Header ── */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 pb-2 shadow-sm">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-extrabold text-[#111] leading-tight">¿Cuándo lo necesitas?</h2>
            <p className="text-[12px] text-gray-400 font-medium">Selecciona las fechas del servicio</p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-[#E8432D]">
            <CalendarIcon size={18} />
          </div>
        </div>

        {/* Resumen del servicio */}
        {serviceName && serviceName !== 'Servicio' && (
          <div className="mx-5 mb-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-2">
            <span className="text-sm font-bold text-[#E8432D] truncate">{decodeURIComponent(serviceName)}</span>
            {city && <span className="text-[11px] text-gray-400 flex-shrink-0">· {city}</span>}
          </div>
        )}

        {/* Weekday header */}
        <div className="grid grid-cols-7 px-5 mt-2">
          {['D','L','M','M','J','V','S'].map((d,i) => (
            <div key={i} className="text-center text-gray-400 text-[11px] font-bold uppercase pb-2">{d}</div>
          ))}
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {months.map((month, mi) => (
          <div key={mi} className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="font-extrabold text-[15px] text-[#111] capitalize">
                {format(month, 'MMMM', { locale: es })}
              </span>
              <span className="text-gray-400 text-[13px] font-semibold">{format(month, 'yyyy')}</span>
            </div>
            <MonthGrid month={month} getState={getState} onSelect={selectDay} />
          </div>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 pb-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <DateBadge label="Inicio" value={formatLabel(startDate)} active={!!startDate} />
          <div className="w-8 h-px bg-gray-300" />
          <DateBadge label="Fin" value={formatLabel(endDate)} right active={!!endDate} />
        </div>

        <button
          onClick={handleConfirm}
          disabled={!startDate || loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#E8432D] text-white rounded-2xl text-[16px] font-extrabold disabled:opacity-40 disabled:bg-gray-300 hover:opacity-90 active:scale-[.98] transition-all shadow-[0_4px_16px_rgba(232,67,45,0.3)]"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enviando solicitud...
            </>
          ) : (
            <>
              <Send size={18} strokeWidth={2.5} />
              Enviar solicitud al trabajador
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-gray-400 mt-2">
          El trabajador aceptará o rechazará tu solicitud
        </p>
      </div>
    </div>
  )
}

function MonthGrid({ month, getState, onSelect }) {
  const firstDay = getDay(startOfMonth(month))
  const days = getDaysInMonth(month)

  return (
    <div className="grid grid-cols-7 gap-y-2 gap-x-1">
      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: days }).map((_, i) => {
        const date = new Date(month.getFullYear(), month.getMonth(), i + 1)
        const isPast = isBefore(date, TODAY)
        const state = getState(date)

        return (
          <div key={i} className="relative aspect-square flex items-center justify-center">
            {state === 'range' && (
              <div className="absolute inset-y-0 -inset-x-1 bg-[#FFF4F2] z-0" />
            )}
            {(state === 'start' && !!getState(new Date(date.getTime() + 86400000)).match(/range|end/)) && (
              <div className="absolute inset-y-0 right-0 left-1/2 bg-[#FFF4F2] z-0" />
            )}
            {(state === 'end' && !!getState(new Date(date.getTime() - 86400000)).match(/range|start/)) && (
              <div className="absolute inset-y-0 left-0 right-1/2 bg-[#FFF4F2] z-0" />
            )}

            <button
              onClick={() => !isPast && onSelect(date)}
              disabled={isPast}
              className={`
                w-9 h-9 flex items-center justify-center text-[14px] font-semibold relative z-10 transition-all rounded-full
                ${isPast ? 'text-gray-300 cursor-default' : 'cursor-pointer'}
                ${state === 'start' || state === 'end' ? 'text-white bg-[#E8432D] shadow-md transform scale-105' : ''}
                ${state === 'range' ? 'text-[#E8432D] font-bold' : ''}
                ${state === 'none' && !isPast ? 'text-[#111] hover:bg-gray-100' : ''}
              `}
            >
              {i + 1}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function DateBadge({ label, value, right, active }) {
  return (
    <div className={`flex flex-col flex-1 ${right ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</span>
      <span className={`text-[13px] font-bold capitalize ${active ? 'text-[#E8432D]' : 'text-gray-400'}`}>
        {value}
      </span>
    </div>
  )
}
