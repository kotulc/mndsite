/**
 * Pill chip for page categories, tags, and keywords.
 * Used by TagList, MetaSidebar, and consumer components; variant selects the
 * chip-<variant> style in styles/global.css.
 */
export default function Chip({ label, variant = 'tag' }) {
  return <span className={`chip chip-${variant}`}>{label}</span>
}
