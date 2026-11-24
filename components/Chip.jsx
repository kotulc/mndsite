import Link from 'next/link'

/**
 * Pill chip for page categories, tags, and keywords.
 * Used by TagList and consumer components; variant selects the chip-<variant> style in
 * styles/global.css.
 */
export default function Chip({ label, variant = 'tag', tooltip, href, children }) {
  const Element = href ? Link : 'span'
  return (
    <Element href={href}
      className={`chip chip-${variant}`}
      data-tooltip={tooltip || undefined}
      aria-label={tooltip ? `${label}. ${tooltip}` : undefined}
    >
      {children ?? label}
    </Element>
  )
}
