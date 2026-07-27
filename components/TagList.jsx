/**
 * Renders a list of tags as chips. Each tag is { term, score?, group } with a fixed
 * group vocabulary: category | topic | concept | entity | user.
 */
import Chip from './Chip'

const KNOWN_GROUPS = ['category', 'topic', 'concept', 'entity', 'user']

function group_variant(group) {
  return KNOWN_GROUPS.includes(group) ? group : 'custom'
}

function normalize_tags(tags) {
  /** Accept the new array shape, or a legacy { group: [terms] } map. */
  if (Array.isArray(tags)) return tags.filter(t => t && t.term)
  if (!tags || typeof tags !== 'object') return []
  const out = []
  for (const [group, terms] of Object.entries(tags)) {
    if (group === 'keywords' || !terms || !terms.length) continue
    // map legacy plurals → singular chip variants
    const g = ({ categories: 'category', topics: 'topic', concepts: 'concept', entities: 'entity' })[group] || group
    for (const term of terms) out.push({ term, group: g })
  }
  return out
}

export default function TagList({ tags = [] }) {
  const list = normalize_tags(tags)
  if (!list.length) return null
  return (
    <div className="tag-list">
      {list.map(t => (
        <Chip key={`${t.group}-${t.term}`} label={t.term} variant={group_variant(t.group)} />
      ))}
    </div>
  )
}
