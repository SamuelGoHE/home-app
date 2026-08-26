import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useChat } from '../hooks/useChat'
import { useProjects } from '../hooks/useApi'
import { EmptyState } from '../components/common'
import { IconButton, LoadingState } from '../components/ui'

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
    <div className="flex flex-col h-screen bg-background page-enter">
      {/* ── Header ── */}
      <div className="bg-surface px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border flex-shrink-0 z-10 shadow-sm">
        <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
        <div>
          <h1 className="font-extrabold text-[16px] text-ink leading-tight">{counterpartyName}</h1>
          <p className="text-[12px] text-muted font-medium">{project?.service?.name || 'Chat del Proyecto'}</p>
        </div>
      </div>

      {/* ── Área de Mensajes ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-4">
        {loading ? (
          <LoadingState message="Cargando historial..." className="h-full" />
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon="👋"
              title="Aún no hay mensajes"
              subtitle="Escribe un mensaje para comenzar la conversación sobre este proyecto."
            />
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
                  <span className="text-[10px] font-bold text-muted ml-2 mb-1">
                    {msg.sender.name.split(' ')[0]}
                  </span>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    isMine
                      ? 'bg-brand text-white rounded-br-sm shadow-md shadow-brand/20'
                      : 'bg-surface border border-border text-ink rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-[14px] leading-snug break-words">
                    {msg.text}
                  </p>
                </div>
                <span className={`text-[10px] font-medium text-muted mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                  {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="bg-surface border-t border-border p-4 pb-safe flex-shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-background rounded-full p-1.5 border border-border focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(232,67,45,0.1)] transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-transparent px-4 text-[14px] outline-none text-ink"
          />
          <IconButton
            icon={Send}
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Enviar mensaje"
            variant="solid"
            className="!bg-brand !border-brand !text-white"
          />
        </form>
      </div>
    </div>
  )
}
