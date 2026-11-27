function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function searchPhrase(term) {
  return term ? new RegExp(escapePattern(term), 'iu') : null
}

export function searchHighlights(term) {
  return term ? new RegExp('(' + term.split(/\s+/).map(escapePattern).join('|') + ')', 'iu') : null
}

export function highlight(value, pattern) {
  if (!pattern || !value) return value
  return String(value).split(pattern).map((part, i) =>
    i % 2 ? <mark key={i}>{part}</mark> : part)
}

function matchExcerpt(text, match) {
  const matchEnd = match.index + match[0].length
  let start = Math.max(0, match.index - 75)
  let end = Math.min(text.length, matchEnd + 105)
  if (start > 0) {
    const boundary = text.indexOf(' ', start)
    if (boundary >= 0 && boundary < match.index) start = boundary + 1
  }
  if (end < text.length) {
    const boundary = text.lastIndexOf(' ', end)
    if (boundary >= matchEnd) end = boundary
  }
  return (start ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '')
}

export function pageSearchText(entry) {
  return typeof entry === 'string' ? entry : entry?.text || ''
}

export function pageSearchMatch(entry, phrase) {
  if (!phrase) return null
  for (const card of entry?.cards || []) {
    const match = phrase.exec(card.text)
    if (match) return { card, excerpt: matchExcerpt(card.text, match) }
  }
  const text = pageSearchText(entry)
  const match = phrase.exec(text)
  return match ? { excerpt: matchExcerpt(text, match) } : null
}
