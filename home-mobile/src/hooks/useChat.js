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
  const socketRef = useRef(null)

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
        // Unirse a la sala del proyecto
        socketRef.current.emit('join_room', projectId)
      })

      // 3. Escuchar nuevos mensajes
      socketRef.current.on('new_message', (message) => {
        setMessages((prev) => [...prev, message])
      })
    })()

    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [projectId, userId, reloadToken])

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

  return { messages, sendMessage, loading, error, refetch }
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

