import { useState, useEffect } from 'react'
import { X, Clock, CheckCircle2, Star, Wrench, AlertCircle, Bell, Trash2, ChevronRight, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DISMISSED_KEY = 'home-dismissed-notifications'

export function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || [] } catch { return [] }
}
function addDismissed(id) {
  const current = getDismissed()
  if (!current.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]))
  }
}

function getIcon(type, size = 18) {
  switch (type) {
    case 'quote_pending':    return <Clock size={size} className="text-amber-500" />
    case 'quote_approved':   return <CheckCircle2 size={size} className="text-emerald-500" />
    case 'quote_rejected':   return <AlertCircle size={size} className="text-red-500" />
    case 'project_active':   return <Wrench size={size} className="text-blue-500" />
    case 'project_completed':return <Star size={size} className="text-[#E8432D]" />
    default:                 return <Bell size={size} className="text-gray-500" />
  }
}

function getIconBg(type) {
  switch (type) {
    case 'quote_pending':    return 'bg-amber-50'
    case 'quote_approved':   return 'bg-emerald-50'
    case 'quote_rejected':   return 'bg-red-50'
    case 'project_active':   return 'bg-blue-50'
    case 'project_completed':return 'bg-[#fff4f2]'
    default:                 return 'bg-gray-50'
  }
}

export function NotificationsPanel({ isOpen, onClose, notifications }) {
  const navigate = useNavigate()

  // IDs de notificaciones descartadas
  const [dismissed, setDismissed] = useState(getDismissed)
  // Notificación actualmente expandida/detalle
  const [selected, setSelected] = useState(null)
  // Notificaciones marcadas como leídas en esta sesión
  const [readIds, setReadIds] = useState([])

  useEffect(() => {
    if (isOpen) {
      setDismissed(getDismissed())
      setSelected(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filtrar descartadas
  const visible = notifications.filter(n => !dismissed.includes(n.id))

  const dismiss = (id, e) => {
    e?.stopPropagation()
    addDismissed(id)
    setDismissed(getDismissed())
    if (selected?.id === id) setSelected(null)
  }

  const openDetail = (notif) => {
    setSelected(notif)
    // Marcarla como leída
    if (!readIds.includes(notif.id)) {
      setReadIds(prev => [...prev, notif.id])
    }
  }

  const isRead = (notif) => notif.read || readIds.includes(notif.id)

  /* ── Vista detalle ──────────────────────────────────────────── */
  const DetailView = ({ notif }) => (
    <div className="flex flex-col h-full">
      {/* Header detalle */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => setSelected(null)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="font-extrabold text-[16px] text-[#111] flex-1">Detalle</h3>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Contenido del detalle */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Icono grande */}
        <div className={`w-16 h-16 rounded-3xl ${getIconBg(notif.type)} flex items-center justify-center mx-auto mb-5 shadow-sm`}>
          {getIcon(notif.type, 28)}
        </div>

        <h2 className="text-[20px] font-extrabold text-[#111] text-center leading-tight mb-2">
          {notif.title}
        </h2>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-5">
          {notif.message}
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-1">Fecha</p>
          <p className="text-[14px] font-semibold text-[#111]">{notif.time}</p>
        </div>

        {/* Acción si tiene path útil (ej. proyecto) */}
        {notif.path && notif.path !== '/home' && (
          <button
            onClick={() => { onClose(); navigate(notif.path) }}
            className="w-full py-3.5 bg-[#E8432D] text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mb-3 shadow-md shadow-[#E8432D]/25 active:scale-[.98] transition-all"
          >
            Ver detalle
            <ChevronRight size={16} />
          </button>
        )}

        {/* Botón eliminar */}
        <button
          onClick={() => dismiss(notif.id)}
          className="w-full py-3.5 bg-red-50 text-red-500 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 border border-red-100 active:scale-[.98] transition-all"
        >
          <Trash2 size={16} />
          Eliminar notificación
        </button>
      </div>
    </div>
  )

  /* ── Vista lista ────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={selected ? () => setSelected(null) : onClose}
      />

      {/* Panel */}
      <div className="w-[85%] max-w-[380px] h-full bg-white shadow-2xl relative z-10 flex flex-col">

        {selected ? (
          <DetailView notif={selected} />
        ) : (
          <>
            {/* Header lista */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-[20px] font-extrabold text-[#111] leading-tight">Notificaciones</h2>
                <p className="text-[13px] text-gray-400 font-medium mt-0.5">Novedades de tus servicios</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-4">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Bell size={24} className="text-gray-400" />
                  </div>
                  <p className="text-[16px] font-bold text-gray-800">Todo está al día</p>
                  <p className="text-[14px] text-gray-500 mt-1 max-w-[200px]">
                    No tienes nuevas notificaciones por el momento.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {visible.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => openDetail(notif)}
                      className="bg-white rounded-2xl p-4 flex gap-3 cursor-pointer active:scale-[.98] transition-all border border-gray-100 shadow-sm relative group"
                    >
                      {/* Icono */}
                      <div className={`w-10 h-10 rounded-full ${getIconBg(notif.type)} flex items-center justify-center flex-shrink-0`}>
                        {getIcon(notif.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-[14px] font-bold text-[#111] leading-tight mb-0.5">{notif.title}</h4>
                        <p className="text-[12px] text-gray-500 leading-snug line-clamp-2">{notif.message}</p>
                        <span className="text-[11px] font-bold text-gray-400 mt-1.5 block">{notif.time}</span>
                      </div>

                      {/* Punto no leído / botón descartar */}
                      <div className="flex flex-col items-end justify-between flex-shrink-0">
                        {!isRead(notif) && (
                          <div className="w-2 h-2 rounded-full bg-[#E8432D]" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => dismiss(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                          title="Descartar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
