/**
 * HOME — tokens de diseño canónicos.
 *
 * Fuente única de verdad para valores que se resuelven en tiempo de build
 * (Tailwind / NativeWind). Consumido directamente por:
 *   - home-frontend/tailwind.config.js  (import ESM: `import tokens from '../design-system/tokens.js'`)
 *   - home-mobile/tailwind.config.js    (require CJS: `require('../design-system/tokens.js')`)
 *
 * `tailwind.config.js` se ejecuta como Node puro al arrancar Vite/Metro, fuera
 * del grafo que empaqueta el bundler — por eso este archivo puede vivir en la
 * raíz del repo (fuera de ambos proyectos npm) sin tocar `vite.config.js` ni
 * `metro.config.js`.
 *
 * Los datos que SÍ se consumen en runtime dentro del código de la app (por
 * ejemplo el mapa de estado→color) no viven aquí: viven espejados en
 * `home-frontend/src/design-system/status.js` y `home-mobile/src/design-system/status.js`,
 * porque un import de runtime que cruce la raíz de cada proyecto sí chocaría
 * con las restricciones de `Vite server.fs.allow` / `Metro watchFolders`.
 * Este archivo es la referencia canónica de esos valores; si cambian aquí,
 * replicar el cambio a mano en ambos espejos.
 *
 * Regla de esta fase: solo se agregan claves. Ningún valor de un token ya
 * existente en los tailwind.config.js originales se sobreescribe aquí.
 */

/** @typedef {{DEFAULT:string, dark:string, soft:string, light?:string}} BrandScale */

module.exports = {
  /**
   * Colores semánticos. `brand` reusa el valor ya idéntico en ambas
   * plataformas (web lo exponía como `red`, mobile como `brand`); el resto
   * son reutilizaciones directas de tokens/CSS vars/usos ya presentes en el
   * código (ver Hoja de Ruta HOME, sección "Colors", para el origen exacto
   * de cada valor).
   */
  colors: {
    /** @type {BrandScale} */
    brand: { DEFAULT: '#E8432D', dark: '#c93820', soft: '#fff4f2', light: '#FF6B4A' },
    ink: '#111111',
    text: '#171717',
    muted: '#6b7280',
    surface: { DEFAULT: '#ffffff', soft: '#f8fafc' },
    background: '#f8fafc',
    border: '#e5e7eb',
    // Patrón "secundario" ya existente en `.ui-btn-secondary` (blanco + borde +
    // texto oscuro) — no es un hue nuevo, es la versión neutral/outline.
    secondary: { DEFAULT: '#ffffff', text: '#171717', border: '#e5e7eb' },
    success: '#16a34a', // Tailwind green-600, ya usado en PasswordChecklist (mobile)
    warning: '#f59e0b', // Tailwind amber-500, ya usado en banners/rating
    error: '#dc2626',   // Tailwind red-600, ya usado en StatusBadge (bloqueada/cancelado)
    info: '#2563eb',    // Tailwind blue-600, cercano al azul ya usado en "aprobado"
  },

  /**
   * Escala de radios — cada valor ya existe hoy en algún archivo del repo.
   * Nombres elegidos para NO colisionar con las claves por defecto de
   * Tailwind (sm/md/lg/xl/2xl/3xl/full ya existen en el tema base — declarar
   * un `extend.borderRadius.xl` sobreescribiría `rounded-xl` en TODA la app).
   * Los pasos intermedios/grandes ya existentes (`xl2`:20px, `xl3`:28px,
   * `xl4`:40px en home-frontend/tailwind.config.js, y las utilidades nativas
   * `rounded-3xl`:24px / `rounded-full`) se documentan pero no se redeclaran
   * aquí — ya están disponibles sin tocar nada.
   */
  radius: {
    input: 14, // .ui-input (web) — sin equivalente Tailwind por defecto
    card: 18,  // .ui-card (web) === card (mobile, ya usa este mismo nombre)
  },

  /**
   * Elevación. Solo dos niveles: el único valor en el que ya coinciden
   * .ui-card (web) y boxShadow.card (mobile), y el "heavy" ya existente en
   * web para overlays/modales. El boxShadow.card divergente de
   * home-frontend/tailwind.config.js (usado hoy por ResultsScreen.jsx) no se
   * toca ni se renombra aquí — ver nota en la Hoja de Ruta.
   */
  shadow: {
    raised: '0 10px 28px rgba(17, 24, 39, 0.06)',
    overlay: '0 20px 60px rgba(0, 0, 0, 0.18)',
  },

  /**
   * Alias semánticos sobre la escala numérica nativa de Tailwind (5/4/8) —
   * no es una escala nueva, es nomenclatura sobre valores que ya existen por
   * defecto en Tailwind/NativeWind.
   */
  spacing: {
    page: '1.25rem',    // = Tailwind 5 (20px) — padding horizontal de página más repetido
    gutter: '1rem',     // = Tailwind 4 (16px) — separación estándar en listas/stacks
    section: '2rem',    // = Tailwind 8 (32px) — separación entre bloques mayores
  },

  /**
   * Roles tipográficos → pasos que YA existen por defecto en la escala de
   * Tailwind (text-3xl/xl/base/sm/xs). Formato de tupla [size, meta] para
   * poder spreadear directo en `theme.extend.fontSize` de ambos configs.
   * La familia (`Outfit`) se define aparte, solo en home-frontend — mobile
   * no carga fuente custom en esta fase.
   */
  typography: {
    display: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '800' }], // text-3xl
    heading: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],  // text-xl
    body: ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],        // text-base
    caption: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],// text-sm
    label: ['0.75rem', { lineHeight: '1rem', fontWeight: '700' }],      // text-xs (uppercase/tracking se aplica en el consumidor)
  },
}
