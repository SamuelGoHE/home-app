import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useEffect } from 'react'
import { AppShell, ProtectedRoute } from './components/layout'
import { useAuthStore } from './context/authStore'
import LangScreen from './pages/LangScreen'
import WelcomeScreen from './pages/WelcomeScreen'
import { LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import HomeScreen from './pages/HomeScreen'
import ServicesScreen from './pages/ServicesScreen'
import QuoteScreen from './pages/QuoteScreen'
import CalendarScreen from './pages/CalendarScreen'
import ResultsScreen from './pages/ResultsScreen'
import ProfilePage from './pages/ProfilePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import FavoritesPage from './pages/FavoritesPage'
import WorkerDashboard from './pages/WorkerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import RatingScreen from './pages/RatingScreen'
import WorkerProfileScreen from './pages/WorkerProfileScreen'
import WorkerDetailPage from './pages/WorkerDetailPage'
import WorkerProfileEdit from './pages/WorkerProfileEdit'
import MyRatingsPage from './pages/MyRatingsPage'
import SettingsPage from './pages/SettingsPage'
import HelpCenterPage from './pages/HelpCenterPage'
import SecurityPage from './pages/SecurityPage'
import ProfileEditPage from './pages/ProfileEditPage'
import ChatScreen from './pages/ChatScreen'
import WorkerSecurity from './pages/WorkerSecurity'
import WorkerHelp from './pages/WorkerHelp'
import WorkerSupport from './pages/WorkerSupport'
import WorkerSettings from './pages/WorkerSettings'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || ''

/** Carga el SDK de Facebook de forma asíncrona */
function loadFacebookSDK(appId) {
  if (!appId || appId === 'TU_FACEBOOK_APP_ID_AQUI') return
  window.fbAsyncInit = function () {
    window.FB.init({ appId, cookie: true, xfbml: true, version: 'v19.0' })
  }
  const script = document.createElement('script')
  script.src = 'https://connect.facebook.net/es_LA/sdk.js'
  script.async = true
  script.defer = true
  document.body.appendChild(script)
}

function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/welcome" replace />
  if (user?.role === 'admin' || user?.role === 'admin_finanzas') return <Navigate to="/admin" replace />
  if (user?.role === 'trabajador') return <Navigate to="/worker" replace />
  return <HomeScreen />
}

/** Evita que usuarios ya logueados vean login/welcome */
function AuthGuard({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <RoleRedirect />
  return children
}

export default function App() {
  useEffect(() => {
    loadFacebookSDK(FB_APP_ID)
  }, [])

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Outfit, sans-serif', fontWeight: 600 } }} />
        <Routes>
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<AppShell />}>
            <Route path="/lang" element={<LangScreen />} />
            <Route path="/welcome" element={<AuthGuard><WelcomeScreen /></AuthGuard>} />
            <Route path="/login" element={<AuthGuard><LoginPage /></AuthGuard>} />
            <Route path="/register" element={<AuthGuard><RegisterPage /></AuthGuard>} />
            <Route path="/reset-password" element={<AuthGuard><ResetPasswordPage /></AuthGuard>} />
            <Route path="/services" element={<ServicesScreen />} />
            <Route path="/quote" element={<QuoteScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/results" element={<ResultsScreen />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<RoleRedirect />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/chat/:projectId" element={<ChatScreen />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/rate" element={<RatingScreen />} />
              <Route path="/worker/:id" element={<WorkerDetailPage />} />
              <Route path="/worker-profile/:id" element={<WorkerProfileScreen />} />
              <Route path="/ratings/my" element={<MyRatingsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/security" element={<SecurityPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'admin_finanzas']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['trabajador']} />}>
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="/worker/profile/edit" element={<WorkerProfileEdit />} />
            <Route path="/worker/security" element={<WorkerSecurity />} />
            <Route path="/worker/help" element={<WorkerHelp />} />
            <Route path="/worker/support" element={<WorkerSupport />} />
            <Route path="/worker/settings" element={<WorkerSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}