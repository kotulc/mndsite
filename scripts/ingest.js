/**
 * Content ingestion pipeline.
 * Mirrors a publication-ready Markdown/MDX tree into the Next.js pages/ directory
 * and writes flat page metadata to public/site-meta.json.
 *
 * - Renames .md → .mdx (home.md or index.md at any level → index.mdx)
 * - Preserves frontmatter on output pages; renderer metadata mirrors to site-meta.json
 * - Copies _assets/ and images/ subtrees to public/
 * - Auto-generates _meta.json at each level; sort order: nav_order > alpha
 * - Generates missing landing pages and can render the homepage as a page feed
 *
 * Does not extract keywords, run embeddings, flatten directories, or rewrite links.
 *
 * Usage: node scripts/ingest.js [source-dir]   (default: docs/)
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { randomUUID } = require('crypto')
const { execFileSync } = require('child_process')
const yaml = require('js-yaml')
const { strip_dir } = require('./fix-exif')
const meta = require('./meta')
const { plain_text } = require('./text')
const { readingDepth, readingMarkup } = require('./reading-cards')
const { feed_entries, write_rss } = require('./rss')


const ROOT = path.join(__dirname, '..')
const MD_LINK = /\]\((?!https?:)([^)\s]+\.mdx?)(?:#[^)]*)?\)/g
const ASSET_IMPORT = /^import\s.*from\s+['"](\S*_assets\/\S+)['"]/gm


function build_targets(root) {
  /** Generated framework targets. `config.root` redirects them (tests use a temp tree). */
  const pub = path.join(root, 'public')
  return {
    pages:  path.join(root, 'pages'),
    custom: path.join(root, 'components', 'custom'),
    public: pub,
    images: path.join(pub, 'images'),
    assets: path.join(pub, '_assets'),
    meta:   path.join(pub, 'site-meta.json'),
  }
}


let TARGET = build_targets(ROOT)
let _warnings = []

let _config = null
function get_config() { return _config || require('../site.config') }


function set_target_root(root) {
  /** Redirect the generated targets; tests point them at a temp tree. */
  TARGET = build_targets(root || ROOT)
}


function parse_fm(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  try { return yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {} } catch { return {} }
}


function strip_fm(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/^\s*\n/, '')
}


function fm_block(content) {
  /** The frontmatter block as supplied, kept verbatim on the emitted page. */
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? match[0].replace(/\n*$/, '\n\n') : ''
}


function set_fm_title(block, title) {
  /** Stamp the resolved title onto the emitted frontmatter. Nextra reads its <title> and
   *  search index from this key, so it must agree with the nav label `fields.title` gave. */
  const line = `title: ${JSON.stringify(title)}`
  if (!block) return `---\n${line}\n---\n\n`
  // Only a top-level key: a nested `title:` (a related entry, say) is always indented.
  if (/^title:/m.test(block)) return block.replace(/^title:.*$/m, line)
  return block.replace(/^---\r?\n/, `---\n${line}\n`)
}


function check_refs(body, url) {
  /** Collect references the build cannot resolve — upstream owns link and import rewriting.
   *  Internal .md links 404 once exported; _assets/ imports leave the module graph. */
  for (const match of body.matchAll(MD_LINK)) _warnings.push(`${url} → ${match[1]}`)
  for (const match of body.matchAll(ASSET_IMPORT)) _warnings.push(`${url} → import ${match[1]}`)
}


function fallback_title(src_entry, rel, slug, base) {
  /** Title when frontmatter supplies none: the filename stem, or for a directory landing
   *  page the directory it titles — the site title at the content root. Never the H1. */
  if (slug !== 'index') return slug_to_title(base)
  if (!rel) return get_config().title || slug_to_title(base)
  return slug_to_title(path.basename(path.dirname(src_entry)))
}


