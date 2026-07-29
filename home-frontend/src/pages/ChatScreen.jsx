import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useChat } from '../hooks/useChat'
import { useProjects } from '../hooks/useApi'

export default function ChatScreen() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  const { data: projects } = useProjects()
  const project = projects?.find(p => p.id === projectId)
  
  const { messages, sendMessage, loading } = useChat(projectId, user?.id)

  const isClient = user?.role === 'cliente'
  
  // Determinar el nombre de la contraparte a mostrar en el header
  let counterpartyName = 'Cargando...'
  if (project) {
    if (isClient) {
      counterpartyName = project.worker ? project.worker.name : 'Trabajador'
    } else {
      counterpartyName = project.client ? project.client.name : 'Cliente'
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Scroll automático cuando llegan nuevos mensajes
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    sendMessage(inputText)
    setInputText('')
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fb] page-enter">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100 flex-shrink-0 z-10 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-extrabold text-[16px] text-[#111] leading-tight">{counterpartyName}</h1>
          <p className="text-[12px] text-gray-400 font-medium">{project?.service?.name || 'Chat del Proyecto'}</p>
        </div>
      </div>

      {/* ── Área de Mensajes ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin mb-2 text-[#E8432D]" />
            <p className="text-[13px] font-medium">Cargando historial...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">👋</span>
            </div>
            <h3 className="font-bold text-[16px] text-[#111] mb-1">Aún no hay mensajes</h3>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              Escribe un mensaje para comenzar la conversación sobre este proyecto.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Evaluamos si el mensaje es del usuario actual.
            // Si msg.senderId es igual al id del usuario activo.
            // (En algunos casos el backend manda 'sender_id', revisamos ambos por si acaso)
            const senderId = msg.senderId || msg.sender_id
            const isMine = senderId === user?.id

            return (
              <div 
                key={msg.id || idx} 
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${isMine ? 'ml-auto' : 'mr-auto'}`}
              >
                {!isMine && msg.sender?.name && (
                  <span className="text-[10px] font-bold text-gray-400 ml-2 mb-1">
                    {msg.sender.name.split(' ')[0]}
                  </span>
                )}
                <div 
                  className={`px-4 py-3 rounded-2xl ${
                    isMine 
                      ? 'bg-gradient-to-br from-[#E8432D] to-[#f97316] text-white rounded-br-sm shadow-md shadow-[#E8432D]/20' 
                      : 'bg-white border border-gray-100 text-[#111] rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-[14px] leading-snug break-words">
                    {msg.text}
                  </p>
                </div>
                <span className={`text-[10px] font-medium text-gray-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                  {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="bg-white border-t border-gray-100 p-4 pb-safe flex-shrink-0">
        <form 
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-[#f8f9fb] rounded-full p-1.5 border border-gray-100 focus-within:border-[#E8432D] focus-within:shadow-[0_0_0_3px_rgba(232,67,45,0.1)] transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-transparent px-4 text-[14px] outline-none text-[#111]"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full bg-[#E8432D] text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50 disabled:bg-gray-300 disabled:active:scale-100"
          >
            <Send size={16} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  )
}
