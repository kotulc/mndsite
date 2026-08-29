/**
 * Unit tests for facet indexes (components/filters.js).
 * The site config and page metadata are mocked.
 */
jest.mock('../../site.config', () => ({
  release: '0.3.0',
  facets: {
    version: {
      field: 'version', label: 'Versions', sort: 'semver', hue: 190,
      index: true, inherit: true, history: true, default: 'latest', group_by: 'status',
    },
    tags: {
      field: 'tags', label: 'Tags', sort: 'alpha', hue: 265,
      index: true, inherit: false, history: false, default: '', group_by: '',
    },
    status: {
      field: 'status', label: 'Status', sort: 'listed', hue: 35,
      index: false, inherit: false, history: false, default: '', group_by: '',
      values: ['draft', 'stable', 'deprecated'],
    },
  },
}), { virtual: true })

jest.mock('../../public/site-meta.json', () => ({
  pages: [
    { url: '/a',     name: 'A',     snapshot: '',      facets: { version: '0.1.0', status: 'deprecated' } },
    { url: '/b',     name: 'B',     snapshot: '',      facets: { version: '0.2.0', status: 'stable' } },
    { url: '/g/c',   name: 'C',     snapshot: '',      facets: { version: '0.3.0', status: 'draft' } },
    { url: '/g/d',   name: 'D',     snapshot: '',      facets: { version: '0.2.0', status: 'stable' } },
    { url: '/plain', name: 'Plain', snapshot: '',      facets: {} },
    { url: '/_history/0.1.0/a', name: 'A (old)', snapshot: '0.1.0', facets: { version: '0.1.0', status: 'stable' } },
  ],
}), { virtual: true })

const {
  active_view, facet_domain, index_entries, index_facets,
  listed_pages, selected_value,
} = require('../../components/filters')


const urls = pages => pages.map(p => p.url)


describe('index_facets', () => {
  test('test_index_facets_declaration_order', () => {
    expect(index_facets().map(f => f.name)).toEqual(['version', 'tags'])
  })
})


describe('facet_domain', () => {
  test('test_domain_semver_normalized_ascending', () => {
    expect(facet_domain('version')).toEqual(['0.1.0', '0.2.0', '0.3.0'])
  })

  test('test_domain_listed_follows_declared_values', () => {
    expect(facet_domain('status')).toEqual(['draft', 'stable', 'deprecated'])
  })
})


describe('active_view and selected_value', () => {
  test('test_view_defaults_to_pages', () => {
    expect(active_view({})).toBe('pages')
  })

  test('test_view_from_query', () => {
    expect(active_view({ view: 'version' })).toBe('version')
  })

  test('test_view_unknown_falls_back_to_pages', () => {
    expect(active_view({ view: 'nope' })).toBe('pages')
  })

  test('test_selected_defaults_to_latest', () => {
    expect(selected_value({}, 'version')).toBe('latest')
  })

  test('test_selected_from_query', () => {
    expect(selected_value({ on: '0.2.0' }, 'version')).toBe('0.2.0')
  })
})


describe('listed_pages', () => {
  test('test_latest_with_history_is_head_tree', () => {
    expect(urls(listed_pages('version', 'latest'))).toEqual(['/a', '/b', '/g/c', '/g/d', '/plain'])
  })

  test('test_snapshot_value_uses_frozen_tree', () => {
    expect(urls(listed_pages('version', '0.1.0'))).toEqual(['/_history/0.1.0/a'])
  })

  test('test_unstamped_head_value_lists_matching_pages', () => {
    expect(urls(listed_pages('version', '0.2.0'))).toEqual(['/b', '/g/d'])
  })
})


describe('index_entries', () => {
  test('test_semver_lists_newest_first', () => {
    expect(index_entries('version').map(e => e.value)[0]).toBe('0.3.0')
  })

  test('test_group_by_repeats_a_value_under_each_status', () => {
    const groups = index_entries('version').filter(e => e.value === '0.2.0').map(e => e.group)
    expect(groups).toEqual(['stable'])
  })
})
