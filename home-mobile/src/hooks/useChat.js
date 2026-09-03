import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../services/api'
import { SOCKET_URL } from '../utils/apiUrl'

export function useChat(projectId, userId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [connected, setConnected] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const socketRef = useRef(null)
  const hasConnectedRef = useRef(false)   // distingue primera conexión de reconexión
  const incomingTypingRef = useRef(null)  // timeout de auto-limpieza del "escribiendo…" entrante
  const outgoingTypingRef = useRef(null)  // timeout para emitir stop_typing propio

  const refetch = () => setReloadToken((n) => n + 1)

  useEffect(() => {
    if (!projectId || !userId) return

    // 1. Cargar historial
    const fetchHistory = async () => {
      try {
        setLoading(true)
        setError(null)
        // Usamos la instancia de axios configurada en la aplicación
        const res = await api.get(`/messages/${projectId}`)

        // Asumiendo que el backend retorna { success: true, data: [...] }
        if (res.data.success) {
          setMessages(res.data.data)
        } else {
          setError(res.data.message)
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()

    // 2. Conectar Socket (autenticado con el access token)
    let cancelled = false
    ;(async () => {
      const token = await AsyncStorage.getItem('accessToken')
      if (cancelled) return

      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        auth: { token },
      })

      socketRef.current.on('connect', () => {
        setConnected(true)
        // Unirse a la sala del proyecto
        socketRef.current.emit('join_room', projectId)
        // Al entrar, marcar como leídos los mensajes ya recibidos de la contraparte
        socketRef.current.emit('mark_read', projectId)
        // Si es una RE-conexión, recuperar los mensajes que llegaron mientras
        // estábamos offline (el socket no los entregó estando caído).
        if (hasConnectedRef.current) fetchHistory()
        hasConnectedRef.current = true
      })

      socketRef.current.on('disconnect', () => {
        setConnected(false)
        setOtherTyping(false)
      })

      // 3. Escuchar nuevos mensajes
      socketRef.current.on('new_message', (message) => {
        setMessages((prev) => [...prev, message])
        // Si el mensaje llega de la contraparte y tengo el chat abierto,
        // lo marco leído de inmediato (dispara su "visto" en tiempo real).
        const senderId = message.senderId || message.sender_id
        if (String(senderId) !== String(userId)) {
          socketRef.current.emit('mark_read', projectId)
        }
      })

      // 4. Recibo de lectura: la contraparte leyó mis mensajes → mostrar ✓✓
      socketRef.current.on('messages_read', ({ readerId }) => {
        if (String(readerId) === String(userId)) return // el lector fui yo
        setMessages((prev) =>
          prev.map((m) => {
            const senderId = m.senderId || m.sender_id
            return String(senderId) === String(userId) ? { ...m, read: true } : m
          })
        )
      })

      // 5. Indicador "escribiendo…" de la contraparte. El auto-clear cubre el
      // caso de que el stop_typing se pierda (p. ej. si el otro se desconecta).
      socketRef.current.on('user_typing', () => {
        setOtherTyping(true)
        clearTimeout(incomingTypingRef.current)
        incomingTypingRef.current = setTimeout(() => setOtherTyping(false), 4000)
      })
      socketRef.current.on('user_stop_typing', () => {
        clearTimeout(incomingTypingRef.current)
        setOtherTyping(false)
      })
    })()

    return () => {
      cancelled = true
      clearTimeout(incomingTypingRef.current)
      clearTimeout(outgoingTypingRef.current)
      hasConnectedRef.current = false
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [projectId, userId, reloadToken])

  // Devuelve true si el mensaje se envió; false si no hay conexión (así la
  // pantalla puede conservar el texto y avisar, en vez de perderlo en silencio).
  const sendMessage = (text) => {
    if (!text.trim()) return false
    if (!socketRef.current?.connected) return false

    socketRef.current.emit('send_message', {
      roomId: projectId,
      senderId: userId,
      text,
    })
    // Al enviar, dejo de "escribir" de inmediato.
    clearTimeout(outgoingTypingRef.current)
    socketRef.current.emit('stop_typing', projectId)
    return true
  }

  // Notifica que estoy escribiendo; reprograma el stop_typing tras la inactividad.
  const notifyTyping = () => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('typing', projectId)
    clearTimeout(outgoingTypingRef.current)
    outgoingTypingRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', projectId)
    }, 2000)
  }

  return { messages, sendMessage, notifyTyping, loading, error, refetch, connected, otherTyping }
}

/**
 * Hook para obtener una instancia de socket persistente sin contexto de chat.
 * Útil para componentes que necesitan escuchar eventos en tiempo real
 * (ej: WorkerDashboard recibiendo notificaciones de nuevas solicitudes).
 */
export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await AsyncStorage.getItem('accessToken')
      if (cancelled) return
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        auth: { token },
      })
    })()
    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // Retornar el ref para que el componente acceda a .current actualizado
  return socketRef
}

