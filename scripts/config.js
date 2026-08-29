/**
 * YAML config loader for the mndsite CLI.
 * Reads mndsite.yaml, validates it, applies defaults, and generates site.config.js so
 * Next.js and Nextra can consume the config at build time.
 *
 * `fields` names the frontmatter keys mndsite reads; `facets` declares the content
 * dimensions rendered as page chips and as optional sidebar indexes. Frontmatter is
 * inert unless named here.
 *
 * Every optional key has a named default — `none`, `auto`, or `default` — so no value in
 * the file is ever blank. The loader resolves those tokens to the built-in behavior.
 * On/off facet flags are booleans; enums are used only when several values are valid.
 */
const fs   = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const yaml = require('js-yaml')
const { resolve_theme } = require('./theme')
const { normalize_semver } = require('./semver')


// Elements each display list accepts. `header` also accepts any declared facet name.
// `toc` is the right sidebar; `contents` is the inline panel behind the Contents button.
const DISPLAY_ELEMENTS = {
  crumbs:   ['home', 'path'],
  header:   ['date', 'reading_time', 'facets'],
  toc:      ['description', 'sections', 'related', 'edit'],
  contents: ['description', 'sections', 'related', 'edit'],
  navbar:   ['theme', 'feed', 'github'],
}

// Per-host "Edit this page" URL templates. Hosts without an entry fall back to repo_url.
const EDIT_TEMPLATES = {
  'github.com':    '{repo_url}/edit/{branch}/{file}',
  'gitlab.com':    '{repo_url}/-/edit/{branch}/{file}',
  'bitbucket.org': '{repo_url}/src/{branch}/{file}?mode=edit',
}

// Chip hues, reused for facets that do not name a color (assigned in declaration order).
const FACET_COLORS = { blue: 210, violet: 265, amber: 35, rose: 340, green: 150, teal: 190 }
const COLOR_ORDER = Object.keys(FACET_COLORS)
const FACET_SORTS = ['alpha', 'semver', 'date', 'listed']

// Tokens naming a key's built-in behavior rather than a value. A blank reads the same.
const UNSET_TOKENS = new Set(['', 'none', 'auto', 'default'])


const DEFAULTS = {
  description:    'none',
  repo_url:       'none',
  feed_url:       'none',
  footer:         'default',
  theme:          { color: 'default', typeset: 'sans', navbar: 'none', footer: 'none' },
  display: {
    crumbs: ['home', 'path'],
    header: ['date', 'reading_time', 'facets'],
    toc:    ['description', 'sections', 'related', 'edit'],
    navbar: ['theme', 'feed', 'github'],
  },
  edit:           { branch: 'main', path: 'auto', url: 'auto' },
  nav_order:      {},
  fields: {
    title:        'title',
    description:  ['description', 'desc'],
    date:         'date',
    reading_time: 'reading_time',
    related:      'related',
    identity:     'doc_id',
  },
  facets: {
    categories: { field: 'categories', label: 'Category', color: 'blue' },
    tags:       { field: 'tags',       label: 'Tag',      color: 'violet' },
  },
  content:        './docs',
  output:         './dist',
  components:     'none',
  assets:         'none',
}


function unset(value) {
  /** True when a value names its built-in behavior (none/auto/default) or is blank. */
  return value == null || UNSET_TOKENS.has(String(value).trim().toLowerCase())
}


function optional(value) {
  /** An optional string; its default token resolves to '' for the consuming component. */
  return unset(value) ? '' : String(value).trim()
}


