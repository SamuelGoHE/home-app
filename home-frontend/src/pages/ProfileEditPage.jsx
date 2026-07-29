import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, User as UserIcon, Mail, Phone, MapPin, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'

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
    <div className="min-h-screen bg-[#f8f9fb] page-enter flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-extrabold text-[17px] text-[#111]">Mis datos personales</h1>
        </div>
        <button 
          onClick={handleSave}
          className="text-[#E8432D] font-bold text-[14px] px-3 py-1.5 bg-red-50 rounded-lg active:bg-red-100 transition-colors"
        >
          Guardar
        </button>
      </div>

      <div className="flex-1 px-5 pt-8 pb-12 overflow-y-auto">
        
        {/* ── Foto de Perfil ── */}
        <div className="flex flex-col items-center mb-10 relative">
          <div className="w-28 h-28 rounded-[32px] bg-white p-1.5 shadow-xl shadow-[#E8432D]/5">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-[28px]" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-[28px] flex items-center justify-center text-4xl font-extrabold text-gray-400">
                {formData.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
              </div>
            )}
            
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#E8432D] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform border-4 border-[#f8f9fb]">
              <Camera size={18} />
            </button>
          </div>
          <p className="text-[12px] font-bold text-gray-400 mt-5 uppercase tracking-wider">
            Toca la cámara para cambiar foto
          </p>
        </div>

        {/* ── Formulario ── */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
          
          {/* Nombre */}
          <div>
            <label className="flex items-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">
              <UserIcon size={14} /> Nombre Completo
            </label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[#f8f9fb] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#E8432D]/20 transition-all font-bold text-[15px] text-[#111]"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Correo */}
          <div>
            <label className="flex items-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">
              <Mail size={14} /> Correo Electrónico
            </label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={isOAuth ? undefined : handleChange}
              readOnly={isOAuth}
              className={`w-full rounded-2xl px-5 py-4 outline-none transition-all font-bold text-[15px] ${
                isOAuth 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#f8f9fb] text-[#111] focus:ring-2 focus:ring-[#E8432D]/20'
              }`}
            />
            {isOAuth && (
              <p className="text-[11px] text-gray-400 mt-1.5 ml-1 font-medium">
                No puedes cambiar tu correo porque iniciaste sesión con {user.oauth_provider}.
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="flex items-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">
              <Phone size={14} /> Número de Celular
            </label>
            <div className="flex gap-2">
              <div className="bg-[#f8f9fb] rounded-2xl px-4 py-4 font-bold text-[15px] text-gray-500 flex items-center justify-center">
                +57
              </div>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="flex-1 bg-[#f8f9fb] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#E8432D]/20 transition-all font-bold text-[15px] text-[#111]"
                placeholder="300 000 0000"
              />
            </div>
          </div>

          {/* Ciudad / Dirección */}
          <div>
            <label className="flex items-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">
              <MapPin size={14} /> Ciudad Principal
            </label>
            <input 
              type="text" 
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full bg-[#f8f9fb] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#E8432D]/20 transition-all font-bold text-[15px] text-[#111]"
              placeholder="Ej. Medellín, Envigado..."
            />
          </div>

        </div>

      </div>
    </div>
  )
}
