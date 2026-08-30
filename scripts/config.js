/**
 * YAML config loader for the mndsite CLI.
 * Reads mndsite.yaml, validates it, applies defaults, and generates site.config.js so
 * Next.js and Nextra can consume the config at build time.
 *
 * `frontmatter.facets` declare content dimensions; `frontmatter.groups` bundle facet names
 * into sidebar browse groups. `versioning` is optional.
 */
const fs   = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const yaml = require('js-yaml')
const { resolve_theme } = require('./theme')
const { normalize_semver } = require('./semver')


const DISPLAY_ELEMENTS = {
  header:   ['date', 'reading_time', 'facets'],
  sidebar:  ['pages'],
  toc:      ['description', 'sections', 'related', 'edit'],
  contents: ['description', 'sections', 'related', 'edit'],
  navbar:   ['theme', 'feed', 'github'],
}

const EDIT_TEMPLATES = {
  'github.com':    '{repo_url}/edit/{branch}/{file}',
  'gitlab.com':    '{repo_url}/-/edit/{branch}/{file}',
  'bitbucket.org': '{repo_url}/src/{branch}/{file}?mode=edit',
}

const FACET_COLORS = { blue: 210, violet: 265, amber: 35, rose: 340, green: 150, teal: 190 }
const COLOR_ORDER = Object.keys(FACET_COLORS)
const FACET_SORTS = ['alpha', 'semver', 'date']

const UNSET_TOKENS = new Set(['', 'none', 'auto', 'default'])

const FACET_DEFAULTS = {
  categories: { key: ['categories'], label: 'Category', color: 'blue' },
  tags:       { key: ['tags'],       label: 'Tag',      color: 'violet' },
  status:     { key: ['status'],     label: 'Status',     color: 'amber' },
}

const SIDEBAR_GROUP_DEFAULTS = {
  Tags: ['status', 'categories', 'tags'],
}


function default_groups(versioning) {
  const groups = { ...SIDEBAR_GROUP_DEFAULTS }
  if (versioning) groups.Versions = 'versioning'
  return groups
}


function default_sidebar(versioning) {
  return versioning ? ['pages', 'Tags', 'Versions'] : ['pages', 'Tags']
}


const DEFAULTS = {
  description:    'none',
  repo_url:       'none',
  feed_url:       'none',
  footer:         'default',
  theme:          { color: 'default', typeset: 'sans', navbar: 'none', footer: 'none' },
  display: {
    crumbs: true,
    header: ['date', 'reading_time', 'facets'],
    sidebar: ['pages', 'Tags'],
    toc:    ['description', 'sections', 'related', 'edit'],
    navbar: ['theme', 'feed', 'github'],
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
  versioning:     null,
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


function label_for(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function sidebar_tokens(groups_cfg) {
  return ['pages', ...Object.keys(groups_cfg || {})]
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


function resolve_release(config_dir) {
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
  cfg.sort  = cfg.sort || 'alpha'
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
        `mndsite.yaml: frontmatter.facets.${name}.${legacy} is not supported — use versioning for edition behavior`
      )
    }
  }
  return cfg
}


function resolve_facets(raw) {
  const entries = Object.entries(raw || FACET_DEFAULTS)
  return Object.fromEntries(entries.map(([name, spec], i) => [name, resolve_facet(name, spec || {}, i)]))
}


function resolve_config_groups(raw, facets, versioning) {
  const facet_names = Object.keys(facets || {})
  const entries = Object.entries(raw || SIDEBAR_GROUP_DEFAULTS)
  return Object.fromEntries(entries.map(([name, value]) => {
    if (value === 'versioning') {
      if (!versioning) {
        throw new Error(
          `mndsite.yaml: frontmatter.groups.${name} is versioning but no versioning block is configured`
        )
      }
      return [name, 'versioning']
    }
    if (typeof value === 'string') {
      throw new Error(
        `mndsite.yaml: frontmatter.groups.${name} must be a facet list or 'versioning'`
      )
    }
    if (!Array.isArray(value) || !value.length) {
      throw new Error(`mndsite.yaml: frontmatter.groups.${name} must be a non-empty list of facet names`)
    }
    const items = value.map(facet => {
      const key = String(facet).trim()
      if (!facet_names.includes(key)) {
        throw new Error(`mndsite.yaml: frontmatter.groups.${name} references unknown facet '${key}'`)
      }
      return key
    })
    return [name, items]
  }))
}


function resolve_versioning(raw) {
  if (raw == null || unset(raw)) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`mndsite.yaml: versioning must be an object`)
  }
  const cfg = { ...raw }
  cfg.key = unset(cfg.key) ? 'version' : String(cfg.key).trim()
  if (!unset(cfg.field)) {
    throw new Error(`mndsite.yaml: versioning.field is not supported — use key`)
  }
  cfg.label = cfg.label || 'Versions'
  cfg.sort  = 'semver'
  cfg.hue   = resolve_hue('versioning', cfg.color, 0)
  cfg.inherit = as_bool('versioning.inherit', cfg.inherit)
  cfg.history = as_bool('versioning.history', cfg.history)
  cfg.default = unset(cfg.default) ? 'latest' : String(cfg.default).trim()
  cfg.group_by = unset(cfg.group_by) ? '' : String(cfg.group_by).trim()
  return cfg
}


function header_field_keys(facets, versioning) {
  const keys = []
  const add = key => { if (key && !keys.includes(key)) keys.push(key) }
  if (versioning) add(versioning.key)
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


function resolve_display(raw, facets, groups_cfg, versioning) {
  const raw_display = raw || {}
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
  if (!cfg.contents) cfg.contents = [...cfg.toc]

  const field_keys = header_field_keys(facets, versioning)
  const sidebar_valid = sidebar_tokens(groups_cfg)

  for (const [list, allowed] of Object.entries(DISPLAY_ELEMENTS)) {
    const items = cfg[list]
    if (!Array.isArray(items)) throw new Error(`mndsite.yaml: display.${list} must be a list`)

    const valid = list === 'header'
      ? [...allowed, ...Object.keys(facets), ...field_keys]
      : list === 'sidebar'
        ? sidebar_valid
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
    throw new Error(`mndsite.yaml: top-level 'groups' belongs under frontmatter.groups`)
  }

  for (const key of ['description', 'repo_url', 'feed_url', 'footer', 'components', 'assets']) {
    cfg[key] = optional(cfg[key])
  }

  const theme = { ...DEFAULTS.theme, ...(raw.theme || {}) }
  theme.navbar = optional(theme.navbar)
  theme.footer = optional(theme.footer)

  cfg.theme       = resolve_theme(theme)
  cfg.versioning  = resolve_versioning(raw.versioning)
  cfg.frontmatter = resolve_frontmatter(raw.frontmatter)
  cfg.frontmatter.groups = resolve_config_groups(
    { ...default_groups(cfg.versioning), ...(raw?.frontmatter?.groups || {}) },
    cfg.frontmatter.facets,
    cfg.versioning,
  )
  const display_raw = { ...DEFAULTS.display, ...(raw?.display || {}) }
  if (!raw?.display?.sidebar) display_raw.sidebar = default_sidebar(cfg.versioning)
  cfg.display = resolve_display(
    display_raw, cfg.frontmatter.facets, cfg.frontmatter.groups, cfg.versioning,
  )
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
    'theme', 'nav_order', 'frontmatter', 'versioning', 'release',
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


module.exports = {
  load_config, write_site_config, unset, DEFAULTS, FACET_COLORS, FACET_DEFAULTS,
  SIDEBAR_GROUP_DEFAULTS, header_field_keys, default_groups, default_sidebar,
}
