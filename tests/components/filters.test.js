/**
 * Unit tests for facet filter resolution (components/filters.js).
 * The site config and page metadata are mocked, so these cover the rules — precedence,
 * ordering, and matching — rather than whatever the repo's own docs happen to declare.
 */
jest.mock('../../site.config', () => ({
  facets: {
    version: { field: 'version', label: 'Contract', ui: 'select', sort: 'semver', hue: 190 },
    status: {
      field: 'status', label: 'Status', ui: 'badge', sort: 'listed', hue: 35,
      values: ['draft', 'stable', 'deprecated'],
      default: ['stable', 'deprecated'],
    },
  },
  collections: {
    default: 'current',
    current: { status: ['stable'] },
    latest:  { version: 'latest' },
  },
  sidebar: { views: ['tree', 'version'] },
}), { virtual: true })

jest.mock('../../public/site-meta.json', () => ({
  pages: [
    { url: '/a',     name: 'A',     facets: { version: '0.1', status: 'deprecated' } },
    { url: '/b',     name: 'B',     facets: { version: '0.2', status: 'stable' } },
    { url: '/g/c',   name: 'C',     facets: { version: '0.3', status: 'draft' } },
    { url: '/g/d',   name: 'D',     facets: { version: '0.2', status: 'stable' } },
    { url: '/plain', name: 'Plain', facets: {} },
  ],
}), { virtual: true })

const {
  active_collection, active_view, collection_names, facet_domain,
  grouped_pages, page_matches, resolve_filter, route_visible,
} = require('../../components/filters')


const urls = pages => pages.map(p => p.url)


describe('facet_domain — value ordering', () => {
  test('test_domain_semver_ascending', () => {
    expect(facet_domain('version')).toEqual(['0.1', '0.2', '0.3'])
  })

  test('test_domain_listed_follows_declared_values', () => {
    expect(facet_domain('status')).toEqual(['draft', 'stable', 'deprecated'])
  })

  test('test_domain_unknown_facet_empty', () => {
    expect(facet_domain('nope')).toEqual([])
  })
})


describe('active_collection and active_view', () => {
  test('test_collection_defaults_to_configured', () => {
    expect(active_collection({})).toBe('current')
  })

  test('test_collection_from_query', () => {
    expect(active_collection({ c: 'latest' })).toBe('latest')
  })

  test('test_collection_all_is_accepted', () => {
    expect(active_collection({ c: 'all' })).toBe('all')
  })

  test('test_collection_unknown_falls_back', () => {
    expect(active_collection({ c: 'nope' })).toBe('current')
  })

  test('test_collection_names_omit_default_key', () => {
    expect(collection_names()).toEqual(['current', 'latest'])
  })

  test('test_view_defaults_to_first_declared', () => {
    expect(active_view({})).toBe('tree')
  })

  test('test_view_from_query', () => {
    expect(active_view({ view: 'version' })).toBe('version')
  })

  test('test_view_undeclared_falls_back', () => {
    expect(active_view({ view: 'tags' })).toBe('tree')
  })
})


describe('resolve_filter — precedence', () => {
  test('test_collection_preset_wins_over_facet_default', () => {
    expect(resolve_filter({}).status).toEqual(['stable'])
  })

  test('test_facet_default_applies_when_preset_omits_it', () => {
    // `latest` constrains version only, so status falls back to its own default.
    expect(resolve_filter({ c: 'latest' }).status).toEqual(['stable', 'deprecated'])
  })

  test('test_query_param_overrides_collection', () => {
    expect(resolve_filter({ status: 'draft' }).status).toEqual(['draft'])
  })

  test('test_query_param_accepts_comma_list', () => {
    expect(resolve_filter({ status: 'draft,stable' }).status).toEqual(['draft', 'stable'])
  })

  test('test_query_all_clears_a_constraint', () => {
    expect(resolve_filter({ status: 'all' }).status).toBeNull()
  })

  test('test_latest_resolves_to_highest_value', () => {
    expect(resolve_filter({ c: 'latest' }).version).toEqual(['0.3'])
  })

  test('test_unconstrained_facet_is_null', () => {
    expect(resolve_filter({}).version).toBeNull()
  })

  test('test_collection_all_drops_presets_but_keeps_facet_defaults', () => {
    const filter = resolve_filter({ c: 'all' })
    expect(filter.version).toBeNull()
    expect(filter.status).toEqual(['stable', 'deprecated'])
  })
})


describe('page_matches', () => {
  const page = { facets: { version: '0.2', status: 'stable' } }

  test('test_matches_allowed_value', () => {
    expect(page_matches(page, { status: ['stable'] })).toBe(true)
  })

  test('test_rejects_disallowed_value', () => {
    expect(page_matches(page, { status: ['draft'] })).toBe(false)
  })

  test('test_null_constraint_matches_anything', () => {
    expect(page_matches(page, { status: null })).toBe(true)
  })

  test('test_page_missing_the_field_matches_any_filter', () => {
    expect(page_matches({ facets: {} }, { status: ['draft'] })).toBe(true)
  })

  test('test_list_valued_facet_matches_on_any_value', () => {
    const multi = { facets: { status: ['draft', 'stable'] } }
    expect(page_matches(multi, { status: ['stable'] })).toBe(true)
  })
})


describe('route_visible', () => {
  const stable = { status: ['stable'] }

  test('test_page_route_follows_its_own_facets', () => {
    expect(route_visible('/b', stable)).toBe(true)
    expect(route_visible('/a', stable)).toBe(false)
  })

  test('test_trailing_slash_ignored', () => {
    expect(route_visible('/a/', stable)).toBe(false)
  })

  test('test_folder_visible_when_a_descendant_matches', () => {
    expect(route_visible('/g', stable)).toBe(true)
  })

  test('test_folder_hidden_when_no_descendant_matches', () => {
    // /g holds 0.2 and 0.3 pages only, so a 0.1 filter empties it. Nextra types a
    // directory with an index page as a doc, so folder-ness comes from the page list.
    expect(route_visible('/g', { version: ['0.1'] })).toBe(false)
  })

  test('test_folder_visible_when_any_descendant_matches', () => {
    // /g/c is the draft; one match is enough to keep the folder.
    expect(route_visible('/g', { status: ['draft'] })).toBe(true)
  })

  test('test_route_without_a_page_record_stays', () => {
    expect(route_visible('/generated', stable)).toBe(true)
  })
})


describe('grouped_pages — facet views', () => {
  test('test_groups_newest_first_for_ordered_facets', () => {
    const groups = grouped_pages('version', {})
    expect(groups.map(g => g.value)).toEqual(['0.3', '0.2', '0.1'])
  })

  test('test_group_holds_its_pages', () => {
    const groups = grouped_pages('version', {})
    expect(urls(groups.find(g => g.value === '0.2').pages)).toEqual(['/b', '/g/d'])
  })

  test('test_filter_applies_within_groups', () => {
    const groups = grouped_pages('version', { status: ['stable'] })
    expect(groups.map(g => g.value)).toEqual(['0.2'])
  })

  test('test_pages_without_the_facet_are_not_grouped', () => {
    const grouped = grouped_pages('version', {}).flatMap(g => urls(g.pages))
    expect(grouped).not.toContain('/plain')
  })

  test('test_unknown_facet_yields_no_groups', () => {
    expect(grouped_pages('nope', {})).toEqual([])
  })
})
