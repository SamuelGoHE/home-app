import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../services'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authService.login({ email, password })
          const { user, accessToken, refreshToken } = data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
          return { success: true, role: user.role }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || 'Error al iniciar sesión' }
        }
      },

      /**
       * Login / registro con proveedor OAuth (google, facebook, apple).
       * @param {'google'|'facebook'|'apple'} provider
       * @param {string} token  - ID Token (Google) o Access Token (Facebook)
       * @param {object} [profile] - Perfil extra (solo Apple: { providerId, email, name })
       */
      loginWithOAuth: async (provider, token, profile = {}) => {
        set({ isLoading: true })
        try {
          const { data } = await authService.oauthSignIn(provider, token, profile)
          const { user, accessToken, refreshToken } = data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
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
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
          return { success: true, role: user.role }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || 'Error al registrarse' }
        }
      },

      logout: async () => {
        try { await authService.logout() } catch {}
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
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
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)