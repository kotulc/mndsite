/**
 * YAML config loader for the mndsite CLI.
 * Reads mndsite.yaml, validates it, applies defaults, and generates site.config.js so
 * Next.js and Nextra can consume the config at build time.
 */
const fs   = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { resolve_theme } = require('./theme')


const DISPLAY_ELEMENTS = {
  header:   ['date', 'reading_time', 'facets'],
  toc:      ['description', 'sections', 'related', 'edit'],
  navbar:   ['browse', 'feed', 'github', 'theme'],
}

const EDIT_TEMPLATES = {
  'github.com':    '{repo_url}/edit/{branch}/{file}',
  'gitlab.com':    '{repo_url}/-/edit/{branch}/{file}',
  'bitbucket.org': '{repo_url}/src/{branch}/{file}?mode=edit',
}

const FACET_COLORS = { blue: 210, violet: 265, amber: 35, rose: 340, green: 150, teal: 190 }
const COLOR_ORDER = Object.keys(FACET_COLORS)
const FACET_SORTS = ['alpha', 'date']

const UNSET_TOKENS = new Set(['', 'none', 'auto', 'default'])

const FACET_DEFAULTS = {
  categories: { key: ['categories'], label: 'Category', color: 'blue' },
  tags:       { key: ['tags'],       label: 'Tag',      color: 'violet' },
  status:     { key: ['status'],     label: 'Status',     color: 'amber' },
}

const DEFAULTS = {
  icon:           'none',
  description:    'none',
  repo_url:       'none',
  feed_url:       'none',
  rss:            false,
  expandable_feed: false,
  homepage_feed:  false,
  footer:         'default',
  theme:          { color: 'default', typeset: 'sans', navbar: 'none', footer: 'none' },
  display: {
    crumbs: true,
    header: ['date', 'reading_time', 'facets'],
    toc:    ['description', 'sections', 'related', 'edit'],
    navbar: ['browse', 'feed', 'github', 'theme'],
  },
  edit:           { branch: 'main', path: 'auto', url: 'auto' },
  nav_order:      {},
  frontmatter: {
    title:        'title',
    description:  ['description', 'desc'],
    date:         'date',
    reading_time: 'reading_time',
    related:      'related',
    facets:         FACET_DEFAULTS,
  },
  content:        './docs',
  output:         './dist',
  components:     'none',
  assets:         'none',
}


function unset(value) {
  return value == null || UNSET_TOKENS.has(String(value).trim().toLowerCase())
}


function optional(value) {
  return unset(value) ? '' : String(value).trim()
}


function resolve_rss(raw) {
  if (raw == null || raw === false) return null
  try {
    const url = new URL(raw.site_url)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error()
    }
    url.pathname = url.pathname.replace(/\/+$/, '') + '/'
    return { site_url: url.href }
  } catch {
    throw new Error("mndsite.yaml: 'rss.site_url' must be the absolute public HTTP(S) site URL")
  }
}

function resolve_feed(raw, section, expandable) {
  if (raw == null) {
    if (!section) return null
    const directory = section.replace(/^\/+|\/+$/g, '')
    if (directory && !/^[\w-]+(?:\/[\w-]+)*$/.test(directory)) {
      throw new Error("mndsite.yaml: 'feed_url' must be a site section")
    }
    return { path: '/' + directory, include: [directory ? directory + '/' : './'], cards: expandable }
  }
  if (typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.include)) {
    throw new Error("mndsite.yaml: 'feed.include' must be a list of content-relative paths")
  }
  const route = typeof raw.path === 'string' ? raw.path.trim().replace(/^\/+|\/+$/g, '') : ''
  if (raw.path != null && (!route || !/^[\w-]+(?:\/[\w-]+)*$/.test(route))) {
    throw new Error("mndsite.yaml: 'feed.path' must be a site path such as /feed/")
  }
  const include = raw.include.map(value => {
    const entry = typeof value === 'string' ? value.trim() : ''
    if (entry === '.' || entry === './') return './'
    const relative = entry.replace(/^\.\//, '').replace(/\/$/, '')
    if (/[\\:\0]/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error("mndsite.yaml: 'feed.include' must contain paths relative to content")
    }
    return entry.endsWith('/') || !/\.mdx?$/i.test(relative) ? relative + '/' : relative
  })
  return { path: route ? '/' + route : '', include: [...new Set(include)], cards: !!route }
}


