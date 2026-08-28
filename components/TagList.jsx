/**
 * Renders facet values as chips. Each entry is { term, group }, where group is the
 * facet name — it selects the chip color generated from that facet's configured hue.
 */
import Chip from './Chip'
import { facet_config, facet_label } from './facets'


function chip_variant(group) {
  return facet_config(group) ? group : 'custom'
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
          tooltip={`${facet_label(t.group)}: ${t.term}`}
        />
      ))}
    </div>
  )
}
