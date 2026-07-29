import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Mail, Phone, ExternalLink, ShieldQuestion } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'

export default function WorkerSupport() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleContact = (channel) => {
    toast.success(`Conectando con soporte vía ${channel}...`, { icon: '🎧' })
  }

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
            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-500">
              <MessageCircle size={32} />
            </div>
          </div>
          <h1 className="text-xl font-black text-white">Soporte Técnico</h1>
          <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mt-1">Estamos para escucharte</p>
        </div>

        {/* ── CONTENIDO ── */}
        <div className="flex-1 px-4 -mt-10 pb-12 relative z-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 space-y-10">
            
            <div className="text-center">
              <h2 className="text-xl font-black text-[#111]">¿Tienes un inconveniente con un proyecto?</h2>
              <p className="text-sm text-gray-400 font-medium mt-2">Selecciona tu canal preferido de atención</p>
            </div>

            {/* CANALES DE CONTACTO */}
            <div className="space-y-4">
              <button 
                onClick={() => handleContact('WhatsApp')}
                className="w-full flex items-center gap-5 p-6 bg-[#E8F9F4] rounded-[32px] border border-transparent hover:border-[#0F6E56]/20 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#0F6E56] shadow-sm">
                  <MessageCircle size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-[16px] text-[#0F6E56]">WhatsApp Directo</p>
                  <p className="text-[11px] text-[#0F6E56]/60 font-bold uppercase tracking-wider">Respuesta inmediata</p>
                </div>
                <ExternalLink size={18} className="text-[#0F6E56]/40" />
              </button>

              <button 
                onClick={() => handleContact('Correo')}
                className="w-full flex items-center gap-5 p-6 bg-blue-50 rounded-[32px] border border-transparent hover:border-blue-200 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                  <Mail size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-[16px] text-blue-600">Correo Soporte</p>
                  <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">Casos administrativos</p>
                </div>
                <ExternalLink size={18} className="text-blue-200" />
              </button>

              <button 
                onClick={() => handleContact('Llamada')}
                className="w-full flex items-center gap-5 p-6 bg-orange-50 rounded-[32px] border border-transparent hover:border-orange-200 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-sm">
                  <Phone size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-[16px] text-orange-600">Llamada de Emergencia</p>
                  <p className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">Lunes a Viernes 8am - 6pm</p>
                </div>
                <ExternalLink size={18} className="text-orange-200" />
              </button>
            </div>

            {/* BOX DE AYUDA RÁPIDA */}
            <div className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-400 shadow-sm flex-shrink-0">
                <ShieldQuestion size={20} />
              </div>
              <div>
                <p className="text-[13px] font-black text-[#111]">¿Duda sobre la plataforma?</p>
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                  Antes de contactarnos, revisa el Centro de Ayuda donde resolvemos las dudas más frecuentes.
                </p>
                <button 
                  onClick={() => navigate('/worker/help')}
                  className="mt-3 text-[11px] font-black text-[#E8432D] uppercase tracking-widest hover:underline"
                >
                  Ver Preguntas Frecuentes
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
