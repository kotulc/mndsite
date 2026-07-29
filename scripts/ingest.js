/**
 * Content ingestion pipeline.
 * Recursively mirrors any markdown source tree into the Next.js pages/ directory and
 * writes flat page metadata to public/site-meta.json:
 *   - Renames .md → .mdx (home.md or index.md at any level → index.mdx)
 *   - Strips frontmatter from output pages — metadata lives in site-meta.json
 *   - Ensures each page has an h1 (title from frontmatter, first heading, or slug)
 *   - Builds flat page/section records with local keyword + embedding tags (scripts/meta.js)
 *   - Auto-generates index.mdx (redirect to first sorted page) when none exists
 *   - Copies images/ subdirectories to public/images/<rel-path>/ and rewrites refs
 *   - Strips corrupt EXIF segments from copied JPEGs
 *   - Auto-generates _meta.json at each level; sort order: nav_order > date > alpha
 *   - For flatten[] directories: writes public/dir-feeds/<name>.json and a DirFeed page
 *
 * Content hashing / taggly graph enrichment live in the sibling mndmeta project.
 *
 * Usage: node scripts/ingest.js [source-dir]   (default: docs/)
 */
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { strip_dir } = require('./fix-exif')
const meta = require('./meta')
const tags = require('./tags')


const ROOT      = path.join(__dirname, '..')
const PAGES     = path.join(ROOT, 'pages')
const PUB_IMG   = path.join(ROOT, 'public', 'images')
const PUB_DIR   = path.join(ROOT, 'public')
const SITE_META = path.join(PUB_DIR, 'site-meta.json')


// Module-level config: set by run(config), falls back to site.config.js for local dev
let _config = null
function get_config() { return _config || require('../site.config') }


// --- Text helpers ---

function parse_fm(content) {
  /** Parse a YAML frontmatter block into an object ({} when absent or invalid).
   *  JSON_SCHEMA keeps dates and other scalars as plain strings. */
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  try { return yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {} } catch { return {} }
}


function strip_fm(content) {
  /** Remove the frontmatter block and any leading blank lines. */
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/^\s*\n/, '')
}


function first_h1(content) {
  /** Return the first h1 heading text outside code fences, or ''. */
  const match = content.replace(/```[\s\S]*?```/g, '').match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}


