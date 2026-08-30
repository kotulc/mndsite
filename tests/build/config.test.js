/**
 * Unit tests for YAML config loading, theme preset resolution, and
 * site.config.js generation. Imports directly from scripts/config and scripts/theme.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { load_config, write_site_config, DEFAULTS } = require('../../scripts/config')
const { COLOR_PRESETS, TYPESETS, resolve_theme } = require('../../scripts/theme')


let tmp
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-config-')) })
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

function write_yaml(body) {
  const p = path.join(tmp, 'mndsite.yaml')
  fs.writeFileSync(p, body)
  return p
}


describe('load_config — theme resolution', () => {
  test('test_theme_defaults_applied', () => {
    const cfg = load_config(write_yaml('title: t'))
    expect(cfg.theme).toEqual({
      color: 'default', typeset: 'sans', navbar: '', footer: '',
      hue: { light: 212, dark: 204 }, saturation: 100, font_stack: '',
    })
  })

  test('test_theme_navbar_footer_passthrough', () => {
    const cfg = load_config(write_yaml('title: t\ntheme:\n  navbar: primary\n  footer: "#1e293b"'))
    expect(cfg.theme.navbar).toBe('primary')
    expect(cfg.theme.footer).toBe('#1e293b')
  })

  test('test_theme_partial_block_merges_defaults', () => {
    const cfg = load_config(write_yaml('title: t\ntheme:\n  color: teal'))
    expect(cfg.theme.color).toBe('teal')
    expect(cfg.theme.typeset).toBe('sans')
  })

  test('test_theme_invalid_color_throws', () => {
    const p = write_yaml('title: t\ntheme:\n  color: fuchsia')
    expect(() => load_config(p)).toThrow(/unknown theme\.color 'fuchsia'.*default, slate/)
  })

  test('test_theme_invalid_typeset_throws', () => {
    const p = write_yaml('title: t\ntheme:\n  typeset: comic')
    expect(() => load_config(p)).toThrow(/unknown theme\.typeset 'comic'.*sans, serif/)
  })
})


describe('load_config — default tokens', () => {
  // Every optional key names its default (none/auto/default); all resolve to '' downstream.
  const OPTIONAL = ['description', 'repo_url', 'feed_url', 'footer', 'components', 'assets']

  test('test_defaults_carry_no_empty_strings', () => {
    const blanks = Object.entries(DEFAULTS).filter(([k, v]) => (v === '' || v === null) && k !== 'versioning')
    expect(blanks).toEqual([])
  })

  test.each(OPTIONAL)('test_default_token_resolves_empty_%s', (key) => {
    expect(load_config(write_yaml('title: t'))[key]).toBe('')
  })

  test.each(OPTIONAL)('test_explicit_none_resolves_empty_%s', (key) => {
    expect(load_config(write_yaml(`title: t\n${key}: none\n`))[key]).toBe('')
  })

  test.each(OPTIONAL)('test_blank_reads_as_default_%s', (key) => {
    expect(load_config(write_yaml(`title: t\n${key}: ""\n`))[key]).toBe('')
  })

  test('test_set_values_survive_resolution', () => {
    const cfg = load_config(write_yaml('title: t\nfooter: Made here\nfeed_url: updates\n'))
    expect(cfg.footer).toBe('Made here')
    expect(cfg.feed_url).toBe('updates')
  })
})


describe('load_config — frontmatter', () => {
  test('test_frontmatter_defaults_applied', () => {
    const cfg = load_config(write_yaml('title: t'))
    expect(cfg.frontmatter.title).toBe(DEFAULTS.frontmatter.title)
    expect(cfg.frontmatter.facets.categories.key).toEqual(['categories'])
    expect(cfg.frontmatter.facets.tags.key).toEqual(['tags'])
    expect(cfg.frontmatter.facets.status.key).toEqual(['status'])
    expect(cfg.frontmatter.groups).toEqual({ Tags: ['status', 'categories', 'tags'] })
  })

  test('test_fields_rename_rejected', () => {
    const p = write_yaml('title: t\nfields:\n  title: title\n')
    expect(() => load_config(p)).toThrow(/renamed to 'frontmatter'/)
  })

  test('test_frontmatter_none_disables_mapping', () => {
    const cfg = load_config(write_yaml('title: t\nfrontmatter:\n  title: none\n'))
    expect(cfg.frontmatter.title).toBeNull()
  })

  test('test_frontmatter_remap_kept', () => {
    const cfg = load_config(write_yaml('title: t\nfrontmatter:\n  title: heading\n'))
    expect(cfg.frontmatter.title).toBe('heading')
  })

  test('test_frontmatter_list_mapping_kept', () => {
    const cfg = load_config(write_yaml('title: t\nfrontmatter:\n  description: [summary, desc]\n'))
    expect(cfg.frontmatter.description).toEqual(['summary', 'desc'])
  })
})


describe('load_config — frontmatter facets', () => {
  test('test_facet_defaults_filled', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    tags:
      key: tags
`))
    expect(cfg.frontmatter.facets.tags).toMatchObject({
      key: ['tags'], label: 'Tags', sort: 'alpha',
    })
  })

  test('test_facet_key_list', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    tags:
      key: [tags, categories]
`))
    expect(cfg.frontmatter.facets.tags.key).toEqual(['tags', 'categories'])
  })

  test('test_facet_label_from_name', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    doc_status:
      key: s
`))
    expect(cfg.frontmatter.facets.doc_status.label).toBe('Doc Status')
  })

  test('test_facet_hue_from_named_color', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    a:
      key: a
      color: rose
`))
    expect(cfg.frontmatter.facets.a.hue).toBe(340)
  })

  test('test_facet_hue_from_raw_number', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    a:
      key: a
      color: 42
`))
    expect(cfg.frontmatter.facets.a.hue).toBe(42)
  })

  test('test_facet_hue_cycles_palette_in_order', () => {
    const cfg = load_config(write_yaml(`title: t
frontmatter:
  facets:
    a: { key: a }
    b: { key: b }
`))
    expect([cfg.frontmatter.facets.a.hue, cfg.frontmatter.facets.b.hue]).toEqual([340, 150])
  })

  test('test_facet_missing_key_throws', () => {
    const p = write_yaml(`title: t
frontmatter:
  facets:
    a: { label: A }
`)
    expect(() => load_config(p)).toThrow(/frontmatter.facets.a requires a 'key'/)
  })

  test('test_facet_field_rename_rejected', () => {
    const p = write_yaml(`title: t
frontmatter:
  facets:
    a: { field: a }
`)
    expect(() => load_config(p)).toThrow(/field was renamed to 'key'/)
  })

  test('test_facet_legacy_flags_rejected', () => {
    const p = write_yaml(`title: t
frontmatter:
  facets:
    a: { key: a, index: true }
`)
    expect(() => load_config(p)).toThrow(/index.*not supported/)
  })

  test('test_top_level_groups_rejected', () => {
    const p = write_yaml('title: t\ngroups:\n  Tags: [tags]\n')
    expect(() => load_config(p)).toThrow(/belongs under frontmatter.groups/)
  })

  test('test_top_level_facets_rejected', () => {
    const p = write_yaml('title: t\nfacets:\n  a: { key: a }\n')
    expect(() => load_config(p)).toThrow(/belongs under frontmatter.facets/)
  })

  test.each([
    ['color: nope', /unknown color/],
    ['sort: vibes',  /unknown frontmatter.facets.a.sort/],
    ['sort: listed', /unknown frontmatter.facets.a.sort/],
  ])('test_facet_invalid_%s_throws', (line, pattern) => {
    const p = write_yaml(`title: t
frontmatter:
  facets:
    a: { key: a, ${line} }
`)
    expect(() => load_config(p)).toThrow(pattern)
  })
})


describe('load_config — sidebar groups', () => {
  test('test_groups_default', () => {
    const cfg = load_config(write_yaml('title: t'))
    expect(cfg.frontmatter.groups).toEqual({ Tags: ['status', 'categories', 'tags'] })
    expect(cfg.display.sidebar).toEqual(['pages', 'Tags'])
  })

  test('test_groups_include_versioning_when_configured', () => {
    const cfg = load_config(write_yaml(`title: t
versioning:
  inherit: true
`))
    expect(cfg.frontmatter.groups).toEqual({
      Tags: ['status', 'categories', 'tags'],
      Versions: 'versioning',
    })
    expect(cfg.display.sidebar).toEqual(['pages', 'Tags', 'Versions'])
  })

  test('test_versioning_group_without_block_throws', () => {
    const p = write_yaml(`title: t
frontmatter:
  groups:
    Versions: versioning
`)
    expect(() => load_config(p)).toThrow(/no versioning block/)
  })

  test('test_groups_unknown_facet_throws', () => {
    const p = write_yaml(`title: t
frontmatter:
  groups:
    Mine: [nope]
`)
    expect(() => load_config(p)).toThrow(/unknown facet 'nope'/)
  })
})


describe('load_config — versioning', () => {
  test('test_versioning_defaults', () => {
    const cfg = load_config(write_yaml(`title: t
versioning:
  inherit: true
  history: true
`))
    expect(cfg.versioning).toMatchObject({
      field: 'version', label: 'Versions', sort: 'semver',
      inherit: true, history: true, default: 'latest', group_by: '',
    })
  })

  test('test_versioning_absent_by_default', () => {
    expect(load_config(write_yaml('title: t')).versioning).toBeNull()
  })

  test('test_release_from_package_json', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '1.2.3' }))
    expect(load_config(write_yaml('title: t')).release).toBe('1.2.3')
  })
})


describe('load_config — display lists', () => {
  test('test_display_defaults_applied', () => {
    const cfg = load_config(write_yaml('title: t'))
    expect(cfg.display).toMatchObject(DEFAULTS.display)
  })

  test('test_contents_mirrors_toc_by_default', () => {
    const cfg = load_config(write_yaml('title: t\ndisplay:\n  toc: [description, related]\n'))
    expect(cfg.display.contents).toEqual(['description', 'related'])
  })

  test('test_contents_overrides_toc_when_given', () => {
    const p = write_yaml('title: t\ndisplay:\n  toc: [description, related]\n  contents: [description]\n')
    expect(load_config(p).display.contents).toEqual(['description'])
  })

  test('test_empty_list_disables_zone', () => {
    expect(load_config(write_yaml('title: t\ndisplay:\n  crumbs: []\n')).display.crumbs).toEqual([])
  })

  test('test_header_accepts_field_key', () => {
    const p = write_yaml(`title: t
versioning: { field: version }
frontmatter:
  facets:
    tags: { key: tags }
display:
  header: [date, version]
`)
    expect(load_config(p).display.header).toEqual(['date', 'version'])
  })

  test('test_header_unknown_group_throws', () => {
    const p = write_yaml('title: t\ndisplay:\n  header: [date, nope]\n')
    expect(() => load_config(p)).toThrow(/unknown display.header element 'nope'/)
  })

  test('test_unknown_display_list_throws', () => {
    const p = write_yaml('title: t\ndisplay:\n  info: [description]\n')
    expect(() => load_config(p)).toThrow(/unknown display list 'info'/)
  })

  test('test_display_non_list_throws', () => {
    const p = write_yaml('title: t\ndisplay:\n  toc: description\n')
    expect(() => load_config(p)).toThrow(/display.toc must be a list/)
  })

  test('test_display_sidebar_unknown_group_throws', () => {
    const p = write_yaml('title: t\ndisplay:\n  sidebar: [pages, Unknown]\n')
    expect(() => load_config(p)).toThrow(/unknown display.sidebar element 'Unknown'/)
  })
})


describe('resolve_theme — preset tables', () => {
  test.each(Object.entries(COLOR_PRESETS))(
    'test_theme_color_preset_%s', (name, preset) => {
      const theme = resolve_theme({ color: name, typeset: 'sans' })
      expect(theme.hue).toEqual(preset.hue)
      expect(theme.saturation).toBe(preset.saturation)
    }
  )

  test.each(Object.entries(TYPESETS))(
    'test_theme_typeset_preset_%s', (name, stack) => {
      expect(resolve_theme({ color: 'default', typeset: name }).font_stack).toBe(stack)
    }
  )
})


describe('write_site_config — generated keys', () => {
  test('test_write_site_config_includes_theme_keys', () => {
    const cfg = load_config(write_yaml('title: t\ndescription: d\nfooter: f\ntheme:\n  color: emerald'))
    write_site_config(cfg, tmp)
    const out = require(path.join(tmp, 'site.config.js'))
    expect(out.description).toBe('d')
    expect(out.footer).toBe('f')
    expect(out.theme).toEqual({
      color: 'emerald', typeset: 'sans', navbar: '', footer: '',
      hue: 161, saturation: 94, font_stack: '',
    })
  })

  test('test_write_site_config_omits_removed_keys', () => {
    write_site_config(load_config(write_yaml('title: t')), tmp)
    const out = require(path.join(tmp, 'site.config.js'))
    expect(out).not.toHaveProperty('collections')
    expect(out).not.toHaveProperty('sidebar')
    expect(out).not.toHaveProperty('content_style')
    expect(out).not.toHaveProperty('theme_mood')
    expect(out).not.toHaveProperty('logo_seed')
    expect(out).not.toHaveProperty('meta_sidebar')
    expect(out).not.toHaveProperty('extract')
    expect(out).not.toHaveProperty('flatten')
    expect(out).not.toHaveProperty('page_tags')
    expect(out).not.toHaveProperty('section_tags')
  })
})


describe('load_config — edit links', () => {
  test('test_edit_path_defaults_to_content_dir', () => {
    const cfg = load_config(write_yaml('title: t\ncontent: ./docs\n'))
    expect(cfg.edit.path).toBe('docs')
    expect(cfg.edit.branch).toBe('main')
  })

  test('test_edit_url_template_from_repo_host', () => {
    const cfg = load_config(write_yaml('title: t\nrepo_url: https://github.com/x/y\n'))
    expect(cfg.edit.url).toBe('{repo_url}/edit/{branch}/{file}')
  })

  test('test_edit_url_empty_for_unknown_host', () => {
    const cfg = load_config(write_yaml('title: t\nrepo_url: https://git.example.com/x/y\n'))
    expect(cfg.edit.url).toBe('')
  })

  test('test_edit_url_override_wins', () => {
    const cfg = load_config(write_yaml('title: t\nrepo_url: https://github.com/x/y\nedit:\n  url: "{repo_url}/blob/{branch}/{file}"\n'))
    expect(cfg.edit.url).toBe('{repo_url}/blob/{branch}/{file}')
  })

  test('test_edit_path_empty_when_content_outside_config_dir', () => {
    const cfg = load_config(write_yaml('title: t\ncontent: ../elsewhere\n'))
    expect(cfg.edit.path).toBe('')
  })
})
