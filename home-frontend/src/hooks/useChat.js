import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../services/api'

// Utilizamos la misma URL base que useApi, pero solo el host para Socket.io
const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:3000'

export function useChat(projectId, userId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!projectId || !userId) return

    // 1. Cargar historial
    const fetchHistory = async () => {
      try {
        setLoading(true)
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
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      auth: { token: localStorage.getItem('accessToken') },
    })

    socketRef.current.on('connect', () => {
      // Unirse a la sala del proyecto
      socketRef.current.emit('join_room', projectId)
    })

    // 3. Escuchar nuevos mensajes
    socketRef.current.on('new_message', (message) => {
      setMessages((prev) => [...prev, message])
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [projectId, userId])

  const sendMessage = (text) => {
    if (!socketRef.current || !text.trim()) return

    const messageData = {
      roomId: projectId,
      senderId: userId,
      text: text
    }

    // Emitir el evento al servidor
    socketRef.current.emit('send_message', messageData)
  }

  return { messages, sendMessage, loading, error }
}

/**
 * Hook para obtener una instancia de socket persistente sin contexto de chat.
 * Útil para componentes que necesitan escuchar eventos en tiempo real
 * (ej: WorkerDashboard recibiendo notificaciones de nuevas solicitudes).
 */
export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      auth: { token: localStorage.getItem('accessToken') },
    })
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // Retornar el ref para que el componente acceda a .current actualizado
  return socketRef
}

