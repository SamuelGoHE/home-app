/**
 * Skeleton — primitivo genérico del design system HOME.
 *
 * `CardSkeleton`/`RowSkeleton` (en `components/common/index.jsx`) siguen
 * existiendo tal cual para no romper sus imports actuales; este primitivo es
 * la base sobre la que debería construirse cualquier skeleton nuevo (incluido
 * el que hoy le falta a home-mobile).
 *
 * @typedef {'block'|'circle'|'text'} SkeletonVariant
 * @typedef {Object} SkeletonProps
 * @property {SkeletonVariant} [variant='block']
 * @property {string|number} [width]
 * @property {string|number} [height]
 * @property {string} [className]
 */

const VARIANT_CLASSES = {
  block: 'rounded-2xl',
  circle: 'rounded-full',
  text: 'rounded h-3',
}

/** @param {SkeletonProps} props */
export function Skeleton({ variant = 'block', width, height, className = '' }) {
  return (
    <div
      className={['animate-pulse bg-gray-200/80', VARIANT_CLASSES[variant], className]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height }}
    />
  )
}
