import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'

/* ─── Logo SVG ───────────────────────────────────────────────────── */
const Logo = () => (
  <div className="flex items-center gap-2 mb-8">
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <rect width="40" height="40" rx="12" fill="#E8432D" />
      <path d="M8 30 L16 16 L24 24 L32 10" stroke="white" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="text-2xl font-extrabold text-[#111] tracking-tight">HOME</span>
  </div>
)

/* ─── Iconos de proveedores ──────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
)

const AppleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#111">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#E8432D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
)

/* ─── Botón social reutilizable ──────────────────────────────────── */
function SocialBtn({ icon, label, onClick, loading, disabled }) {
  return (
    <button
      id={`btn-oauth-${label.replace(/\s+/g, '-').toLowerCase()}`}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white
                 text-[15px] font-semibold text-[#111] shadow-sm
                 hover:border-gray-300 hover:shadow-md active:scale-[.98]
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-all duration-200 relative"
    >
      {loading ? (
        <span className="w-5 h-5 flex-shrink-0 border-2 border-gray-300 border-t-[#E8432D] rounded-full animate-spin" />
      ) : icon}
      <span>{loading ? 'Conectando...' : label}</span>
    </button>
  )
}

/* ─── WelcomeScreen ──────────────────────────────────────────────── */
export default function WelcomeScreen() {
  const navigate = useNavigate()
  const { loginWithOAuth } = useAuthStore()
  const [loadingProvider, setLoadingProvider] = useState(null)

  const handleOAuthSuccess = async (provider, token, profile) => {
    const result = await loginWithOAuth(provider, token, profile)
    setLoadingProvider(null)
    if (result.success) {
      toast.success(`¡Bienvenido con ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`)
      if (result.role === 'admin') navigate('/admin')
      else if (result.role === 'trabajador') navigate('/worker')
      else navigate('/home')
    } else {
      toast.error(result.message || `Error al iniciar sesión con ${provider}`)
    }
  }

  /* ── Google ── */
  const handleGoogle = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setLoadingProvider('google')
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await res.json()
        await handleOAuthSuccess('google', tokenResponse.id_token || tokenResponse.access_token, {
          providerId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
        })
      } catch {
        setLoadingProvider(null)
        toast.error('No se pudo obtener tu perfil de Google')
      }
    },
    onError: () => {
      setLoadingProvider(null)
      toast.error('Inicio de sesión con Google cancelado')
    },
    flow: 'implicit',
  })

  /* ── Facebook ── */
  const handleFacebook = () => {
    if (!window.FB) {
      toast.error('Facebook SDK no disponible. Verifica tu FACEBOOK_APP_ID en .env')
      return
    }
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          setLoadingProvider('facebook')
          handleOAuthSuccess('facebook', response.authResponse.accessToken, {})
        } else {
          toast.error('Inicio de sesión con Facebook cancelado')
        }
      },
      { scope: 'email,public_profile' }
    )
  }

  /* ── Apple ── */
  const handleApple = () => {
    if (!window.AppleID) {
      toast.error('Apple Sign In no disponible en localhost. Requiere dominio HTTPS.')
      return
    }
    window.AppleID.auth.signIn()
      .then((response) => {
        setLoadingProvider('apple')
        const { id_token, user: appleUser } = response.authorization
        const profile = {
          providerId: appleUser?.email || id_token.split('.')[1],
          email: appleUser?.email || null,
          name: appleUser ? `${appleUser.name?.firstName || ''} ${appleUser.name?.lastName || ''}`.trim() : 'Usuario Apple',
        }
        handleOAuthSuccess('apple', id_token, profile)
      })
      .catch(() => toast.error('Inicio de sesión con Apple cancelado'))
  }

  const anyLoading = loadingProvider !== null

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fff6f4] to-white page-enter">
      {/* ─ Hero ─ */}
      <div className="flex-1 px-7 pt-16 flex flex-col items-center">
        <Logo />

        <h1 className="text-[28px] font-extrabold text-[#111] text-center mb-3 leading-tight">
          Gestiona tu hogar<br />
          <span className="text-[#E8432D]">como un profesional</span>
        </h1>
        <p className="text-[14px] text-gray-500 text-center mb-10 leading-relaxed max-w-xs">
          Cotizaciones, proyectos y trabajadores del hogar en un solo lugar.
          Crea tu cuenta gratis en segundos.
        </p>

        {/* ─ Botones OAuth ─ */}
        <div className="w-full flex flex-col gap-3">
          <SocialBtn
            icon={<GoogleIcon />}
            label="Continuar con Google"
            onClick={handleGoogle}
            loading={loadingProvider === 'google'}
            disabled={anyLoading}
          />
          <SocialBtn
            icon={<FacebookIcon />}
            label="Continuar con Facebook"
            onClick={handleFacebook}
            loading={loadingProvider === 'facebook'}
            disabled={anyLoading}
          />
          <SocialBtn
            icon={<AppleIcon />}
            label="Continuar con Apple"
            onClick={handleApple}
            loading={loadingProvider === 'apple'}
            disabled={anyLoading}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <SocialBtn
            icon={<EmailIcon />}
            label="Continuar con correo"
            onClick={() => navigate('/register')}
            disabled={anyLoading}
          />
        </div>

        <button
          onClick={() => navigate('/home')}
          disabled={anyLoading}
          className="mt-6 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
          Explorar sin cuenta →
        </button>
      </div>

      {/* ─ Footer ─ */}
      <div className="px-7 pb-10 flex flex-col items-center gap-2">
        <div className="flex gap-1 text-sm text-gray-500">
          <span>¿Ya tienes cuenta?</span>
          <button
            onClick={() => navigate('/login')}
            disabled={anyLoading}
            className="font-bold text-[#E8432D] hover:underline disabled:opacity-40"
          >
            Inicia sesión
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center max-w-xs leading-relaxed">
          Al continuar aceptas nuestros{' '}
          <span className="underline cursor-pointer">Términos de uso</span> y{' '}
          <span className="underline cursor-pointer">Política de privacidad</span>
        </p>
      </div>
    </div>
  )
}
