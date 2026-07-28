/**
 * Pill chip for page categories, tags, and keywords.
 * Used by TagList and consumer components; variant selects the chip-<variant> style in
 * styles/global.css.
 */
export default function Chip({ label, variant = 'tag', title }) {
  return <span className={`chip chip-${variant}`} title={title}>{label}</span>
}
