/**
 * YAML config loader for the mndsite CLI.
 * Reads mndsite.yaml, validates required fields, applies defaults, and generates
 * site.config.js so Next.js and Nextra can consume the config at build time.
 *
 * `fields` names the frontmatter keys mdsite reads; `facets` declares the content
 * dimensions rendered as chips and filters. Frontmatter is inert unless named here.
 */
const fs   = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { resolve_theme } = require('./theme')


const REMOVED_KEYS = {
  meta: 'Move tagging and related-link configuration upstream to mndmap or frontmatter.',
  flatten: 'Move directory organization upstream to mndmap.',
  toc: "Use display.toc — remove 'sections' to hide the section list.",
  reading_time: "Use display.header — remove 'reading_time' to hide it.",
}

// Elements each display list accepts. `header` also accepts any declared facet name.
const DISPLAY_ELEMENTS = {
  title_row: ['info', 'contents'],
  header:    ['date', 'reading_time', 'facets'],
  info:      ['description'],
  toc:       ['sections', 'related', 'edit'],
  navbar:    ['theme', 'feed', 'github'],
}

// Chip hues, reused for facets that do not name a color (assigned in declaration order).
const FACET_COLORS = { blue: 210, violet: 265, amber: 35, rose: 340, green: 150, teal: 190 }
const COLOR_ORDER = Object.keys(FACET_COLORS)
const FACET_UI = ['chips', 'select', 'badge', 'none']
const FACET_SORTS = ['alpha', 'semver', 'date', 'listed']


const DEFAULTS = {
  repo_url:       '',
  feed_url:       '',
  description:    '',
  footer:         '',
  theme_toggle:   'navbar',
  theme:          { color: 'default', typeset: 'sans', navbar: '', footer: '' },
  display: {
    title_row: ['info', 'contents'],
    header:    ['date', 'reading_time', 'facets'],
    info:      ['description'],
    toc:       ['sections', 'related', 'edit'],
    navbar:    ['theme', 'feed', 'github'],
  },
  limits:         { header_chips: 8, related: 6 },
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
  collections:    { default: 'all' },
  sidebar:        { views: ['tree'] },
  content:        './docs',
  output:         './dist',
  components:     '',
  assets:         '',
}


function reject_removed_keys(raw) {
  for (const [key, hint] of Object.entries(REMOVED_KEYS)) {
    if (raw && Object.prototype.hasOwnProperty.call(raw, key)) {
      throw new Error(`mndsite.yaml: '${key}' is no longer supported. ${hint}`)
    }
  }
}


