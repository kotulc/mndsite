/**
 * Renders a node's tag groups (all except keywords) as chips. Each of the standard
 * groups (categories/topics/concepts/entities) gets its own named chip style; any
 * other configured extract_concepts group falls back to chip-custom.
 */
import Chip from './Chip'

const KNOWN_GROUPS = ['categories', 'topics', 'concepts', 'entities']

function group_variant(group) {
  return KNOWN_GROUPS.includes(group) ? group : 'custom'
}

export default function TagList({ tags = {} }) {
  const groups = Object.entries(tags).filter(([group, terms]) => group !== 'keywords' && terms && terms.length)
  if (!groups.length) return null
  return (
    <div className="tag-list">
      {groups.map(([group, terms]) =>
        terms.map(term => <Chip key={`${group}-${term}`} label={term} variant={group_variant(group)} />)
      )}
    </div>
  )
}