function label_for(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function resolve_hue(name, color, index) {
  /** Named token, raw hue number, or the next token in declaration order. */
  if (unset(color)) return FACET_COLORS[COLOR_ORDER[index % COLOR_ORDER.length]]
  if (FACET_COLORS[color] != null) return FACET_COLORS[color]
  const hue = Number(color)
  if (Number.isFinite(hue) && hue >= 0 && hue < 360) return hue
  throw new Error(
    `mndsite.yaml: unknown facets.${name}.color '${color}' — use ${COLOR_ORDER.join(', ')} or a hue 0-359`
  )
}


function as_bool(name, value, fallback = false) {
  /** On/off flags. Absent is the fallback; anything other than a YAML boolean throws. */
  if (value == null || value === '') return fallback
  if (typeof value === 'boolean') return value
  throw new Error(`mndsite.yaml: ${name} must be true or false`)
}


function resolve_release(config_dir) {
  /** Site release: package.json version, then the nearest git tag. Empty if neither. */
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(config_dir, 'package.json'), 'utf8'))
    const v = normalize_semver(pkg.version)
    if (v) return v
  } catch { /* no package.json beside the YAML */ }
  try {
    const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: config_dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return normalize_semver(tag) || ''
  } catch {
    return ''
  }
}


function resolve_facet(name, spec, index) {
  /** Fill one facet declaration: field is required, everything else has a default. */
  const cfg = { ...spec }
  if (!cfg.field) throw new Error(`mndsite.yaml: facets.${name} requires a 'field'`)

  cfg.label = cfg.label || label_for(name)
  cfg.sort  = cfg.sort || 'alpha'
  cfg.hue   = resolve_hue(name, cfg.color, index)
  cfg.index   = as_bool(`facets.${name}.index`, cfg.index)
  cfg.inherit = as_bool(`facets.${name}.inherit`, cfg.inherit)
  cfg.history = as_bool(`facets.${name}.history`, cfg.history)
  cfg.default = unset(cfg.default) ? '' : String(cfg.default).trim()
  cfg.group_by = unset(cfg.group_by) ? '' : String(cfg.group_by).trim()

  if (!FACET_SORTS.includes(cfg.sort)) {
    throw new Error(`mndsite.yaml: unknown facets.${name}.sort '${cfg.sort}' — use ${FACET_SORTS.join(', ')}`)
  }
  if (cfg.values != null && !Array.isArray(cfg.values)) {
    throw new Error(`mndsite.yaml: facets.${name}.values must be a list`)
  }
  return cfg
}


function resolve_facets(raw) {
  const entries = Object.entries(raw || DEFAULTS.facets)
  const facets = Object.fromEntries(entries.map(([name, spec], i) => [name, resolve_facet(name, spec || {}, i)]))
  for (const [name, spec] of Object.entries(facets)) {
    if (spec.group_by && !facets[spec.group_by]) {
      throw new Error(`mndsite.yaml: facets.${name}.group_by references unknown facet '${spec.group_by}'`)
    }
  }
  return facets
}


function resolve_display(raw, facets) {
  /** Element lists: order is display order, and omission disables the element. The
   *  inline Contents panel mirrors the sidebar unless `contents` is given its own list. */
  for (const list of Object.keys(raw || {})) {
    if (!DISPLAY_ELEMENTS[list]) {
      throw new Error(
        `mndsite.yaml: unknown display list '${list}' — use ${Object.keys(DISPLAY_ELEMENTS).join(', ')}`
      )
    }
  }

  const cfg = { ...DEFAULTS.display, ...(raw || {}) }
  if (!Array.isArray(cfg.toc)) throw new Error(`mndsite.yaml: display.toc must be a list`)
  if (!cfg.contents) cfg.contents = [...cfg.toc]

  for (const [list, allowed] of Object.entries(DISPLAY_ELEMENTS)) {
    const items = cfg[list]
    if (!Array.isArray(items)) throw new Error(`mndsite.yaml: display.${list} must be a list`)

    // Naming a facet in `header` places its values there regardless of index.
    const valid = list === 'header' ? [...allowed, ...Object.keys(facets)] : allowed
    for (const item of items) {
      if (!valid.includes(item)) {
        throw new Error(`mndsite.yaml: unknown display.${list} element '${item}' — use ${valid.join(', ')}`)
      }
    }
  }
  return cfg
}


