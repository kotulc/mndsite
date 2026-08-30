/**
 * Renders facet values as chips. Each entry is { term, group }, where group is the
 * frontmatter field key — it selects the chip color generated for that field.
 */
import Chip from './Chip'
import { field_label, known_field_key } from './groups'


function chip_variant(field_key) {
  return known_field_key(field_key) ? field_key : 'custom'
}


export default function TagList({ tags = [] }) {
  const list = Array.isArray(tags) ? tags.filter(t => t && t.term) : []
  if (!list.length) return null
  return (
    <div className="tag-list">
      {list.map(t => (
        <Chip
          key={`${t.group}-${t.term}`}
          label={t.term}
          variant={chip_variant(t.group)}
          tooltip={`${field_label(t.group)}: ${t.term}`}
        />
      ))}
    </div>
  )
}
