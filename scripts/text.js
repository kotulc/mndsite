/**
 * Shared markdown → text helpers used by meta building and keyword extraction.
 * (Split out of the old graph.js; content hashing lives in mndmeta now.)
 */
const MIN_LEVEL = 2
const MAX_LEVEL = 3


function plain_text(text) {
  /** Reduce markdown to plain prose: drop code fences and markdown syntax characters. */
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`[\]()!|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


function word_count(text) {
  /** Count prose words (length > 1), ignoring code and markdown syntax. */
  return plain_text(text).split(' ').filter(w => w.length > 1).length
}


function reading_time(text) {
  /** Estimate reading time in minutes at 200 wpm (minimum 1). */
  return Math.max(1, Math.round(word_count(text) / 200))
}


function extract_links(content) {
  /** Collect unique markdown link hrefs and bare URLs from content (images excluded). */
  const links = new Set()
  for (const m of String(content || '').matchAll(/(?<!\!)\[[^\]]*\]\(([^)\s]+)/g)) links.add(m[1])
  for (const m of String(content || '').matchAll(/\bhttps?:\/\/[^\s)\]]+/g)) links.add(m[0])
  return [...links]
}


function section_tree(body) {
  /** Parse a page body (title removed) into a nested section tree by heading level.
   *  Returns { intro, sections }: intro is text before the first section heading;
   *  sections nest ## > ### with deeper headings folded into their content. */
  const roots = []
  const stack = []
  const intro = []
  let in_fence = false

  for (const line of String(body || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (/^```/.test(line)) in_fence = !in_fence
    const m = in_fence ? null : line.match(/^(#{1,6})\s+(.+)$/)
    const level = m ? m[1].length : 0

    if (m && level >= MIN_LEVEL && level <= MAX_LEVEL) {
      const node = { name: m[2].trim(), type: 'section', level, _lines: [], children: [] }
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
      ;(stack.length ? stack[stack.length - 1].children : roots).push(node)
      stack.push(node)
    } else if (stack.length) {
      stack[stack.length - 1]._lines.push(line)
    } else {
      intro.push(line)
    }
  }

  const finalize = n => { n.content = n._lines.join('\n').trim(); delete n._lines; n.children.forEach(finalize) }
  roots.forEach(finalize)
  return { intro: intro.join('\n').trim(), sections: roots }
}


module.exports = {
  MIN_LEVEL, MAX_LEVEL, plain_text, word_count, reading_time, extract_links, section_tree,
}
