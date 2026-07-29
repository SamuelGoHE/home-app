import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Mail, Phone, ChevronDown, FileText, AlertTriangle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const FAQS = [
  {
    question: '¿Cómo se realiza el pago de un servicio?',
    answer: 'El pago se realiza directamente a través de la aplicación. Para iniciar el proyecto, se requiere un abono del 20% del valor total. El saldo restante puede pagarse por partes (por ejemplo, a la mitad del trabajo) o al finalizar, pero siempre debe completarse el 100% antes de cerrar el proyecto.'
  },
  {
    question: '¿Los trabajadores están verificados?',
    answer: 'Sí, todos los trabajadores con la etiqueta "Verificado" han pasado por un proceso de validación de identidad y revisión de antecedentes por parte de nuestro equipo.'
  },
  {
    question: '¿Qué pasa si no estoy conforme con el trabajo?',
    answer: 'Puedes utilizar la opción "Reportar un problema" en el detalle del proyecto o contactarnos directamente por WhatsApp. Nuestro equipo mediará para buscar una solución justa.'
  },
  {
    question: '¿Cómo cancelo una cotización?',
    answer: 'Si la cotización aún está "en revisión", puedes cancelarla desde la sección "Mis proyectos". Si ya fue aprobada, debes contactar al soporte para anularla.'
  }
]

export default function HelpCenterPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)

  const handleAction = (message) => {
    toast.success(message, { icon: '💬', duration: 3000 })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-extrabold text-[17px] text-[#111]">Centro de ayuda</h1>
      </div>

      <div className="flex-1 px-5 pt-6 pb-12 overflow-y-auto">

        {/* ── Banner ── */}
        <div className="bg-gradient-to-br from-[#E8432D] to-[#f97316] rounded-3xl p-6 mb-8 text-white shadow-md shadow-[#E8432D]/20 text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={28} className="text-white" />
            </div>
            <h2 className="text-[20px] font-extrabold leading-tight">¿En qué podemos ayudarte?</h2>
            <p className="text-[14px] text-white/90 mt-1 font-medium">Estamos aquí para resolver tus dudas</p>
          </div>
        </div>

        {/* ── Contacto Directo ── */}
        <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
          Contacto Directo
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => handleAction('Abriendo WhatsApp...')}
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-[#E8F9F4] text-[#0F6E56] flex items-center justify-center">
              <MessageCircle size={22} />
            </div>
            <span className="font-bold text-[14px] text-[#111]">WhatsApp</span>
          </button>

          <button
            onClick={() => handleAction('Abriendo gestor de correos...')}
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
              <Mail size={22} />
            </div>
            <span className="font-bold text-[14px] text-[#111]">Correo</span>
          </button>
        </div>

        {/* ── Preguntas Frecuentes ── */}
        <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
          Preguntas Frecuentes
        </h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className="border-b border-gray-50 last:border-0">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className={`font-semibold text-[14px] pr-4 ${isOpen ? 'text-[#E8432D]' : 'text-[#111]'}`}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#E8432D]' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 animate-slide-up">
                    <p className="text-[13px] text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-xl">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Seguridad y Legal ── */}
        <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
          Seguridad y Legal
        </h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <button
            onClick={() => handleAction('Iniciando proceso de reporte...')}
            className="w-full flex items-center gap-4 px-4 py-4 border-b border-gray-50 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500 flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <span className="flex-1 text-left font-semibold text-[15px] text-[#111]">Reportar un problema</span>
          </button>

          <button
            onClick={() => handleAction('Abriendo términos y condiciones...')}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-500 flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <span className="flex-1 text-left font-semibold text-[15px] text-[#111]">Términos y Políticas</span>
          </button>
        </div>

      </div>
    </div>
  )
}