function resolve_fields(raw) {
  /** Frontmatter key mappings. `none` disables one, so no key is read on its behalf. */
  const cfg = { ...DEFAULTS.fields, ...(raw || {}) }
  return Object.fromEntries(Object.entries(cfg).map(([name, key]) =>
    [name, Array.isArray(key) ? key : (unset(key) ? null : String(key))]
  ))
}


function content_in_repo(config_dir, content_dir) {
  /** Repo-relative location of the content root, assuming mndsite.yaml sits at the repo
   *  root. Anything outside that directory is unrepresentable — fall back to the root. */
  const rel = path.relative(config_dir, content_dir).split(path.sep).join('/')
  return !rel || rel.startsWith('..') || path.isAbsolute(rel) ? '' : rel
}


function resolve_edit(raw, repo_url, config_dir, content_dir) {
  /** "Edit this page" targets, used only when repo_url is set. An empty url template
   *  means the host is unknown, and the link falls back to repo_url itself. */
  const cfg = { ...DEFAULTS.edit, ...(raw || {}) }

  if (!cfg.branch) throw new Error(`mndsite.yaml: edit.branch must be a branch name`)
  cfg.path = unset(cfg.path)
    ? content_in_repo(config_dir, content_dir)
    : String(cfg.path).replace(/^\/+|\/+$/g, '')

  cfg.url = optional(cfg.url)
  if (!cfg.url && repo_url) {
    const host = (repo_url.match(/^https?:\/\/([^/]+)/) || [])[1] || ''
    cfg.url = EDIT_TEMPLATES[host.replace(/^www\./, '')] || ''
  }
  return cfg
}


function load_config(yaml_path) {
  const abs  = path.resolve(yaml_path)
  const dir  = path.dirname(abs)
  const raw  = yaml.load(fs.readFileSync(abs, 'utf8'))
  const cfg  = { ...DEFAULTS, ...raw }

  if (!cfg.title) throw new Error(`mndsite.yaml: 'title' is required`)

  for (const key of ['description', 'repo_url', 'feed_url', 'footer', 'components', 'assets']) {
    cfg[key] = optional(cfg[key])
  }

  // navbar/footer are optional background overrides; their 'none' default resolves to ''
  const theme = { ...DEFAULTS.theme, ...(raw.theme || {}) }
  theme.navbar = optional(theme.navbar)
  theme.footer = optional(theme.footer)

  cfg.theme       = resolve_theme(theme)
  cfg.fields      = resolve_fields(raw.fields)
  cfg.facets      = resolve_facets(raw.facets)
  cfg.display     = resolve_display(raw.display, cfg.facets)
  cfg.release     = resolve_release(dir)
  cfg.dir         = dir

  cfg.content = path.resolve(dir, cfg.content)
  cfg.output  = path.resolve(dir, cfg.output)
  cfg.edit    = resolve_edit(raw.edit, cfg.repo_url, dir, cfg.content)
  if (cfg.components) cfg.components = path.resolve(dir, cfg.components)
  if (cfg.assets)     cfg.assets     = path.resolve(dir, cfg.assets)

  return cfg
}


function write_site_config(config, dest_dir) {
  const dir  = dest_dir || path.join(__dirname, '..')
  const keys = [
    'title', 'repo_url', 'feed_url', 'description', 'footer',
    'theme', 'nav_order', 'fields', 'facets', 'release',
    'display', 'edit',
  ]
  const values = Object.fromEntries(keys.map(k => [k, config[k]]))
  const body = Object.entries(values)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join(',\n')

  fs.writeFileSync(
    path.join(dir, 'site.config.js'),
    `/** Generated by mndsite CLI — do not edit */\nmodule.exports = {\n${body},\n}\n`
  )
}


module.exports = { load_config, write_site_config, unset, DEFAULTS, FACET_COLORS }