function label_for(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function resolve_hue(name, color, index) {
  /** Named token, raw hue number, or the next token in declaration order. */
  if (color == null || color === '') return FACET_COLORS[COLOR_ORDER[index % COLOR_ORDER.length]]
  if (FACET_COLORS[color] != null) return FACET_COLORS[color]
  const hue = Number(color)
  if (Number.isFinite(hue) && hue >= 0 && hue < 360) return hue
  throw new Error(
    `mndsite.yaml: unknown facets.${name}.color '${color}' — use ${COLOR_ORDER.join(', ')} or a hue 0-359`
  )
}


function resolve_facet(name, spec, index) {
  /** Fill one facet declaration: field is required, everything else has a default. */
  const cfg = { ...spec }
  if (!cfg.field) throw new Error(`mndsite.yaml: facets.${name} requires a 'field'`)

  cfg.label = cfg.label || label_for(name)
  cfg.ui    = cfg.ui || 'chips'
  cfg.sort  = cfg.sort || 'alpha'
  cfg.hue   = resolve_hue(name, cfg.color, index)

  if (!FACET_UI.includes(cfg.ui)) {
    throw new Error(`mndsite.yaml: unknown facets.${name}.ui '${cfg.ui}' — use ${FACET_UI.join(', ')}`)
  }
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
  return Object.fromEntries(entries.map(([name, spec], i) => [name, resolve_facet(name, spec || {}, i)]))
}


function resolve_collections(raw, facets) {
  /** Named facet presets. The reserved `default` key names the active preset. */
  const cfg = { ...DEFAULTS.collections, ...(raw || {}) }

  for (const [name, preset] of Object.entries(cfg)) {
    if (name === 'default') continue
    if (preset == null || typeof preset !== 'object' || Array.isArray(preset)) {
      throw new Error(`mndsite.yaml: collections.${name} must be a map of facet name to value(s)`)
    }
    for (const facet of Object.keys(preset)) {
      if (!facets[facet]) throw new Error(`mndsite.yaml: collections.${name} references unknown facet '${facet}'`)
    }
  }

  const active = cfg.default
  if (active !== 'all' && !cfg[active]) {
    throw new Error(`mndsite.yaml: collections.default '${active}' is not a declared collection`)
  }
  return cfg
}


function resolve_sidebar(raw, facets) {
  /** Left-tree views: the directory tree plus one view per named facet. */
  const cfg = { ...DEFAULTS.sidebar, ...(raw || {}) }
  if (!Array.isArray(cfg.views) || !cfg.views.length) {
    throw new Error(`mndsite.yaml: sidebar.views must be a non-empty list`)
  }
  for (const view of cfg.views) {
    if (view !== 'tree' && !facets[view]) {
      throw new Error(`mndsite.yaml: sidebar.views references unknown facet '${view}'`)
    }
  }
  return cfg
}


function resolve_display(raw, facets) {
  /** Element lists: order is display order, and omission disables the element. */
  const cfg = { ...DEFAULTS.display, ...(raw || {}) }

  for (const [list, allowed] of Object.entries(DISPLAY_ELEMENTS)) {
    const items = cfg[list]
    if (!Array.isArray(items)) throw new Error(`mndsite.yaml: display.${list} must be a list`)

    // Naming a facet in `header` places its values there regardless of the facet's ui.
    const valid = list === 'header' ? [...allowed, ...Object.keys(facets)] : allowed
    for (const item of items) {
      if (!valid.includes(item)) {
        throw new Error(`mndsite.yaml: unknown display.${list} element '${item}' — use ${valid.join(', ')}`)
      }
    }
  }
  return cfg
}


function resolve_limits(raw) {
  const cfg = { ...DEFAULTS.limits, ...(raw || {}) }
  for (const [key, value] of Object.entries(cfg)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`mndsite.yaml: limits.${key} must be a non-negative integer`)
    }
  }
  return cfg
}


function load_config(yaml_path) {
  const abs  = path.resolve(yaml_path)
  const dir  = path.dirname(abs)
  const raw  = yaml.load(fs.readFileSync(abs, 'utf8'))
  reject_removed_keys(raw)
  const cfg  = { ...DEFAULTS, ...raw }

  if (!cfg.title) throw new Error(`mndsite.yaml: 'title' is required`)

  cfg.theme       = resolve_theme({ ...DEFAULTS.theme, ...(raw.theme || {}) })
  cfg.fields      = { ...DEFAULTS.fields, ...(raw.fields || {}) }
  cfg.facets      = resolve_facets(raw.facets)
  cfg.collections = resolve_collections(raw.collections, cfg.facets)
  cfg.sidebar     = resolve_sidebar(raw.sidebar, cfg.facets)
  cfg.display     = resolve_display(raw.display, cfg.facets)
  cfg.limits      = resolve_limits(raw.limits)

  cfg.content = path.resolve(dir, cfg.content)
  cfg.output  = path.resolve(dir, cfg.output)
  if (cfg.components) cfg.components = path.resolve(dir, cfg.components)
  if (cfg.assets)     cfg.assets     = path.resolve(dir, cfg.assets)

  return cfg
}


function write_site_config(config, dest_dir) {
  const dir  = dest_dir || path.join(__dirname, '..')
  const keys = [
    'title', 'repo_url', 'feed_url', 'description', 'footer', 'theme_toggle',
    'theme', 'nav_order', 'fields', 'facets', 'collections', 'sidebar',
    'display', 'limits',
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


module.exports = { load_config, write_site_config, DEFAULTS, REMOVED_KEYS, FACET_COLORS }
