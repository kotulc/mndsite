/**
 * Pill chip for page categories, tags, and keywords.
 * Used by TagList and consumer components; variant selects the chip-<variant> style in
 * styles/global.css.
 */
export default function Chip({ label, variant = 'tag', tooltip }) {
  return (
    <span
      className={`chip chip-${variant}`}
      data-tooltip={tooltip || undefined}
      aria-label={tooltip ? `${label}. ${tooltip}` : undefined}
    >
      {label}
    </span>
  )
}
