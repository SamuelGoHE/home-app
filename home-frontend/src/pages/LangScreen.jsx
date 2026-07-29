import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const COUNTRIES = [
  { code: 'co', label: 'Colombia (Español, pesos)', flag: 'https://flagcdn.com/w40/co.png' },
  { code: 'mx', label: 'México (Español, pesos)',   flag: 'https://flagcdn.com/w40/mx.png' },
  { code: 'ar', label: 'Argentina (Español, pesos)',flag: 'https://flagcdn.com/w40/ar.png' },
  { code: 'us', label: 'United States (English, USD)', flag: 'https://flagcdn.com/w40/us.png' },
]

export default function LangScreen() {
  const [selected, setSelected] = useState('co')
  const navigate = useNavigate()
  const country = COUNTRIES.find(c => c.code === selected)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fff7f5] to-[#ffffff]">
      <div className="flex-1 px-8 pt-16 page-enter">
        <h1 className="text-4xl font-extrabold text-[#111] mb-3">Configura tu región</h1>
        <p className="text-lg font-semibold text-gray-700 mb-8 leading-tight">
          Selecciona idioma y moneda para personalizar tu experiencia.
        </p>

        <div className="ui-card px-4 py-4 flex items-center gap-3">
          <img src={country.flag} alt={country.code} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="flex-1 border-none outline-none font-outfit text-[15px] font-semibold bg-transparent appearance-none cursor-pointer"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <span className="text-gray-400 text-sm">▾</span>
        </div>
      </div>

      <div className="px-8 pb-12">
        <button
          onClick={() => navigate('/welcome')}
          className="w-full py-4 ui-btn-primary text-[16px]"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
