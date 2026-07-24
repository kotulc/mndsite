/**
 * Structural site-graph construction.
 * Builds the folder / page / section node tree that mirrors the content directory,
 * with structural metadata (word count, reading time, links, dates). NLP metadata is
 * layered on afterward by scripts/extract.js. This module is pure and taggly-free.
 *
 * Node shapes (see docs/specifications/metadata.md for the full contract):
 *   root    { name, type:'root',    url:'/', children }
 *   folder  { name, type:'folder',  url, slug, children }
 *   page    { name, type:'page',    url, slug, date, created, hash, word_count,
 *             reading_time, links, content, children:[section] }
 *   section { name, type:'section', level, content, children:[section] }
 */
const crypto = require('crypto')


const MIN_LEVEL = 2   // the page title is an h1; sections start at ## (h2)
const MAX_LEVEL = 3   // headings deeper than ### fold into their section's content


function plain_text(text) {
  /** Reduce markdown to plain prose: drop code fences and markdown syntax characters. */
  return text.replace(/```[\s\S]*?```/g, ' ')
             .replace(/[#*`[\]()!|>]/g, ' ')
             .replace(/\s+/g, ' ').trim()
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
  for (const m of content.matchAll(/(?<!\!)\[[^\]]*\]\(([^)\s]+)/g)) links.add(m[1])
  for (const m of content.matchAll(/\bhttps?:\/\/[^\s)\]]+/g)) links.add(m[0])
  return [...links]
}


function content_hash(text) {
  /** Short content hash for change detection between builds (extract.js skips
   *  re-extracting a page when this matches the previous build's graph). */
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}


function section_tree(body) {
  /** Parse a page body (title removed) into a nested section tree by heading level.
   *  Returns { intro, sections }: intro is text before the first section heading;
   *  sections nest ## > ### with deeper headings folded into their content. */
  const roots = []
  const stack = []
  const intro = []
  let in_fence = false

  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
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


function build_page({ slug, title, url, content, date, created }) {
  /** Build a structural page node from transformed page content (frontmatter stripped,
   *  title h1 present). NLP fields are added later by scripts/extract.js. */
  const body = content.replace(/\r\n?/g, '\n').replace(/^\s*#\s+.+\n?/, '')
  const { intro, sections } = section_tree(body)
  return {
    name: title,
    type: 'page',
    url,
    slug,
    date:         date || '',
    created:      created || '',
    hash:         content_hash(content),
    word_count:   word_count(body),
    reading_time: reading_time(body),
    links:        extract_links(content),
    content:      intro,
    children:     sections,
  }
}


function folder_node({ name, url, slug, children }) {
  /** Build a folder node containing pages and subfolders. */
  return { name, type: 'folder', url, slug, children }
}


function root_node({ name, children }) {
  /** Build the graph root node (name is the site title). */
  return { name, type: 'root', url: '/', children }
}


function flatten_pages(node, acc = []) {
  /** Depth-first collect all page nodes under a node, in document order. */
  if (node.type === 'page') acc.push(node)
  for (const child of node.children || []) flatten_pages(child, acc)
  return acc
}


module.exports = {
  MIN_LEVEL, MAX_LEVEL, plain_text, word_count, reading_time, extract_links, content_hash,
  section_tree, build_page, folder_node, root_node, flatten_pages,
}
