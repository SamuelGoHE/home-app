import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authService } from '../services'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      needsWorkerOnboarding: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authService.login({ email, password })
          const { user, accessToken, refreshToken } = data.data
          await AsyncStorage.setItem('accessToken', accessToken)
          await AsyncStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
          return { success: true, role: user.role }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || 'Error al iniciar sesión' }
        }
      },

      loginWithOAuth: async (provider, token, profile = {}) => {
        set({ isLoading: true })
        try {
          const { data } = await authService.oauthSignIn(provider, token, profile)
          const { user, accessToken, refreshToken } = data.data
          await AsyncStorage.setItem('accessToken', accessToken)
          await AsyncStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
          return { success: true, role: user.role }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || `Error al iniciar sesión con ${provider}` }
        }
      },

      register: async (formData) => {
        set({ isLoading: true })
        try {
          const { data } = await authService.register(formData)
          const { user, accessToken, refreshToken } = data.data
          await AsyncStorage.setItem('accessToken', accessToken)
          await AsyncStorage.setItem('refreshToken', refreshToken)
          set({
            user, accessToken, refreshToken,
            isAuthenticated: true, isLoading: false,
            // Los trabajadores nuevos configuran su perfil profesional antes de entrar
            needsWorkerOnboarding: user.role === 'trabajador',
          })
          return { success: true, role: user.role }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || 'Error al registrarse' }
        }
      },

      completeWorkerOnboarding: () => set({ needsWorkerOnboarding: false }),

      logout: async () => {
        const { refreshToken } = get()
        try { await authService.logout(refreshToken) } catch {}
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, needsWorkerOnboarding: false })
      },

      fetchMe: async () => {
        try {
          const { data } = await authService.getMe()
          set({ user: data.data.user })
        } catch { get().logout() }
      },
    }),
    {
      name: 'home-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
        needsWorkerOnboarding: s.needsWorkerOnboarding,
      }),
    }
  )
)