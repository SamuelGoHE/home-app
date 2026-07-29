import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, MessageCircle, Mail, ChevronDown, 
  AlertTriangle, ShieldCheck, HelpCircle, Star 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'

const FAQS = [
  {
    question: '¿Cómo recibo mis pagos?',
    answer: 'Los pagos se procesan de forma segura. El cliente realiza un abono inicial y el saldo se libera a medida que completas las tareas del proyecto.'
  },
  {
    question: '¿Cómo puedo mejorar mi calificación?',
    answer: 'La clave es la puntualidad y la comunicación. Mantén tus tareas actualizadas y responde los chats de tus clientes con rapidez.'
  },
  {
    question: '¿Qué hago si un cliente no responde?',
    answer: 'Si tienes un proyecto activo y el cliente no responde en 48h, puedes usar la opción de "Soporte" para que nuestro equipo medie en la situación.'
  },
  {
    question: '¿Puedo trabajar en varias ciudades?',
    answer: 'Sí, puedes editar las ciudades de cobertura en tu perfil personal para recibir solicitudes de diferentes zonas.'
  }
]

export default function WorkerHelp() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-x-hidden font-outfit">
      <div className="w-full max-w-[480px] bg-[#f8f9fb] min-h-screen shadow-2xl relative flex flex-col animate-fade-in">
        
        {/* ── HEADER ROJO ── */}
        <div className="bg-[#E8432D] pt-16 pb-24 px-6 text-center relative">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-12 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-20 h-20 bg-white rounded-[28px] mx-auto shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20 mb-4">
            <div className="w-full h-full bg-orange-50 flex items-center justify-center text-[#E8432D]">
              <HelpCircle size={32} />
            </div>
          </div>
          <h1 className="text-xl font-black text-white">Centro de Ayuda</h1>
          <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mt-1">Estamos para apoyarte</p>
        </div>

        {/* ── CONTENIDO ── */}
        <div className="flex-1 px-4 -mt-10 pb-12 relative z-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 space-y-8">
            
            {/* BANNER DE BIENVENIDA */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[32px] p-6 text-white relative overflow-hidden">
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
               <h2 className="text-[17px] font-black leading-tight">¿Tienes alguna duda profesional?</h2>
               <p className="text-[12px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Revisa nuestras guías rápidas</p>
            </div>

            {/* PREGUNTAS FRECUENTES */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Preguntas Frecuentes</p>
              <div className="bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx
                  return (
                    <div key={idx} className="border-b border-gray-100 last:border-0">
                      <button 
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-5 flex items-center justify-between text-left transition-colors"
                      >
                        <span className={`text-[14px] font-black pr-4 ${isOpen ? 'text-[#E8432D]' : 'text-[#111]'}`}>
                          {faq.question}
                        </span>
                        <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180 text-[#E8432D]' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 animate-fade-in">
                          <p className="text-[13px] text-gray-500 font-medium leading-relaxed bg-white p-4 rounded-2xl border border-gray-100">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SECCIÓN LEGAL */}
            <div>
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.15em] px-2 mb-4">Legal y Seguridad</p>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-sm">
                    <AlertTriangle size={18} />
                  </div>
                  <span className="font-black text-[14px] text-[#111]">Reportar un incidente</span>
                </button>
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="font-black text-[14px] text-[#111]">Términos de servicio</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
