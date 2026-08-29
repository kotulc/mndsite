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
    const blanks = Object.entries(DEFAULTS).filter(([, v]) => v === '' || v === null)
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


describe('load_config — fields', () => {
  test('test_fields_defaults_applied', () => {
    expect(load_config(write_yaml('title: t')).fields).toEqual(DEFAULTS.fields)
  })

  test('test_field_none_disables_mapping', () => {
    const cfg = load_config(write_yaml('title: t\nfields:\n  title: none\n'))
    expect(cfg.fields.title).toBeNull()
  })

  test('test_field_remap_kept', () => {
    const cfg = load_config(write_yaml('title: t\nfields:\n  title: heading\n'))
    expect(cfg.fields.title).toBe('heading')
  })

  test('test_field_list_mapping_kept', () => {
    const cfg = load_config(write_yaml('title: t\nfields:\n  description: [summary, desc]\n'))
    expect(cfg.fields.description).toEqual(['summary', 'desc'])
  })
})


describe('load_config — facets', () => {
  test('test_facet_defaults_filled', () => {
    const cfg = load_config(write_yaml('title: t\nfacets:\n  version:\n    field: version\n'))
    expect(cfg.facets.version).toMatchObject({
      field: 'version', label: 'Version', sort: 'alpha',
      index: false, inherit: false, history: false, default: '', group_by: '',
    })
  })

  test('test_facet_label_from_name', () => {
    const cfg = load_config(write_yaml('title: t\nfacets:\n  doc_status:\n    field: s\n'))
    expect(cfg.facets.doc_status.label).toBe('Doc Status')
  })

  test('test_facet_hue_from_named_color', () => {
    const cfg = load_config(write_yaml('title: t\nfacets:\n  a:\n    field: a\n    color: rose\n'))
    expect(cfg.facets.a.hue).toBe(340)
  })

  test('test_facet_hue_from_raw_number', () => {
    const cfg = load_config(write_yaml('title: t\nfacets:\n  a:\n    field: a\n    color: 42\n'))
    expect(cfg.facets.a.hue).toBe(42)
  })

  test('test_facet_hue_cycles_palette_in_order', () => {
    const cfg = load_config(write_yaml('title: t\nfacets:\n  a: { field: a }\n  b: { field: b }\n'))
    expect([cfg.facets.a.hue, cfg.facets.b.hue]).toEqual([210, 265])
  })

  test('test_facet_missing_field_throws', () => {
    const p = write_yaml('title: t\nfacets:\n  a: { label: A }\n')
    expect(() => load_config(p)).toThrow(/facets.a requires a 'field'/)
  })

  test.each([
    ['color: nope', /unknown facets.a.color/],
    ['sort: vibes',  /unknown facets.a.sort/],
    ['values: x',    /facets.a.values must be a list/],
  ])('test_facet_invalid_%s_throws', (line, pattern) => {
    const p = write_yaml(`title: t\nfacets:\n  a: { field: a, ${line} }\n`)
    expect(() => load_config(p)).toThrow(pattern)
  })
})


describe('load_config — facet indexes', () => {
  test('test_index_inherit_history_are_bools', () => {
    const p = write_yaml('title: t\nfacets:\n  version: { field: version, index: true, inherit: true, history: true }\n')
    expect(load_config(p).facets.version).toMatchObject({ index: true, inherit: true, history: true })
  })

  test('test_index_non_bool_throws', () => {
    const p = write_yaml('title: t\nfacets:\n  version: { field: version, index: auto }\n')
    expect(() => load_config(p)).toThrow(/facets.version.index must be true or false/)
  })

  test('test_group_by_must_name_a_facet', () => {
    const p = write_yaml('title: t\nfacets:\n  version: { field: version, group_by: status }\n')
    expect(() => load_config(p)).toThrow(/group_by references unknown facet 'status'/)
  })

  test('test_group_by_kept', () => {
    const p = write_yaml('title: t\nfacets:\n  status: { field: status }\n  version: { field: version, group_by: status }\n')
    expect(load_config(p).facets.version.group_by).toBe('status')
  })

  test('test_release_from_package_json', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '1.2.3' }))
    expect(load_config(write_yaml('title: t')).release).toBe('1.2.3')
  })

  test('test_release_pads_two_part_version', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '1.2' }))
    expect(load_config(write_yaml('title: t')).release).toBe('1.2.0')
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

  test('test_header_accepts_facet_name', () => {
    const p = write_yaml('title: t\nfacets:\n  version: { field: version }\ndisplay:\n  header: [date, version]\n')
    expect(load_config(p).display.header).toEqual(['date', 'version'])
  })

  test('test_header_unknown_facet_throws', () => {
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