function label_for(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function resolve_hue(name, color, index) {
  if (unset(color)) return FACET_COLORS[COLOR_ORDER[index % COLOR_ORDER.length]]
  if (FACET_COLORS[color] != null) return FACET_COLORS[color]
  const hue = Number(color)
  if (Number.isFinite(hue) && hue >= 0 && hue < 360) return hue
  throw new Error(
    `mndsite.yaml: unknown color '${color}' on ${name} — use ${COLOR_ORDER.join(', ')} or a hue 0-359`
  )
}


function as_bool(name, value, fallback = false) {
  if (value == null || value === '') return fallback
  if (typeof value === 'boolean') return value
  throw new Error(`mndsite.yaml: ${name} must be true or false`)
}


function normalize_key_list(key, path_label) {
  if (key == null || key === '') throw new Error(`mndsite.yaml: ${path_label} requires a 'key'`)
  const list = Array.isArray(key) ? key : [key]
  if (!list.length) throw new Error(`mndsite.yaml: ${path_label}.key must be a non-empty list`)
  return list.map(v => String(v).trim())
}


function resolve_facet(name, spec, index) {
  const cfg = { ...spec }
  if (cfg.field != null && cfg.field !== '') {
    throw new Error(`mndsite.yaml: frontmatter.facets.${name}.field was renamed to 'key'`)
  }
  cfg.key = normalize_key_list(cfg.key, `frontmatter.facets.${name}`)
  cfg.label = cfg.label || label_for(name)
  cfg.sort  = cfg.sort === 'semver' ? 'alpha' : cfg.sort || 'alpha'
  cfg.hue   = resolve_hue(`frontmatter.facets.${name}`, cfg.color, index)

  if (!FACET_SORTS.includes(cfg.sort)) {
    throw new Error(
      `mndsite.yaml: unknown frontmatter.facets.${name}.sort '${cfg.sort}' — use ${FACET_SORTS.join(', ')}`
    )
  }
  for (const legacy of ['index', 'inherit', 'history', 'default', 'group_by', 'values', 'field']) {
    if (legacy === 'field') continue
    if (cfg[legacy] != null && cfg[legacy] !== '') {
      throw new Error(
        `mndsite.yaml: frontmatter.facets.${name}.${legacy} is not supported`
      )
    }
  }
  return cfg
}


function resolve_facets(raw) {
  const entries = Object.entries(raw || FACET_DEFAULTS)
  return Object.fromEntries(entries.map(([name, spec], i) => [name, resolve_facet(name, spec || {}, i)]))
}


function header_field_keys(facets) {
  const keys = []
  const add = key => { if (key && !keys.includes(key)) keys.push(key) }
  for (const spec of Object.values(facets || {})) {
    for (const key of spec.key) add(key)
  }
  return keys
}


function resolve_crumbs(value) {
  if (value == null) return DEFAULTS.display.crumbs
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    throw new Error(`mndsite.yaml: display.crumbs must be true or false — lists are no longer supported`)
  }
  return as_bool('display.crumbs', value, DEFAULTS.display.crumbs)
}


function resolve_display(raw, facets) {
  const raw_display = { ...raw }
  delete raw_display.sidebar
  if (raw_display.contents != null) {
    throw new Error(
      "mndsite.yaml: display.contents is no longer supported — configure the right sidebar with display.toc only"
    )
  }
  for (const list of Object.keys(raw_display)) {
    if (list === 'crumbs') continue
    if (!DISPLAY_ELEMENTS[list]) {
      throw new Error(
        `mndsite.yaml: unknown display list '${list}' — use ${Object.keys(DISPLAY_ELEMENTS).join(', ')}`
      )
    }
  }

  const cfg = { ...DEFAULTS.display, ...raw_display }
  cfg.crumbs = resolve_crumbs(raw_display.crumbs)
  if (!Array.isArray(cfg.toc)) throw new Error(`mndsite.yaml: display.toc must be a list`)

  const field_keys = header_field_keys(facets)

  for (const [list, allowed] of Object.entries(DISPLAY_ELEMENTS)) {
    const items = cfg[list]
    if (!Array.isArray(items)) throw new Error(`mndsite.yaml: display.${list} must be a list`)

    const valid = list === 'header'
      ? [...allowed, ...Object.keys(facets), ...field_keys]
      : allowed
    for (const item of items) {
      if (!valid.includes(item)) {
        throw new Error(`mndsite.yaml: unknown display.${list} element '${item}' — use ${valid.join(', ')}`)
      }
    }
  }
  return cfg
}


function resolve_frontmatter(raw) {
  const raw_fm = raw || {}
  const facets = resolve_facets({ ...FACET_DEFAULTS, ...(raw_fm.facets || {}) })
  const cfg = { ...DEFAULTS.frontmatter, ...raw_fm }
  delete cfg.facets
  delete cfg.groups

  const mappings = Object.fromEntries(Object.entries(cfg).map(([name, key]) =>
    [name, Array.isArray(key) ? key : (unset(key) ? null : String(key))]
  ))
  mappings.facets = facets
  return mappings
}