function rewrite_img_refs(content, img_url) {
  return content.replace(/\]\(images\//g, `](${img_url}/`)
}


function rewrite_asset_refs(content) {
  /** Rewrite mndmap _assets relative paths to absolute public URLs. */
  let out = content
    .replace(/\]\(\.\.\/_assets\//g, '](/_assets/')
    .replace(/\]\(\.\/_assets\//g, '](/_assets/')
  // Nextra's image pipeline rejects SVG markdown images — emit an <img> instead. Raw tags
  // skip the pipeline's base-path handling, so resolve it from the build environment.
  out = out.replace(/!\[([^\]]*)\]\(\/_assets\/([^)]+\.svg)\)/gi,
    '<img src={`${process.env.NEXT_PUBLIC_BASE_PATH || \'\'}/_assets/$2`} alt="$1" />')
  return out
}


function escape_svg_for_mdx(content) {
  /** MDX treats `{` as JSX — escape braces inside inline SVG style blocks. */
  return content.replace(/<svg[\s\S]*?<\/svg>/gi, svg =>
    svg.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
  )
}


function prepare_body(raw, img_url) {
  let body = strip_fm(raw)
  if (img_url) body = rewrite_img_refs(body, img_url)
  body = rewrite_asset_refs(body)
  body = escape_svg_for_mdx(body)
  return body
}


function extract_content(mdx) {
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


function toSearchText(markdown) {
  return plain_text(markdown
    .replace(/^\s*(?:```|~~~).*$/gm, ' ')
    .replace(/^( {0,3}#{2,6}[ \t]+.*?)\s+\[#[a-z0-9-]+\](?=[ \t]*#*[ \t]*$)/gm, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))
}


function slug_to_title(s) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function norm_path(p) {
  return (p || '').replace(/^\/+|\/+$/g, '')
}


function sort_entries(nodes, rel) {
  /** Sort directory children: nav_order pins listed slugs first, rest alphabetical. */
  const idx  = nodes.filter(n => n.slug === 'index')
  const rest = nodes.filter(n => n.slug !== 'index')
  const nav_map = Object.fromEntries(
    Object.entries(get_config().nav_order || {}).map(([k, v]) => [norm_path(k), v])
  )
  const nav = nav_map[rel]

  if (Array.isArray(nav)) {
    const rank     = Object.fromEntries(nav.map((s, i) => [s, i]))
    const pinned   = rest.filter(n => rank[n.slug] != null).sort((a, b) => rank[a.slug] - rank[b.slug])
    const unpinned = rest.filter(n => rank[n.slug] == null).sort((a, b) => a.slug.localeCompare(b.slug))
    return [...idx, ...pinned, ...unpinned]
  }

  return [...idx, ...rest.sort((a, b) => a.slug.localeCompare(b.slug))]
}


function auto_index(dest_dir, sorted, rel) {
  /** Generate a redirect index.mdx to the first leaf page, so a directory that supplies no
   *  landing page still resolves. AutoRedirect handles BASE_PATH. No-op when one exists. */
  if (fs.existsSync(path.join(dest_dir, 'index.mdx'))) return null

  const first = sorted.find(n => n.type === 'page')
    || sorted.find(n => fs.existsSync(path.join(dest_dir, n.slug, 'index.mdx')))
  if (!first) return null

  const url = rel ? `/${rel}/${first.slug}/` : `/${first.slug}/`
  const import_path = '../'.repeat(rel ? rel.split('/').length + 1 : 1) + 'components/AutoRedirect'

  fs.writeFileSync(path.join(dest_dir, 'index.mdx'), [
    '---',
    `title: ${JSON.stringify(first.name)}`,
    'auto_redirect: true',
    '---',
    '',
    `import AutoRedirect from '${import_path}'`,
    '',
    `<AutoRedirect to="${url}" />`,
  ].join('\n') + '\n')

  return first
}


function write_meta(dest_path, entries) {
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  fs.writeFileSync(dest_path, `{\n${lines.join(',\n')}\n}\n`)
}


function copy_dir(src, dest) {
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return []
  fs.mkdirSync(dest, { recursive: true })
  const copied = []
  for (const f of fs.readdirSync(src)) {
    const sf = path.join(src, f)
    const df = path.join(dest, f)
    if (fs.statSync(sf).isDirectory()) copied.push(...copy_dir(sf, df))
    else { fs.copyFileSync(sf, df); copied.push(f) }
  }
  return copied
}


function copy_images(src_dir, rel) {
  /** Copy src_dir/images/ into public/images/<rel>/ for legacy standalone content. */
  const img_url  = '/images' + (rel ? `/${rel}` : '')
  const img_src  = path.join(src_dir, 'images')
  const img_dest = path.join(TARGET.images, rel)

  if (fs.existsSync(img_src) && fs.statSync(img_src).isDirectory()) {
    copy_dir(img_src, img_dest)
    strip_dir(img_dest)
  }
  return img_url
}


function copy_content_assets(src_dir) {
  /** Copy content-root _assets/ into public/_assets/ (mndmap handoff contract). */
  const asset_src = path.join(src_dir, '_assets')
  if (!fs.existsSync(asset_src) || !fs.statSync(asset_src).isDirectory()) return []
  return copy_dir(asset_src, TARGET.assets)
}


function ingest_page(src_entry, dest_dir, rel, slug, base, img_url) {
  const raw = fs.readFileSync(src_entry, 'utf8').replace(/\r\n?/g, '\n')
  const fm  = parse_fm(raw)

  const config = get_config()
  const frontmatter = config.frontmatter || {}
  // A null mapping disables the field, so no frontmatter key names the title at all.
  const key   = 'title' in frontmatter ? frontmatter.title : 'title'
  const title = (key && meta.field_value(fm, key)) || fallback_title(src_entry, rel, slug, base)

  const dest = path.join(dest_dir, `${slug}.mdx`)
  const body = prepare_body(raw, img_url)
  const parts = [...(rel ? rel.split('/') : []), ...(slug === 'index' ? [] : [slug])]
  const url   = '/' + parts.join('/') || '/'
  const listing = (url === '/' && config.homepage_feed) || (config.feed?.cards && url === config.feed.path)
  const depth = listing ? 0 : readingDepth(fm, config)
  const importPath = path.relative(dest_dir, path.join(TARGET.custom, '..', 'ReadingArticle')).split(path.sep).join('/')
  fs.writeFileSync(dest, set_fm_title(fm_block(raw), title) + readingMarkup(body, depth, fm.reading_cards, importPath))
  check_refs(body, url)

  const page = meta.build_page({
    slug,
    title,
    url,
    content: body,
    source:  [rel, path.basename(src_entry)].filter(Boolean).join('/'),
    created: fs.statSync(src_entry).mtime.toISOString().slice(0, 10),
    fm,
  }, config)
  if (depth) page.reading_cards = true
  return page
}


function ingest_dir(src_dir, dest_dir, rel, excluded) {
  fs.mkdirSync(dest_dir, { recursive: true })
  const img_url = copy_images(src_dir, rel)
  const nav_nodes = []
  const pages = []
  const reading_paths = new Map()

  for (const entry of fs.readdirSync(src_dir).sort()) {
    const src_entry = path.join(src_dir, entry)
    if (excluded.has(src_entry)) continue
    const stat = fs.statSync(src_entry)
    if (entry === 'images' || entry === '_assets') continue

    if (stat.isDirectory()) {
      const sub_rel = rel ? `${rel}/${entry}` : entry
      const sub = ingest_dir(src_entry, path.join(dest_dir, entry), sub_rel, excluded)
      pages.push(...sub.pages)
      nav_nodes.push({ slug: entry, name: sub.title, type: 'folder' })
      reading_paths.set(entry, sub.reading_order)
      continue
    }

    const is_md  = entry.endsWith('.md')
    const is_mdx = entry.endsWith('.mdx')
    if (!is_md && !is_mdx) continue

    const base = path.basename(entry, is_mdx ? '.mdx' : '.md')
    const slug = (base === 'home' || base === 'index') ? 'index' : base
    const page = ingest_page(src_entry, dest_dir, rel, slug, base, img_url)
    pages.push(page)
    reading_paths.set(slug, [page.url])
    nav_nodes.push({
      slug, name: page.name, type: 'page', url: page.url,
      published: page.published, facets: page.facets,
    })
  }

  const sorted    = sort_entries(nav_nodes, rel)
  const index = sorted.find(n => n.slug === 'index')
  const title = index?.name || slug_to_title(path.basename(src_dir))
  let generated_index
  if (!rel && _config.homepage_feed) {
    const landing = path.join(dest_dir, 'index.mdx')
    if (!index) {
      fs.writeFileSync(landing, '---\ntitle: Pages\n---\n\n# Pages\n')
      generated_index = { display: 'hidden', theme: { toc: false, pagination: false } }
    }
    fs.appendFileSync(landing, "\n\nimport PageFeed from '../components/feed/PageFeed'\n\n<PageFeed />\n")
  } else if (auto_index(dest_dir, sorted, rel)) {
    generated_index = { display: 'hidden' }
  }

  // Generated home and redirect pages stay out of the site tree.
  const meta_pairs = sorted.map(node => [node.slug, node.name])
  if (generated_index) meta_pairs.unshift(['index', generated_index])
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)

  // Visit the section landing page before its children, then follow the exported navigation order.
  const reading_order = [
    ...(index ? [index.url] : []),
    ...Object.keys(Object.fromEntries(meta_pairs)).flatMap(slug => slug === 'index' ? [] : reading_paths.get(slug) || []),
  ]
  return { pages, title, reading_order }
}


function sync_components(components_dir) {
  const dest = TARGET.custom
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
  const dest = path.join(TARGET.public, 'assets')
  fs.rmSync(dest, { recursive: true, force: true })

  if (!assets_dir || !fs.existsSync(assets_dir)) return []

  fs.cpSync(assets_dir, dest, { recursive: true })
  return fs.readdirSync(dest)
}

function add_meta_entry(directory, slug, value) {
  const file = path.join(directory, '_meta.json')
  const entries = fs.existsSync(file) ? Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))) : []
  write_meta(file, [...entries, [slug, value]])
}

function write_feed_page(config, pages, entries) {
  const feed = config.feed
  if (!feed?.path || (!feed.cards && !config.rss) || (feed.path === '/' && config.homepage_feed)) return
  const authored = pages.some(page => page.url === feed.path)
  if (authored && !feed.cards) return

  const parts = feed.path.split('/').filter(Boolean)
  const target = path.join(TARGET.pages, ...parts)
  const index = fs.existsSync(target) && !fs.existsSync(target + '.mdx')
  const landing = index ? path.join(target, 'index.mdx') : target + '.mdx'
  if (!index && !authored) {
    let parent = TARGET.pages
    for (const part of parts.slice(0, -1)) {
      const child = path.join(parent, part)
      if (!fs.existsSync(child)) {
        if (!fs.existsSync(child + '.mdx')) add_meta_entry(parent, part, { display: 'children' })
        fs.mkdirSync(child)
      }
      parent = child
    }
    add_meta_entry(parent, parts.at(-1), { display: 'hidden' })
  }

  if (!authored) {
    const title = feed.cards ? 'Feed' : slug_to_title(parts.at(-1) || 'Feed')
    fs.writeFileSync(landing, `---\ntitle: ${JSON.stringify(title)}\npagination: false\n---\n\n# ${title}\n`)
  }
  if (feed.cards) {
    const root = '../'.repeat(parts.length + Number(index))
    fs.appendFileSync(landing, `\n\nimport PublishedFeed from '${root}components/feed/PublishedFeed'\n\n<PublishedFeed />\n`)
  } else {
    const links = entries.map(({ page }) =>
      `- <Link href={${JSON.stringify(page.url)}}>{${JSON.stringify(page.name)}}</Link>`)
    fs.appendFileSync(landing, "\nimport Link from 'next/link'\n\n" + links.join('\n') + '\n')
  }
}

async function write_expandable_feed(config, entries) {
  if (!config.feed?.cards) return
  const { card_meta } = await import('../components/feed/card-meta.mjs')
  const cards = entries.map(({ page }) => {
    const raw = fs.readFileSync(path.join(config.content, page.source), 'utf8')
    const frontmatter = parse_fm(raw)
    const sources = Array.isArray(frontmatter.sources) ? frontmatter.sources.filter(source => typeof source?.url === 'string')
      .map(source => Object.fromEntries(['url', 'kind', 'title', 'publisher', 'description', 'image_url', 'audio_url', 'video_url', 'placement']
        .filter(key => typeof source[key] === 'string').map(key => [key, source[key]]))) : []
    return {
      id: page.url, title: page.name, date: page.published, summary: page.desc || page.excerpt,
      body: strip_fm(raw).replace(/^\s*#\s+.+\r?\n?/, ''), path: page.source,
      href: page.url, sources, ...card_meta(frontmatter, config.frontmatter?.facets),
    }
  })
  fs.writeFileSync(path.join(TARGET.public, 'post-feed.json'), JSON.stringify(cards) + '\n')

}

function remove_generated_browse_pages() {
  for (const slug of ['browse', 'browse-pages']) {
    const file = path.join(TARGET.pages, slug + '.mdx')
    if (fs.existsSync(file)) fs.rmSync(file)
  }
  const meta = path.join(TARGET.pages, '_meta.json')
  if (!fs.existsSync(meta)) return
  write_meta(meta, Object.entries(JSON.parse(fs.readFileSync(meta, 'utf8')))
    .filter(([slug]) => slug !== 'browse' && slug !== 'browse-pages'))
}

function write_browse_page(config) {
  if (config.homepage_feed) {
    remove_generated_browse_pages()
    return '/'
  }
  let slug = 'browse'
  while (fs.existsSync(path.join(TARGET.pages, slug)) || fs.existsSync(path.join(TARGET.pages, slug + '.mdx'))) {
    slug += '-pages'
  }
  fs.writeFileSync(path.join(TARGET.pages, slug + '.mdx'),
    "---\ntitle: Pages\n---\n\nimport Browse from '../components/Browse'\n\n# Pages\n\n<Browse />\n")
  add_meta_entry(TARGET.pages, slug, { display: 'hidden', theme: { toc: false, pagination: false } })
  return '/' + slug
}

// Media assets can be large. Compare them a block at a time before notifying Next.
function same_contents(source, dest, size) {
  if (size <= 65536) return fs.readFileSync(source).equals(fs.readFileSync(dest))
  const left = Buffer.allocUnsafe(65536)
  const right = Buffer.allocUnsafe(left.length)
  const src = fs.openSync(source, 'r')
  try {
    const dst = fs.openSync(dest, 'r')
    try {
      for (let offset = 0; offset < size; offset += left.length) {
        const length = Math.min(left.length, size - offset)
        if (fs.readSync(src, left, 0, length, offset) !== length ||
            fs.readSync(dst, right, 0, length, offset) !== length ||
            !left.subarray(0, length).equals(right.subarray(0, length))) return false
      }
      return true
    } finally {
      fs.closeSync(dst)
    }
  } finally {
    fs.closeSync(src)
  }
}

// Publish completed files into the live tree. Unchanged routes retain their mtimes
// so Next's watcher keeps their compiled modules across content edits.
function sync_output(source, dest) {
  const current = fs.lstatSync(dest, { throwIfNoEntry: false })
  const incoming = fs.statSync(source, { throwIfNoEntry: false })
  if (current && (!incoming || current.isDirectory() !== incoming.isDirectory())) {
    fs.rmSync(dest, { recursive: true, force: true })
  }
  if (!incoming) return
  if (incoming.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    const names = new Set(fs.readdirSync(source))
    for (const name of names) sync_output(path.join(source, name), path.join(dest, name))
    for (const name of fs.readdirSync(dest)) {
      if (!names.has(name)) fs.rmSync(path.join(dest, name), { recursive: true, force: true })
    }
    return
  }
  if (current?.isFile() && current.size === incoming.size &&
      same_contents(source, dest, incoming.size)) return
  const temp = dest + '.' + randomUUID() + '.tmp'
  try {
    fs.copyFileSync(source, temp)
    fs.renameSync(temp, dest)
  } finally {
    fs.rmSync(temp, { force: true })
  }
}

async function generate(config) {
  const src = config.content
  console.log(`\nIngesting from: ${src}`)

  const assets = copy_content_assets(src)
  if (assets.length) console.log(`  Copied _assets/ (${assets.length} file(s))`)

  const workspace = config.dir || ROOT
  const excluded = new Set(['drafts', ...(config.drafts || [])].map(file => path.resolve(workspace, file)))
  const { pages, reading_order } = ingest_dir(src, TARGET.pages, '', excluded)
  const entries = feed_entries(pages, config.feed)
  write_feed_page(config, pages, entries)
  const browse = write_browse_page(config)
  pages.sort((a, b) => a.url.localeCompare(b.url))
  fs.mkdirSync(TARGET.public, { recursive: true })
  const readingPages = pages.filter(page => page.reading_cards)
  const readingFiles = readingPages.map(page => path.join(TARGET.pages, path.dirname(page.source), page.slug + '.mdx'))
  const sectionIndexes = readingFiles.length ? JSON.parse(execFileSync(
    process.execPath, [path.join(__dirname, 'index-reading-cards.mjs')],
    { input: JSON.stringify(readingFiles), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )) : []
  const sectionsByPage = new Map()
  for (const [index, page] of readingPages.entries()) {
    const cards = sectionIndexes[index]
    if (cards.length) {
      page.reading_cards = cards.filter(card => card.level === 2).map(card => card.id)
      sectionsByPage.set(page.url, cards)
    } else {
      delete page.reading_cards
    }
  }
  const metadata = { browse, pages, ...(config.homepage_feed && { reading_order }) }
  fs.writeFileSync(TARGET.meta, JSON.stringify(metadata, null, 2) + '\n')
  const search = Object.fromEntries(pages.map(page => {
    const raw = fs.readFileSync(path.join(src, page.source), 'utf8')
    const body = extract_content(raw)
    const text = toSearchText(body)
    const cards = sectionsByPage.get(page.url)
    return [page.url, cards ? { text, cards } : text]
  }))
  fs.writeFileSync(path.join(TARGET.public, 'search-index.json'), JSON.stringify(search) + '\n')
  await write_expandable_feed(config, entries)
  write_rss(TARGET.public, entries, config)
  console.log(`  Wrote site metadata (${pages.length} pages) to public/site-meta.json`)

  for (const name of ['_app.jsx', '_document.jsx']) {
    fs.copyFileSync(path.join(ROOT, name), path.join(TARGET.pages, name))
  }

  const custom = sync_components(config.components)
  if (custom.length) console.log(`  Synced ${custom.length} custom component(s) into components/custom/`)

  const extra = sync_assets(config.assets)
  if (extra.length) console.log(`  Synced ${extra.length} asset(s) into public/assets/`)

  if (_warnings.length) {
    console.warn(`  Warning: ${_warnings.length} unresolvable reference(s) — upstream must emit final routes`)
    for (const link of _warnings.slice(0, 5)) console.warn(`    ${link}`)
  }

  console.log(`  Mirrored source tree into pages/`)
  console.log('Done.\n')

}

async function run(config) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-stage-'))
  const live = build_targets(config.root || ROOT)
  TARGET = build_targets(staging)
  _config = config
  _warnings = []
  try {
    await generate(config)
    fs.mkdirSync(live.public, { recursive: true })
    fs.mkdirSync(path.dirname(live.custom), { recursive: true })
    for (const key of ['images', 'assets', 'custom', 'meta']) sync_output(TARGET[key], live[key])
    for (const name of ['assets', 'post-feed.json', 'search-index.json']) {
      sync_output(path.join(TARGET.public, name), path.join(live.public, name))
    }
    if (config.rss) sync_output(path.join(TARGET.public, 'rss.xml'), path.join(live.public, 'rss.xml'))
    else write_rss(live.public, [], config)
    sync_output(TARGET.pages, live.pages)
  } finally {
    TARGET = build_targets(ROOT)
    _config = null
    fs.rmSync(staging, { recursive: true, force: true })
  }
}


module.exports = {
  parse_fm, strip_fm, fm_block, set_fm_title, fallback_title, auto_index, sort_entries, extract_content,
  norm_path, slug_to_title, sync_assets, sync_components, set_target_root, run,
}


if (require.main === module) {
  const yaml_path = path.join(ROOT, 'mndsite.yaml')
  const has_yaml = fs.existsSync(yaml_path)
  const cfg = has_yaml
    ? require('./config').load_config(yaml_path)
    : { ...require('../site.config'), content: path.join(ROOT, 'docs') }
  if (process.argv[2]) cfg.content = path.resolve(process.argv[2])
  // Regenerate site.config.js too, or `display` edits stay invisible until a full build
  if (has_yaml) require('./config').write_site_config(cfg)

  run(cfg).catch(err => { console.error(err.message); process.exit(1) })
}
