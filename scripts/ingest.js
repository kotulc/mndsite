/**
 * Content ingestion pipeline.
 * Mirrors a publication-ready Markdown/MDX tree into the Next.js pages/ directory
 * and writes flat page metadata to public/site-meta.json.
 *
 * - Renames .md → .mdx (home.md or index.md at any level → index.mdx)
 * - Preserves frontmatter on output pages; renderer metadata mirrors to site-meta.json
 * - Copies _assets/ and images/ subtrees to public/
 * - Auto-generates _meta.json at each level; sort order: nav_order > alpha
 *
 * Does not extract keywords, run embeddings, flatten directories, or rewrite links.
 *
 * Usage: node scripts/ingest.js [source-dir]   (default: docs/)
 */
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { strip_dir } = require('./fix-exif')
const meta = require('./meta')


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


function check_refs(body, url) {
  /** Collect references the build cannot resolve — upstream owns link and import rewriting.
   *  Internal .md links 404 once exported; _assets/ imports leave the module graph. */
  for (const match of body.matchAll(MD_LINK)) _warnings.push(`${url} → ${match[1]}`)
  for (const match of body.matchAll(ASSET_IMPORT)) _warnings.push(`${url} → import ${match[1]}`)
}


function first_h1(content) {
  const match = content.replace(/```[\s\S]*?```/g, '').match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
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

  const dest = path.join(dest_dir, `${slug}.mdx`)
  const body = prepare_body(raw, img_url)
  fs.writeFileSync(dest, fm_block(raw) + body)

  const title = fm.title || first_h1(body) || slug_to_title(base)
  const parts = [...(rel ? rel.split('/') : []), ...(slug === 'index' ? [] : [slug])]
  const url   = '/' + parts.join('/') || '/'
  check_refs(body, url)

  return meta.build_page({
    slug,
    title,
    url,
    content:   body,
    published: fm.date ? String(fm.date).slice(0, 10) : '',
    created:   fs.statSync(src_entry).mtime.toISOString().slice(0, 10),
    fm,
  })
}


function ingest_dir(src_dir, dest_dir, rel) {
  fs.mkdirSync(dest_dir, { recursive: true })
  const img_url = copy_images(src_dir, rel)
  const nav_nodes = []
  const pages = []

  for (const entry of fs.readdirSync(src_dir).sort()) {
    const src_entry = path.join(src_dir, entry)
    const stat = fs.statSync(src_entry)
    if (entry === 'images' || entry === '_assets') continue

    if (stat.isDirectory()) {
      const sub_rel = rel ? `${rel}/${entry}` : entry
      const sub = ingest_dir(src_entry, path.join(dest_dir, entry), sub_rel)
      pages.push(...sub.pages)
      nav_nodes.push({ slug: entry, name: sub.title, type: 'folder' })
      continue
    }

    const is_md  = entry.endsWith('.md')
    const is_mdx = entry.endsWith('.mdx')
    if (!is_md && !is_mdx) continue

    const base = path.basename(entry, is_mdx ? '.mdx' : '.md')
    const slug = (base === 'home' || base === 'index') ? 'index' : base
    const page = ingest_page(src_entry, dest_dir, rel, slug, base, img_url)
    pages.push(page)
    nav_nodes.push({
      slug, name: page.name, type: 'page', url: page.url,
      published: page.published, tags: page.tags,
    })
  }

  const sorted = sort_entries(nav_nodes, rel)
  const index  = sorted.find(n => n.slug === 'index')
  const title  = index ? index.name : slug_to_title(path.basename(src_dir))

  const meta_pairs = sorted.map(n => [n.slug, n.name])
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)

  return { pages, title }
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


async function run(config) {
  _config = config
  _warnings = []
  TARGET = build_targets(config.root || ROOT)
  const src = config.content

  console.log(`\nIngesting from: ${src}`)

  fs.rmSync(TARGET.pages,  { recursive: true, force: true })
  fs.rmSync(TARGET.images, { recursive: true, force: true })
  fs.rmSync(TARGET.assets, { recursive: true, force: true })
  fs.rmSync(TARGET.meta,   { force: true })

  const assets = copy_content_assets(src)
  if (assets.length) console.log(`  Copied _assets/ (${assets.length} file(s))`)

  const { pages } = ingest_dir(src, TARGET.pages, '')

  pages.sort((a, b) => a.url.localeCompare(b.url))
  fs.mkdirSync(TARGET.public, { recursive: true })
  fs.writeFileSync(TARGET.meta, JSON.stringify({ pages }, null, 2) + '\n')
  console.log(`  Wrote site metadata (${pages.length} pages) to public/site-meta.json`)

  const app_src = path.join(ROOT, '_app.jsx')
  if (fs.existsSync(app_src)) fs.copyFileSync(app_src, path.join(TARGET.pages, '_app.jsx'))

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

  TARGET = build_targets(ROOT)
  _config = null
}


module.exports = {
  parse_fm, strip_fm, fm_block, first_h1, sort_entries, extract_content,
  norm_path, slug_to_title, sync_assets, sync_components, run,
}


if (require.main === module) {
  const yaml_path = path.join(ROOT, 'mndsite.yaml')
  const cfg = fs.existsSync(yaml_path)
    ? require('./config').load_config(yaml_path)
    : { ...require('../site.config'), content: path.join(ROOT, 'docs') }
  if (process.argv[2]) cfg.content = path.resolve(process.argv[2])

  run(cfg).catch(err => { console.error(err.message); process.exit(1) })
}
