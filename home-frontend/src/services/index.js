import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  oauthSignIn: (provider, token, profile) => api.post('/auth/oauth', { provider, token, profile }),
}

export const serviceApi = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  search: (params) => api.get('/services/search', { params }),
}

export const workerApi = {
  getAll: (params) => api.get('/workers', { params }),
  getById: (id) => api.get(`/workers/${id}`),
  getPopular: () => api.get('/workers/popular'),
}

export const quoteApi = {
  create: (data) => api.post('/quotes', data),
  getMyQuotes: () => api.get('/quotes/me'),
  getById: (id) => api.get(`/quotes/${id}`),
}

export const projectApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  updateTask: (taskId, data) => api.patch(`/tasks/${taskId}`, data),
}
