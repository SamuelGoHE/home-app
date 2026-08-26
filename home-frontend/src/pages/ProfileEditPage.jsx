import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, User as UserIcon, Mail, Phone, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'
import { Button, IconButton, Card, Input } from '../components/ui'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  // Estado del formulario precargado con datos del usuario
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || ''
  })

  // Si inició sesión con Google, no dejamos cambiar el correo
  const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre no puede estar vacío')
      return
    }

    // Simulamos la actualización en el servidor
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1000)),
      {
        loading: 'Guardando datos...',
        success: '¡Datos actualizados correctamente!',
        error: 'Hubo un error al guardar'
      }
    ).then(() => {
      // Actualizamos el estado global localmente para que se refleje de inmediato
      if (setUser) {
        setUser({ ...user, ...formData })
      }
      setTimeout(() => navigate(-1), 1500)
    })
  }

  return (
    <div className="min-h-screen bg-background page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-surface px-5 pt-14 pb-4 flex items-center justify-between border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <IconButton icon={ArrowLeft} aria-label="Volver" onClick={() => navigate(-1)} />
          <h1 className="text-heading text-ink">Mis datos personales</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSave}>
          Guardar
        </Button>
      </div>

      <div className="flex-1 px-5 pt-8 pb-12 overflow-y-auto">

        {/* ── Foto de Perfil ── */}
        <div className="flex flex-col items-center mb-10 relative">
          <div className="w-28 h-28 rounded-[32px] bg-surface p-1.5 shadow-xl shadow-brand/5">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-[28px]" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-[28px] flex items-center justify-center text-4xl font-extrabold text-gray-400">
                {formData.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
              </div>
            )}

            <IconButton
              icon={Camera}
              aria-label="Cambiar foto de perfil"
              className="absolute -bottom-2 -right-2 !bg-brand !text-white !border-4 !border-background shadow-lg hover:!bg-brand-dark"
            />
          </div>
          <p className="text-[12px] font-bold text-gray-400 mt-5 uppercase tracking-wider">
            Toca la cámara para cambiar foto
          </p>
        </div>

        {/* ── Formulario ── */}
        <Card padding="lg" className="flex flex-col gap-5">

          {/* Nombre */}
          <div>
            <label htmlFor="profile-name" className="flex items-center gap-2 text-label uppercase text-muted mb-2 ml-1">
              <UserIcon size={14} aria-hidden="true" /> Nombre Completo
            </label>
            <Input
              id="profile-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Correo */}
          <div>
            <label htmlFor="profile-email" className="flex items-center gap-2 text-label uppercase text-muted mb-2 ml-1">
              <Mail size={14} aria-hidden="true" /> Correo Electrónico
            </label>
            <Input
              id="profile-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={isOAuth ? undefined : handleChange}
              readOnly={isOAuth}
              className={isOAuth ? 'bg-gray-100 text-muted cursor-not-allowed' : ''}
              hint={isOAuth ? `No puedes cambiar tu correo porque iniciaste sesión con ${user.oauth_provider}.` : undefined}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="profile-phone" className="flex items-center gap-2 text-label uppercase text-muted mb-2 ml-1">
              <Phone size={14} aria-hidden="true" /> Número de Celular
            </label>
            <div className="flex gap-2">
              <div className="bg-background rounded-2xl px-4 py-4 font-bold text-[15px] text-muted flex items-center justify-center">
                +57
              </div>
              <Input
                id="profile-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="300 000 0000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Ciudad / Dirección */}
          <div>
            <label htmlFor="profile-city" className="flex items-center gap-2 text-label uppercase text-muted mb-2 ml-1">
              <MapPin size={14} aria-hidden="true" /> Ciudad Principal
            </label>
            <Input
              id="profile-city"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Ej. Medellín, Envigado..."
            />
          </div>

        </Card>

      </div>
    </div>
  )
}
