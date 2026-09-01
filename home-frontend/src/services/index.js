import api from './api'

// Solo authService está en uso (lo consume context/authStore.js). Los antiguos
// serviceApi/workerApi/quoteApi/projectApi eran código muerto —ningún componente
// los importaba y algunos apuntaban a rutas inexistentes (/services/search,
// /workers/popular)— así que se eliminaron. Las listas se consumen vía hooks.
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  oauthSignIn: (provider, token, profile) => api.post('/auth/oauth', { provider, token, profile }),
}