function content_in_repo(config_dir, content_dir) {
  const rel = path.relative(config_dir, content_dir).split(path.sep).join('/')
  return !rel || rel.startsWith('..') || path.isAbsolute(rel) ? '' : rel
}


function resolve_edit(raw, repo_url, config_dir, content_dir) {
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
  if (raw && raw.fields != null) {
    throw new Error(`mndsite.yaml: 'fields' was renamed to 'frontmatter'`)
  }
  if (raw && raw.facets != null) {
    throw new Error(`mndsite.yaml: top-level 'facets' belongs under frontmatter.facets`)
  }
  if (raw && raw.groups != null) {
    throw new Error(`mndsite.yaml: 'groups' was retired; use frontmatter.facets`)
  }

  for (const key of ['description', 'repo_url', 'feed_url', 'footer', 'components', 'assets']) {
    cfg[key] = optional(cfg[key])
  }
  const icon = optional(cfg.icon)
  cfg.icon = icon ? '/' + icon.replace(/^\/+/, '') : ''
  cfg.rss = resolve_rss(raw.rss)
  cfg.drafts = raw.drafts ?? []
  if (!Array.isArray(cfg.drafts) || cfg.drafts.some(file => typeof file !== 'string' || /[\\:\0]/.test(file) ||
    file.split('/').some(part => !part || part === '.' || part === '..') || !/\.mdx?$/i.test(file))) {
    throw new Error("mndsite.yaml: 'drafts' must be a list of repository-relative Markdown paths")
  }
  if (raw.feed == null && cfg.expandable_feed !== true && cfg.expandable_feed !== false) {
    throw new Error("mndsite.yaml: 'expandable_feed' must be true or false")
  }
  if (raw.feed == null && cfg.expandable_feed && !/^\/?[\w-]+(?:\/[\w-]+)*\/?$/.test(cfg.feed_url)) {
    throw new Error("mndsite.yaml: 'expandable_feed' requires a 'feed_url' section")
  }
  cfg.feed = resolve_feed(raw.feed, cfg.feed_url, cfg.expandable_feed)
  if (cfg.homepage_feed !== true && cfg.homepage_feed !== false) {
    throw new Error("mndsite.yaml: 'homepage_feed' must be true or false")
  }
  const readingCards = raw.reading_cards
  if (readingCards != null && readingCards !== false &&
    (typeof readingCards !== 'object' || ![2, 3].includes(readingCards.max_depth))) {
    throw new Error("mndsite.yaml: 'reading_cards.max_depth' must be 2 or 3")
  }

  const theme = { ...DEFAULTS.theme, ...(raw.theme || {}) }
  theme.navbar = optional(theme.navbar)
  theme.footer = optional(theme.footer)

  cfg.theme       = resolve_theme(theme)
  // Older sites can keep displaying explicitly authored edition labels as a normal facet.
  const fm = { ...raw.frontmatter, facets: { ...raw.frontmatter?.facets } }
  if (raw.versioning && typeof raw.versioning === 'object') {
    const { label, color } = raw.versioning
    const key = optional(raw.versioning.key) || 'version'
    if (!Object.hasOwn(fm.facets, key)) fm.facets[key] = { key, label: label || label_for(key), color }
  }
  delete cfg.versioning
  cfg.frontmatter = resolve_frontmatter(fm)
  cfg.display = resolve_display(raw.display, cfg.frontmatter.facets)
  if (raw.display?.navbar && raw.display.sidebar && !cfg.display.navbar.includes('browse')) {
    cfg.display.navbar = ['browse', ...cfg.display.navbar]
  }
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
    'title', 'icon', 'repo_url', 'feed', 'homepage_feed', 'rss', 'description', 'footer',
    'theme', 'nav_order', 'frontmatter',
    'display', 'edit',
    ...(config.reading_cards != null ? ['reading_cards'] : []),
  ]
  const values = Object.fromEntries(keys.map(k => [k, config[k]]))
  const body = Object.entries(values)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join(',\n')

  const file = path.join(dir, 'site.config.js')
  const source = `/** Generated by mndsite CLI — do not edit */\nmodule.exports = {\n${body},\n}\n`
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== source) fs.writeFileSync(file, source)
}


module.exports = {
  load_config, write_site_config, unset, DEFAULTS, FACET_COLORS, FACET_DEFAULTS,
  header_field_keys,
}
