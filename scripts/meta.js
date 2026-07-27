/**
 * Flat page metadata builder (no site graph, no content hashing).
 * Hashing / incremental graph enrichment live in the sibling mndmeta project.
 *
 * Output shape (public/site-meta.json):
 *   { pages: [ { url, name, slug, published, created, desc, metrics, links, related, tags, sections } ] }
 *
 * Each tag: { term, score, group } where group is one of the fixed vocabulary
 *   category | topic | concept | entity | user
 */
const { plain_text, word_count, reading_time, extract_links, section_tree } = require('./text')
const tags = require('./tags')


/** Fixed group vocabulary. Auto tags use the first four; frontmatter tags use `user`. */
const TAG_GROUPS = Object.freeze(['category', 'topic', 'concept', 'entity', 'user'])
const AUTO_GROUPS = Object.freeze(['category', 'topic', 'concept', 'entity'])
const USER_GROUP = 'user'


function parse_user_tags(fm) {
  /** Frontmatter tags: `tags: [a, b]` or `tags: a` (string). Legacy `categories` merged in. */
  const out = []
  const raw = fm.tags
  if (Array.isArray(raw)) out.push(...raw.map(String))
  else if (typeof raw === 'string' && raw.trim()) out.push(raw.trim())
  if (Array.isArray(fm.categories)) out.push(...fm.categories.map(String))
  else if (typeof fm.categories === 'string' && fm.categories.trim()) out.push(fm.categories.trim())
  // dedupe case-insensitively, preserve first spelling
  const seen = new Set()
  return out.filter(t => {
    const k = t.toLowerCase()
    if (!t.trim() || seen.has(k)) return false
    seen.add(k)
    return true
  })
}


function parse_desc(fm) {
  /** Optional page summary from frontmatter (`desc` or `description`). */
  const d = fm.desc ?? fm.description
  if (d == null) return null
  const s = String(d).trim()
  return s || null
}


async function build_sections(section_nodes, cfg, embedder) {
  /** Recursively tag each section from its own title + content. */
  const out = []
  for (const node of section_nodes) {
    const body = [node.content, ...(node.children || []).map(c => c.content)].join('\n')
    const scored = await tags.tag_unit({
      title: node.name,
      text: body || node.name,
      user_terms: [],
      max_keywords: cfg.max_keywords,
      page_tags: cfg.page_tags,
      embedder,
    })
    out.push({
      name: node.name,
      level: node.level,
      tags: scored,
      sections: await build_sections(node.children || [], cfg, embedder),
    })
  }
  return out
}


async function build_page({ slug, title, url, content, published, created, fm }, cfg, embedder) {
  /** Build one flat page record with locally scored tags and nested sections. */
  const body = content.replace(/\r\n?/g, '\n').replace(/^\s*#\s+.+\n?/, '')
  const { intro, sections: tree } = section_tree(body)
  const user_terms = parse_user_tags(fm || {})

  const page_tags = await tags.tag_unit({
    title,
    text: body || title,
    user_terms,
    max_keywords: cfg.max_keywords,
    page_tags: cfg.page_tags,
    embedder,
  })

  return {
    name: title,
    url,
    slug,
    published: published || '',
    created:   created || '',
    desc:      parse_desc(fm || {}),
    metrics:   { word_count: word_count(body), reading_time: reading_time(body) },
    links:     extract_links(content),
    related:   [],
    tags:      page_tags,
    sections:  await build_sections(tree, cfg, embedder),
  }
}


function display_tags(tag_list, n) {
  /** First n tags (already user-first, then by score). */
  if (!Array.isArray(tag_list) || n <= 0) return []
  return tag_list.slice(0, n)
}


module.exports = {
  TAG_GROUPS, AUTO_GROUPS, USER_GROUP,
  plain_text, word_count, reading_time, extract_links, section_tree,
  parse_user_tags, parse_desc, build_page, build_sections, display_tags,
}
