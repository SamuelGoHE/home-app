import { useState, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone, CheckCircle2, XCircle, Briefcase, Home, ChevronDown, MapPin } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'
import { authService } from '../services'

/* ─── Icono Google inline ─────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

/* ─── Campo de entrada con ícono ──────────────────────────────────── */
function InputField({ icon: Icon, type = 'text', placeholder, value, onChange, autoComplete, required, rightEl, error }) {
  return (
    <div>
      <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3.5 bg-white transition-all duration-200
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-100 focus-within:border-[#E8432D] focus-within:shadow-[0_0_0_3px_rgba(232,67,45,0.1)]'}`}>
        <Icon size={17} className={`flex-shrink-0 ${error ? 'text-red-400' : 'text-gray-400'}`} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          className="flex-1 text-[15px] font-medium text-[#111] placeholder-gray-400 outline-none bg-transparent"
        />
        {rightEl}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">{error}</p>}
    </div>
  )
}

/* ─── Indicador de fortaleza de contraseña ────────────────────────── */
function PasswordStrength({ password }) {
  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
  }), [password])

  const passed = Object.values(checks).filter(Boolean).length
  const strength = passed <= 1 ? 'Muy débil' : passed === 2 ? 'Débil' : passed === 3 ? 'Buena' : 'Fuerte'
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  if (!password) return null

  return (
    <div className="mt-2 px-1">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= passed ? colors[passed] : '#e5e7eb' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: colors[passed] }}>{strength}</span>
        <div className="flex gap-3">
          {[['8+ chars', checks.length], ['A-Z', checks.upper], ['a-z', checks.lower], ['0-9', checks.number]].map(([label, ok]) => (
            <span key={label} className={`text-[10px] font-medium flex items-center gap-0.5 ${ok ? 'text-green-500' : 'text-gray-400'}`}>
              {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Modal "Olvidé mi contraseña" ───────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Ingresa un correo válido')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await authService.forgotPassword(email)
      setResetToken(data?.resetToken || null)
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slide-up">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-[#111] mb-2">¡Correo enviado!</h3>
            <p className="text-sm text-gray-500 mb-6">
              Si <span className="font-semibold text-[#111]">{email}</span> está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
            {resetToken && (
              <div className="mb-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 border border-gray-200">
                <p className="font-medium text-gray-800 mb-2">En desarrollo puedes usar este enlace directo:</p>
                <a href={`/reset-password?token=${resetToken}`} className="break-all text-[#E8432D] underline">
                  {`/reset-password?token=${resetToken}`}
                </a>
              </div>
            )}
            <button onClick={onClose}
              className="w-full py-3.5 bg-[#E8432D] text-white rounded-full font-bold text-[15px]">
              Entendido
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#111]">Recuperar contraseña</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg font-bold">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-5">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3.5 bg-white transition-all duration-200
                ${error ? 'border-red-400 bg-red-50' : 'border-gray-100 focus-within:border-[#E8432D]'}`}>
                <Mail size={17} className={`text-gray-400 flex-shrink-0 ${error ? 'text-red-400' : ''}`} />
                <input type="email" placeholder="Tu correo electrónico" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="flex-1 text-[15px] font-medium text-[#111] placeholder-gray-400 outline-none bg-transparent" />
              </div>
              {error && <p className="text-xs text-red-500 ml-1 font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#E8432D] text-white rounded-full font-bold text-[15px] disabled:opacity-50 mt-1">
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════ */
function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const token = new URLSearchParams(location.search).get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('Token de recuperación inválido')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('La contraseña debe contener mayúscula, minúscula y número')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff6f4] to-white flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-center">
          <h2 className="text-2xl font-bold text-[#111] mb-4">Contraseña actualizada</h2>
          <p className="text-gray-500 mb-8">Tu contraseña se actualizó correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.</p>
          <button onClick={() => navigate('/login')} className="w-full py-3.5 bg-[#E8432D] text-white rounded-full font-bold text-[15px]">
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff6f4] to-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#111]">Restablecer contraseña</h2>
          <button onClick={() => navigate('/login')} className="text-gray-500 hover:text-gray-700">Cancelar</button>
        </div>
        <p className="text-sm text-gray-500 mb-6">Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField icon={Lock} type="password" placeholder="Nueva contraseña" value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
          <InputField icon={Lock} type="password" placeholder="Repite la nueva contraseña" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#E8432D] text-white rounded-full font-bold text-[15px] disabled:opacity-50">
            {loading ? 'Guardando...' : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, loginWithOAuth, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const redirectByRole = (role) => {
    if (role === 'admin') navigate('/admin', { replace: true })
    else if (role === 'trabajador') navigate('/worker', { replace: true })
    else navigate('/home', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(form.email, form.password)
    if (result.success) {
      toast.success('¡Bienvenido de vuelta!')
      redirectByRole(result.role)
    } else {
      toast.error(result.message)
    }
  }

  const handleGoogle = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await res.json()
        const result = await loginWithOAuth('google', tokenResponse.id_token || tokenResponse.access_token, {
          providerId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
        })
        if (result.success) {
          toast.success('¡Bienvenido!')
          redirectByRole(result.role)
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('Error al conectar con Google')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('Inicio con Google cancelado'),
    flow: 'implicit',
  })

  const busy = isLoading || googleLoading

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff6f4] to-white flex flex-col page-enter">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex items-center gap-3">
        <button id="btn-login-back" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Título */}
      <div className="px-7 pb-7">
        <h1 className="text-[28px] font-extrabold text-[#111] leading-tight">
          Bienvenido<br /><span className="text-[#E8432D]">de vuelta</span>
        </h1>
        <p className="text-[14px] text-gray-500 mt-1.5">Ingresa con tu cuenta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-7 flex flex-col gap-4">
        {/* Acceso rápido con Google */}
        <button id="btn-login-google" type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-gray-100 bg-white shadow-sm
                     text-[14px] font-semibold text-[#111] hover:border-gray-300 active:scale-[.98] disabled:opacity-50 transition-all">
          {googleLoading
            ? <span className="w-4 h-4 border-2 border-gray-300 border-t-[#E8432D] rounded-full animate-spin" />
            : <GoogleIcon />}
          Continuar con Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">o con tu correo</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email */}
        <InputField
          icon={Mail}
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={set('email')}
          autoComplete="email"
          required
        />

        {/* Password */}
        <InputField
          icon={Lock}
          type={showPw ? 'text' : 'password'}
          placeholder="Contraseña"
          value={form.password}
          onChange={set('password')}
          autoComplete="current-password"
          required
          rightEl={
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />

        {/* Olvidé contraseña */}
        <button id="btn-forgot-password" type="button"
          onClick={() => setShowForgot(true)}
          className="text-right text-[13px] font-semibold text-[#E8432D] hover:underline -mt-1">
          ¿Olvidaste tu contraseña?
        </button>

        {/* Submit */}
        <button id="btn-login-submit" type="submit" disabled={busy}
          className="w-full py-4 bg-[#E8432D] text-white rounded-full font-bold text-[16px] disabled:opacity-50
                     hover:bg-[#c93820] active:scale-[.98] transition-all shadow-[0_4px_16px_rgba(232,67,45,0.35)]">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Ingresando...
            </span>
          ) : 'Ingresar'}
        </button>

        {/* Registro */}
        <p className="text-center text-[14px] text-gray-500 pb-8">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#E8432D] font-bold hover:underline">Regístrate gratis</Link>
        </p>
      </form>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   REGISTER PAGE
══════════════════════════════════════════════════════════════════ */
export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'cliente', city: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, loginWithOAuth, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'El nombre debe tener al menos 2 caracteres'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Ingresa un correo válido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Necesita mayúscula, minúscula y número'
    if (form.phone && !/^\+?[\d\s\-]{7,15}$/.test(form.phone)) e.phone = 'Formato inválido (ej: +573001234567)'
    if (form.role === 'trabajador' && !form.city) e.city = 'Selecciona tu ciudad'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const redirectByRole = (role) => {
    if (role === 'admin') navigate('/admin', { replace: true })
    else if (role === 'trabajador') navigate('/worker', { replace: true })
    else navigate('/home', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = { ...form }
    if (!payload.phone || payload.phone.trim() === '') delete payload.phone
    const result = await register(payload)
    if (result.success) {
      toast.success('¡Cuenta creada! Bienvenido 🎉')
      redirectByRole(result.role)
    } else {
      toast.error(result.message)
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)
  const handleGoogle = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await res.json()
        const result = await loginWithOAuth('google', tokenResponse.id_token || tokenResponse.access_token, {
          providerId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
        })
        if (result.success) {
          toast.success('¡Cuenta creada con Google!')
          redirectByRole(result.role)
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('Error al conectar con Google')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('Registro con Google cancelado'),
    flow: 'implicit',
  })

  const busy = isLoading || googleLoading

  const ROLES = [
    {
      key: 'cliente',
      icon: <Home size={18} />,
      title: 'Cliente',
      desc: 'Busco trabajadores para mi hogar',
    },
    {
      key: 'trabajador',
      icon: <Briefcase size={18} />,
      title: 'Profesional',
      desc: 'Ofrezco mis servicios',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff6f4] to-white flex flex-col page-enter">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex items-center gap-3">
        <button id="btn-register-back" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Título */}
      <div className="px-7 pb-6">
        <h1 className="text-[28px] font-extrabold text-[#111] leading-tight">
          Crea tu cuenta<br /><span className="text-[#E8432D]">es gratis</span>
        </h1>
        <p className="text-[14px] text-gray-500 mt-1.5">Solo te tomará un minuto</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-7 flex flex-col gap-4 pb-10">
        {/* Google rápido */}
        <button id="btn-register-google" type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-gray-100 bg-white shadow-sm
                     text-[14px] font-semibold text-[#111] hover:border-gray-300 active:scale-[.98] disabled:opacity-50 transition-all">
          {googleLoading
            ? <span className="w-4 h-4 border-2 border-gray-300 border-t-[#E8432D] rounded-full animate-spin" />
            : <GoogleIcon />}
          Registrarme con Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">o con correo</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Nombre */}
        <InputField icon={User} placeholder="Nombre completo" value={form.name}
          onChange={set('name')} required error={errors.name} />

        {/* Email */}
        <InputField icon={Mail} type="email" placeholder="Correo electrónico"
          value={form.email} onChange={set('email')} autoComplete="email" required error={errors.email} />

        {/* Password */}
        <div>
          <InputField
            icon={Lock}
            type={showPw ? 'text' : 'password'}
            placeholder="Contraseña"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            required
            error={errors.password}
            rightEl={
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <PasswordStrength password={form.password} />
        </div>

        {/* Teléfono */}
        <InputField icon={Phone} type="tel" placeholder="Teléfono (opcional, ej: +573001234567)"
          value={form.phone} onChange={set('phone')} error={errors.phone} />

        {/* Rol */}
        <div>
          <p className="text-[13px] font-semibold text-gray-500 mb-2.5 ml-1">¿Cómo vas a usar HOME?</p>
          <div className="flex gap-3">
            {ROLES.map(r => (
              <button
                key={r.key}
                id={`btn-role-${r.key}`}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: r.key }))}
                className={`flex-1 py-3.5 px-3 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[.98]
                  ${form.role === r.key
                    ? 'border-[#E8432D] bg-[#fff4f2] shadow-[0_0_0_3px_rgba(232,67,45,0.1)]'
                    : 'border-gray-100 bg-white hover:border-gray-300'
                  }`}
              >
                <span className={`flex items-center gap-1.5 text-[13px] font-bold mb-0.5 ${form.role === r.key ? 'text-[#E8432D]' : 'text-gray-600'}`}>
                  {r.icon} {r.title}
                </span>
                <span className="text-[11px] text-gray-400 leading-tight">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ciudad (Solo para trabajador) */}
        {form.role === 'trabajador' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400">
              <MapPin size={18} />
            </div>
            <select
              value={form.city}
              onChange={set('city')}
              className={`w-full bg-white border ${errors.city ? 'border-red-400' : 'border-gray-100'} rounded-2xl pl-12 pr-10 py-4 text-[14px] font-semibold text-[#111] appearance-none outline-none focus:border-[#E8432D] shadow-sm transition-all`}
            >
              <option value="" disabled>Selecciona tu ciudad</option>
              <option value="Medellín">Medellín</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Cali">Cali</option>
              <option value="Pereira">Pereira</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
              <ChevronDown size={18} />
            </div>
            {errors.city && <p className="text-red-500 text-xs mt-1.5 ml-2 font-medium">{errors.city}</p>}
          </div>
        )}

        {/* Submit */}
        <button id="btn-register-submit" type="submit" disabled={busy}
          className="w-full py-4 bg-[#E8432D] text-white rounded-full font-bold text-[16px] disabled:opacity-50 mt-1
                     hover:bg-[#c93820] active:scale-[.98] transition-all shadow-[0_4px_16px_rgba(232,67,45,0.35)]">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creando cuenta...
            </span>
          ) : 'Crear cuenta gratis'}
        </button>

        <p className="text-center text-[14px] text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#E8432D] font-bold hover:underline">Inicia sesión</Link>
        </p>

        <p className="text-[11px] text-gray-400 text-center leading-relaxed -mt-1">
          Al crear tu cuenta aceptas nuestros{' '}
          <span className="underline cursor-pointer">Términos de uso</span> y{' '}
          <span className="underline cursor-pointer">Política de privacidad</span>
        </p>
      </form>
    </div>
  )
}

export { ResetPasswordPage }
