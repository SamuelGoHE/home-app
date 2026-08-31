import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar as CalendarIcon, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { format, startOfMonth, getDaysInMonth, getDay, addMonths, isBefore, isEqual } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button, IconButton, Card } from '../components/ui'

/* ─── Utilidades ─────────────────────────────────────────────────── */
const TODAY = new Date()
TODAY.setHours(0,0,0,0)

export default function CalendarScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [startDate, setStartDate] = useState(null)
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
  const workerRateUnit = searchParams.get('workerRateUnit') || ''
  const workerRateAmount = searchParams.get('workerRateAmount') || ''
  const workerRateNote = searchParams.get('workerRateNote') || ''
  const hasPricing = !!workerRateUnit
  const pricingType = workerRateUnit || null
  const rateAmount = Number(workerRateAmount)
  const isFixedRate = workerRateUnit !== 'a_convenir' && Number.isFinite(rateAmount) && rateAmount > 0
  const estimatedTotal = workerRateUnit === 'por_m2' && sqMeters && isFixedRate ? rateAmount * Number(sqMeters) : (['por_dia', 'por_proyecto'].includes(workerRateUnit) && isFixedRate ? rateAmount : null)
  const modeReady = hasPricing
  const canSubmit = !!startDate && hasPricing && modeReady && !loading

  const months = useMemo(() => [TODAY, addMonths(TODAY, 1), addMonths(TODAY, 2)], [])

  // Tocar un día lo selecciona; tocar el mismo día lo deselecciona. Solo se elige fecha de inicio:
  // la duración del trabajo la define el profesional una vez revisa el trabajo.
  const selectDay = (date) => {
    setStartDate(prev => (prev && isEqual(date, prev) ? null : date))
  }

  const formatLabel = (d) => d ? format(d, "EEEE d 'de' MMMM", { locale: es }) : 'Toca un día en el calendario'

  const handleConfirm = async () => {
    if (!canSubmit) return
    if (!workerId || !serviceId) {
      toast.error('Faltan datos del servicio. Vuelve a seleccionar el trabajador.')
      navigate(-1)
      return
    }

    setLoading(true)
    try {
      await api.post('/quotes', {
        service_id: serviceId,
        worker_id: workerId,
        city,
        address,
        sq_meters: sqMeters ? parseFloat(sqMeters) : null,
        occupied,
        notes,
        start_date: format(startDate, 'yyyy-MM-dd'),
        pricing_type: pricingType,
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
    <div className="min-h-screen bg-background flex flex-col page-enter">
      {/* ── Header ── */}
      <div className="bg-surface sticky top-0 z-20 border-b border-border pb-2 shadow-sm">
        <div className="flex items-center gap-3 px-5 pt-12 pb-2">
          <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-extrabold text-ink leading-tight">¿Cuándo lo necesitas?</h2>
            <p className="text-[12px] text-muted font-medium">Selecciona la fecha de inicio del servicio</p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-soft text-brand">
            <CalendarIcon size={18} aria-hidden="true" />
          </div>
        </div>

        {/* Resumen del servicio */}
        {serviceName && serviceName !== 'Servicio' && (
          <div className="mx-5 mb-2 px-3 py-2 bg-brand-soft rounded-xl border border-orange-100 flex items-center gap-2">
            <span className="text-sm font-bold text-brand truncate">{decodeURIComponent(serviceName)}</span>
            {city && <span className="text-[11px] text-muted flex-shrink-0">· {city}</span>}
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {/* ── Modalidad de cobro y tarifa fija — arriba de todo, no hay que buscarla ── */}
        <Card padding="lg" className="mb-6">
          <h3 className="font-bold text-[15px] text-ink mb-1">¿Cómo quieres cotizar?</h3>

          {!hasPricing ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[13px] font-bold text-amber-700">Este trabajador todavía no configuró sus tarifas</p>
              <p className="text-[12px] text-amber-600 mt-1">No podrás enviar la solicitud hasta que publique un precio fijo.</p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-muted mb-4">Este es el precio fijo que el trabajador cobra — no hay que ofertar.</p>

              <div className="p-4 bg-gray-50 rounded-2xl">
                {workerRateUnit === 'a_convenir' ? (
                  <><span className="text-[12px] font-bold text-muted uppercase tracking-wide block mb-1.5">Precio a convenir</span><p className="text-[13px] font-semibold text-ink">El profesional confirmará el valor después de revisar el alcance.</p></>
                ) : (
                  <><span className="text-[12px] font-bold text-muted uppercase tracking-wide">Tarifa publicada</span><p className="text-[20px] font-black text-ink mt-1">${rateAmount.toLocaleString('es-CO')} <span className="text-[12px] text-muted">{workerRateUnit.replace('por_', 'por ')}</span></p>{estimatedTotal != null && <p className="text-[12px] font-semibold text-brand mt-2">Estimado: ${estimatedTotal.toLocaleString('es-CO')}</p>}</>
                )}
                {workerRateNote && <p className="text-[12px] text-muted mt-2">{workerRateNote}</p>}
              </div>
            </>
          )}
        </Card>

        {/* ── Calendar grid ── */}
        {months.map((month, mi) => (
          <Card padding="md" key={mi} className="mb-6">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="font-extrabold text-[15px] text-ink capitalize">
                {format(month, 'MMMM', { locale: es })}
              </span>
              <span className="text-muted text-[13px] font-semibold">{format(month, 'yyyy')}</span>
            </div>
            <div className="grid grid-cols-7 px-1 mb-1">
              {['D','L','M','M','J','V','S'].map((d,i) => (
                <div key={i} className="text-center text-muted text-[11px] font-bold uppercase pb-2">{d}</div>
              ))}
            </div>
            <MonthGrid month={month} selectedDate={startDate} onSelect={selectDay} />
          </Card>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5 pb-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-2xl border border-border">
          <div className="w-9 h-9 rounded-xl bg-brand-soft flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={16} className="text-brand" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-0.5">Fecha de inicio</span>
            <span className={`text-[14px] font-bold capitalize truncate block ${startDate ? 'text-ink' : 'text-muted'}`}>
              {formatLabel(startDate)}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          disabled={!canSubmit}
          onClick={handleConfirm}
          aria-label="Enviar solicitud al trabajador"
          className="!text-[16px]"
        >
          {loading ? 'Enviando solicitud...' : (
            <>
              <Send size={18} strokeWidth={2.5} aria-hidden="true" />
              Enviar solicitud al trabajador
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-muted mt-2">
          {hasPricing
            ? 'El trabajador aceptará o rechazará tu solicitud'
            : 'Este trabajador aún no tiene tarifas configuradas'}
        </p>
      </div>
    </div>
  )
}

function MonthGrid({ month, selectedDate, onSelect }) {
  const firstDay = getDay(startOfMonth(month))
  const days = getDaysInMonth(month)

  return (
    <div className="grid grid-cols-7 gap-y-2 gap-x-1">
      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: days }).map((_, i) => {
        const date = new Date(month.getFullYear(), month.getMonth(), i + 1)
        const isPast = isBefore(date, TODAY)
        const isSelected = selectedDate && isEqual(date, selectedDate)

        return (
          <div key={i} className="relative aspect-square flex items-center justify-center">
            <button
              onClick={() => !isPast && onSelect(date)}
              disabled={isPast}
              aria-pressed={isSelected}
              aria-label={format(date, "d 'de' MMMM", { locale: es })}
              className={`
                w-9 h-9 flex items-center justify-center text-[14px] font-semibold relative z-10 transition-all rounded-full
                ${isPast ? 'text-gray-300 cursor-default' : 'cursor-pointer'}
                ${isSelected ? 'text-white bg-brand shadow-md transform scale-105' : ''}
                ${!isSelected && !isPast ? 'text-ink hover:bg-gray-100' : ''}
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