function rewrite_img_refs(content, img_url) {
  /** Replace ](images/ with ](<img_url>/ in markdown content. */
  return content.replace(/\]\(images\//g, `](${img_url}/`)
}


function rewrite_md_links(content, url_base) {
  /** Rewrite relative markdown links to absolute paths using the page URL base.
   *  Skips image links (![...]), already-absolute hrefs, and fragment-only refs. */
  return content.replace(
    /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text, raw_href) => {
      const space = raw_href.search(/\s/)
      const href = space < 0 ? raw_href : raw_href.slice(0, space)
      const rest = space < 0 ? '' : raw_href.slice(space)
      if (/^(\/|https?:|mailto:|#)/.test(href)) return match
      const [link, ...frags] = href.split('#')
      const fragment = frags.length ? '#' + frags.join('#') : ''
      return `[${text}](${path.posix.join(url_base, link)}${fragment}${rest})`
    }
  )
}


function ensure_h1(mdx_path, title) {
  /** Prepend # title heading if the file's body has no h1 outside code fences.
   *  Handles files with or without a frontmatter block. */
  const content = fs.readFileSync(mdx_path, 'utf8')
  if (first_h1(strip_fm(content))) return
  const updated = /^---/.test(content)
    ? content.replace(/(^---[\s\S]*?---\r?\n)/, `$1\n# ${title}\n\n`)
    : `# ${title}\n\n${content}`
  fs.writeFileSync(mdx_path, updated)
}


function extract_content(mdx) {
  /** Strip frontmatter, imports, bare JSX tags, and leading H1 from MDX.
   *  Processes line-by-line to skip content inside code fences. */
  const body = strip_fm(mdx)
  let in_fence = false
  const lines = body.split('\n').filter(line => {
    if (/^```/.test(line)) { in_fence = !in_fence; return true }
    if (in_fence) return true
    if (/^import\s/.test(line)) return false
    if (/^<[A-Z][^\n>]*\/>\s*$/.test(line)) return false
    return true
  })
  return lines.join('\n').trimStart().replace(/^#\s+.+\r?\n?/, '').trim()
}


function slug_to_title(s) {
  /** Convert a slug (kebab or snake case) to a capitalized title. */
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function norm_path(p) {
  /** Strip leading and trailing slashes; '/' and '' both become ''. */
  return (p || '').replace(/^\/+|\/+$/g, '')
}


// --- Sorting and navigation ---

function auto_sort(nodes) {
  /** Sort nodes: newest-first by published date when any has one, else alphabetical
   *  by slug. Undated nodes always sort alphabetically after dated ones. */
  const dated   = nodes.filter(n => n.published)
  const undated = nodes.filter(n => !n.published)
  if (!dated.length) return [...nodes].sort((a, b) => a.slug.localeCompare(b.slug))
  return [
    ...dated.sort((a, b)   => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug)),
    ...undated.sort((a, b) => a.slug.localeCompare(b.slug)),
  ]
}


function sort_entries(nodes, rel) {
  /** Sort a directory's child nodes.
   *  nav_order[rel] slug array pins listed slugs first in declared order, rest auto-sorted.
   *  index slug is always placed first. */
  const idx  = nodes.filter(n => n.slug === 'index')
  const rest = nodes.filter(n => n.slug !== 'index')
  const nav_map = Object.fromEntries(
    Object.entries(get_config().nav_order || {}).map(([k, v]) => [norm_path(k), v])
  )
  const nav = nav_map[rel]

  if (Array.isArray(nav)) {
    const rank     = Object.fromEntries(nav.map((s, i) => [s, i]))
    const pinned   = rest.filter(n => rank[n.slug] != null).sort((a, b) => rank[a.slug] - rank[b.slug])
    const unpinned = rest.filter(n => rank[n.slug] == null)
    return [...idx, ...pinned, ...auto_sort(unpinned)]
  }

  return [...idx, ...auto_sort(rest)]
}


function write_meta(dest_path, entries) {
  /** Write a _meta.json from ordered [key, value] pairs, preserving order.
   *  Plain objects cannot be used — JS engines reorder numeric-like keys. */
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  fs.writeFileSync(dest_path, `{\n${lines.join(',\n')}\n}\n`)
}


function is_flatten(rel) {
  /** True if rel matches a directory in config.flatten (paths normalized). */
  return (get_config().flatten || []).map(norm_path).includes(rel)
}


function auto_index(dest_dir, sorted, rel) {
  /** Generate a redirect index.mdx to the first sorted leaf page.
   *  Uses AutoRedirect component so Next.js handles basePath automatically.
   *  No-ops if index.mdx already exists or no leaf pages are found. */
  if (fs.existsSync(path.join(dest_dir, 'index.mdx'))) return
  const first = sorted.find(n => fs.existsSync(path.join(dest_dir, `${n.slug}.mdx`)))
  if (!first) return
  const url      = rel ? `/${rel}/${first.slug}/` : `/${first.slug}/`
  const depth    = rel ? rel.split('/').length + 1 : 1
  const rel_path = '../'.repeat(depth) + 'components/AutoRedirect'
  fs.writeFileSync(path.join(dest_dir, 'index.mdx'), [
    `---`,
    `title: ${first.name}`,
    `auto_redirect: true`,
    `---`,
    ``,
    `import AutoRedirect from '${rel_path}'`,
    ``,
    `<AutoRedirect to="${url}" />`,
  ].join('\n') + '\n')
}


// --- Directory walk: build graph + mirror files ---

function copy_images(src_dir, rel) {
  /** Copy src_dir/images/ into public/images/<rel>/ and return the absolute image URL base. */
  const img_url  = '/images' + (rel ? `/${rel}` : '')
  const img_src  = path.join(src_dir, 'images')
  const img_dest = path.join(PUB_IMG, rel)  // rel='' → PUB_IMG itself

  if (fs.existsSync(img_src) && fs.statSync(img_src).isDirectory()) {
    fs.mkdirSync(img_dest, { recursive: true })
    for (const f of fs.readdirSync(img_src)) {
      const sf = path.join(img_src, f)
      if (fs.statSync(sf).isFile()) fs.copyFileSync(sf, path.join(img_dest, f))
    }
    strip_dir(img_dest)
  }
  return img_url
}


async function ingest_page(src_entry, dest_dir, rel, slug, base, img_url, meta_cfg, embedder) {
  /** Transform one source file into a frontmatter-free .mdx and return its flat page record. */
  const raw = fs.readFileSync(src_entry, 'utf8').replace(/\r\n?/g, '\n')
  const fm  = parse_fm(raw)
  // Relative links resolve against the source file's own directory (where the author
  // wrote them relative to), not the page's rendered pretty-URL — those only coincide
  // for index pages. Using the page's own slug as a path segment here would nest a
  // sibling page's link one level too deep (e.g. features/overview.md linking to
  // "content-pipeline" would wrongly resolve under /features/overview/ instead of /features/).
  const url_base = rel ? `/${rel}/` : '/'

  const dest = path.join(dest_dir, `${slug}.mdx`)
  fs.writeFileSync(dest, rewrite_md_links(rewrite_img_refs(strip_fm(raw), img_url), url_base))

  const title = fm.title || first_h1(fs.readFileSync(dest, 'utf8')) || slug_to_title(base)
  if (slug !== 'index') ensure_h1(dest, title)

  const content = fs.readFileSync(dest, 'utf8')
  const parts = [...(rel ? rel.split('/') : []), ...(slug === 'index' ? [] : [slug])]
  return meta.build_page({
    slug,
    title,
    url:       '/' + parts.join('/') || '/',
    content,
    published: fm.date ? String(fm.date).slice(0, 10) : '',
    created:   fs.statSync(src_entry).mtime.toISOString().slice(0, 10),
    fm,
  }, meta_cfg, embedder)
}


async function ingest_dir(src_dir, dest_dir, rel, meta_cfg, embedder) {
  /** Recursively mirror src_dir → dest_dir; return { pages, title } for flat meta + nav. */
  fs.mkdirSync(dest_dir, { recursive: true })
  const img_url = copy_images(src_dir, rel)
  const nav_nodes = []
  const pages = []

  for (const entry of fs.readdirSync(src_dir).sort()) {
    const src_entry = path.join(src_dir, entry)
    const stat = fs.statSync(src_entry)
    if (entry === 'images') continue  // handled by copy_images

    if (stat.isDirectory()) {
      const sub_rel = rel ? `${rel}/${entry}` : entry
      const sub = await ingest_dir(src_entry, path.join(dest_dir, entry), sub_rel, meta_cfg, embedder)
      pages.push(...sub.pages)
      nav_nodes.push({ slug: entry, name: sub.title, type: 'folder' })
      continue
    }

    const is_md  = entry.endsWith('.md')
    const is_mdx = entry.endsWith('.mdx')
    if (!is_md && !is_mdx) continue

    const base = path.basename(entry, is_mdx ? '.mdx' : '.md')
    const slug = (base === 'home' || base === 'index') ? 'index' : base
    const page = await ingest_page(src_entry, dest_dir, rel, slug, base, img_url, meta_cfg, embedder)
    pages.push(page)
    nav_nodes.push({
      slug, name: page.name, type: 'page', url: page.url,
      published: page.published, metrics: page.metrics, tags: page.tags,
    })
  }

  const sorted = sort_entries(nav_nodes, rel)
  const index  = sorted.find(n => n.slug === 'index')
  const title  = index ? index.name : slug_to_title(path.basename(src_dir))

  if (is_flatten(rel)) emit_feed(dest_dir, sorted, rel, title)
  else emit_nav(dest_dir, sorted, rel)

  return { pages, title }
}


function emit_nav(dest_dir, sorted, rel) {
  /** Emit navigation output for a regular directory: auto index redirect + _meta.json. */
  if (!fs.existsSync(path.join(dest_dir, 'index.mdx'))) auto_index(dest_dir, sorted, rel)

  // If index.mdx exists but wasn't a source page (auto-generated redirect), hide it from the sidebar
  const has_index  = sorted.some(n => n.slug === 'index')
  const meta_pairs = sorted.map(n => [n.slug, n.name])
  if (!has_index && fs.existsSync(path.join(dest_dir, 'index.mdx'))) {
    meta_pairs.unshift(['index', { display: 'hidden', title: '' }])
  }
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
}


function emit_feed(dest_dir, sorted, rel, dir_title) {
  /** Emit feed output for a flattened directory: dir-feed JSON, DirFeed page, hidden meta. */
  const feed_entries = sorted
    .filter(n => n.type === 'page' && n.slug !== 'index' && fs.existsSync(path.join(dest_dir, `${n.slug}.mdx`)))
    .map(n => ({
      url: n.url, title: n.name, date: n.published,
      categories: (n.tags || []).filter(t => t.group === 'user' || t.group === 'category').map(t => t.term),
      tags: (n.tags || []).map(t => t.term),
      reading_time: n.metrics && n.metrics.reading_time,
      content: extract_content(fs.readFileSync(path.join(dest_dir, `${n.slug}.mdx`), 'utf8')),
    }))
  const name = rel.replace(/\//g, '-') || 'root'
  fs.mkdirSync(path.join(PUB_DIR, 'dir-feeds'), { recursive: true })
  fs.writeFileSync(path.join(PUB_DIR, 'dir-feeds', `${name}.json`), JSON.stringify(feed_entries, null, 2) + '\n')

  // depth from pages/ to the DirFeed page file
  const depth    = rel ? rel.split('/').length : 1
  const rel_path = '../'.repeat(depth) + 'components/DirFeed'
  const page = [`---`, `title: ${dir_title}`, `---`, ``, `import DirFeed from '${rel_path}'`, ``, `<DirFeed dir="${rel}" />`].join('\n') + '\n'

  if (rel) {
    // Non-root: write DirFeed as sibling .mdx file so Nextra treats it as a flat page (not a folder)
    fs.writeFileSync(path.join(dest_dir, '..', path.basename(dest_dir) + '.mdx'), page)
  } else {
    // Root: write index.mdx directly (no parent directory above pages/)
    fs.writeFileSync(path.join(dest_dir, 'index.mdx'), page)
  }

  // No index entry in meta — individual pages hidden, index.mdx not generated inside directory
  const meta_pairs = sorted.filter(n => n.slug !== 'index').map(n => [n.slug, { display: 'hidden', title: '' }])
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
}


// --- Consumer extension points ---

function sync_components(components_dir) {
  /** Mirror consumer-supplied React components into components/custom/ so content
   *  MDX can import them (e.g. `import X from '../components/custom/X'`). The
   *  directory is regenerated each build; an empty/unset config leaves it empty. */
  const dest = path.join(ROOT, 'components', 'custom')
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })

  if (!components_dir || !fs.existsSync(components_dir)) return []

  const copied = fs.readdirSync(components_dir).filter(f => /\.(jsx?|tsx?)$/.test(f))
  for (const file of copied) {
    fs.copyFileSync(path.join(components_dir, file), path.join(dest, file))
  }
  return copied
}


function sync_assets(assets_dir) {
  /** Mirror consumer-supplied static assets into public/assets/ so pages can
   *  fetch them at runtime (e.g. `${basePath}/assets/graph.json`). The
   *  directory is regenerated each build; an empty/unset config removes it. */
  const dest = path.join(PUB_DIR, 'assets')
  fs.rmSync(dest, { recursive: true, force: true })

  if (!assets_dir || !fs.existsSync(assets_dir)) return []

  fs.cpSync(assets_dir, dest, { recursive: true })
  return fs.readdirSync(dest)
}


// --- Pipeline entry ---

async function run(config) {
  /** Execute the full ingest pipeline: mirror files, build flat site-meta.json with local tags. */
  _config = config
  const src = config.content
  const meta_cfg = config.meta || {
    max_keywords: 32, page_tags: 5, section_tags: 8, related_links: 3, min_relevance: 0.2,
  }

  console.log(`\nIngesting from: ${src}`)
  console.log(`  Tagging pages locally (max_keywords=${meta_cfg.max_keywords}, page_tags=${meta_cfg.page_tags}, section_tags=${meta_cfg.section_tags}, min_relevance=${meta_cfg.min_relevance ?? 0.2})`)

  fs.rmSync(PAGES,   { recursive: true, force: true })
  fs.rmSync(PUB_IMG, { recursive: true, force: true })
  fs.rmSync(SITE_META, { force: true })

  const embedder = tags.default_embedder
  const { pages } = await ingest_dir(src, PAGES, '', meta_cfg, embedder)

  console.log(`  Scoring related pages (related_links=${meta_cfg.related_links ?? 3})`)
  await tags.fill_related(pages, { related_links: meta_cfg.related_links ?? 3, embedder })

  // Stable order by url for diffs / tooling
  pages.sort((a, b) => a.url.localeCompare(b.url))
  fs.writeFileSync(SITE_META, JSON.stringify({ pages }, null, 2) + '\n')
  console.log(`  Wrote site metadata (${pages.length} pages) to public/site-meta.json`)

  const app_src = path.join(ROOT, '_app.jsx')
  if (fs.existsSync(app_src)) fs.copyFileSync(app_src, path.join(PAGES, '_app.jsx'))

  const custom = sync_components(config.components)
  if (custom.length) console.log(`  Synced ${custom.length} custom component(s) into components/custom/`)

  const assets = sync_assets(config.assets)
  if (assets.length) console.log(`  Synced ${assets.length} asset(s) into public/assets/`)

  console.log(`  Mirrored source tree into pages/`)
  console.log('Done.\n')

  _config = null
}


// --- Exports ---

module.exports = {
  parse_fm, strip_fm, first_h1, sort_entries, extract_content, auto_index,
  ensure_h1, rewrite_md_links, norm_path, slug_to_title,
  sync_assets, sync_components, run,
}


// --- Main (direct invocation: npm run ingest [source-dir]) ---
// Reads mdsite.yaml when present (site.config.js fallback).

if (require.main === module) {
  const yaml_path = path.join(ROOT, 'mdsite.yaml')
  const cfg = fs.existsSync(yaml_path)
    ? require('./config').load_config(yaml_path)
    : { ...require('../site.config'), content: path.join(ROOT, 'docs'), meta: { max_keywords: 32, page_tags: 5, section_tags: 8, related_links: 3, min_relevance: 0.2 } }
  if (process.argv[2]) cfg.content = path.resolve(process.argv[2])

  run(cfg).catch(err => { console.error(err.message); process.exit(1) })
}
