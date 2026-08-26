/**
 * Input — primitivo del design system HOME.
 *
 * Envuelve la clase `.ui-input` ya definida en `src/index.css` y le agrega
 * label/hint/error, que hoy cada formulario (AuthPages, ProfileEditPage)
 * reimplementa a mano de forma distinta. Ninguna pantalla lo consume todavía.
 *
 * @typedef {Object} InputProps
 * @property {string} [label]
 * @property {string} [hint] Texto de ayuda cuando no hay error.
 * @property {string} [error] Si está presente, reemplaza el hint y marca el borde en rojo.
 * @property {string} [id]
 * @property {string} [className]
 */

let uid = 0
function useStableId(id) {
  if (id) return id
  uid += 1
  return `hui-input-${uid}`
}

/** @param {InputProps & import('react').InputHTMLAttributes<HTMLInputElement>} props */
export function Input({ label, hint, error, id, className = '', ...rest }) {
  const inputId = useStableId(id)
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-caption font-semibold text-text mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[
          'ui-input',
          error ? 'border-error focus:border-error' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-error">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
