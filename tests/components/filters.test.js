/**
 * Unit tests for facet indexes (components/filters.js).
 */
jest.mock('../../site.config', () => ({
  release: '0.3.0',
  display: {
    sidebar: ['pages', 'Tags', 'Versions'],
    header: ['date', 'reading_time', 'version', 'status', 'facets'],
  },
  versioning: {
    key: 'version',
    label: 'Versions',
    sort: 'semver',
    hue: 190,
    inherit: true,
    history: true,
    default: 'latest',
    group_by: 'status',
  },
  frontmatter: {
    groups: {
      Tags: ['tags'],
      Versions: 'versioning',
    },
    facets: {
      tags: {
        key: ['tags'],
        label: 'Tags',
        sort: 'alpha',
        hue: 265,
      },
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
  active_field, active_view, field_domain, index_entries, sidebar_groups,
  listed_pages, selected_value,
} = require('../../components/filters')


const urls = pages => pages.map(p => p.url)


describe('sidebar_groups', () => {
  test('test_sidebar_groups_follow_display_sidebar', () => {
    expect(sidebar_groups()).toEqual([
      { id: 'Tags', label: 'Tags', fields: ['tags'] },
      { id: 'Versions', label: 'Versions', fields: ['version'], versioning: true },
    ])
  })
})


describe('field_domain', () => {
  test('test_domain_semver_normalized_ascending', () => {
    expect(field_domain('version', { sort: 'semver' })).toEqual(['0.1.0', '0.2.0', '0.3.0'])
  })
})


describe('active_view and selected_value', () => {
  test('test_view_defaults_to_pages', () => {
    expect(active_view({})).toBe('pages')
  })

  test('test_view_from_query', () => {
    expect(active_view({ view: 'Versions' })).toBe('Versions')
  })

  test('test_view_unknown_falls_back_to_pages', () => {
    expect(active_view({ view: 'nope' })).toBe('pages')
  })

  test('test_selected_defaults_to_latest', () => {
    expect(selected_value({}, 'Versions')).toBe('latest')
  })

  test('test_selected_from_query', () => {
    expect(selected_value({ on: '0.2.0' }, 'Versions')).toBe('0.2.0')
  })

  test('test_active_field_defaults_to_group_primary', () => {
    expect(active_field({}, 'Tags')).toBe('tags')
  })

  test('test_active_field_from_query', () => {
    expect(active_field({ field: 'tags' }, 'Tags')).toBe('tags')
  })
})


describe('listed_pages', () => {
  test('test_latest_with_history_is_head_tree', () => {
    expect(urls(listed_pages('Versions', 'version', 'latest'))).toEqual(['/a', '/b', '/g/c', '/g/d', '/plain'])
  })

  test('test_snapshot_value_uses_frozen_tree', () => {
    expect(urls(listed_pages('Versions', 'version', '0.1.0'))).toEqual(['/_history/0.1.0/a'])
  })

  test('test_unstamped_head_value_lists_matching_pages', () => {
    expect(urls(listed_pages('Versions', 'version', '0.2.0'))).toEqual(['/b', '/g/d'])
  })
})


describe('index_entries', () => {
  test('test_semver_lists_newest_first', () => {
    expect(index_entries('Versions', 'version').map(e => e.value)[0]).toBe('0.3.0')
  })

  test('test_group_by_repeats_a_value_under_each_status', () => {
    const groups = index_entries('Versions', 'version').filter(e => e.value === '0.2.0').map(e => e.group)
    expect(groups).toEqual(['stable'])
  })
})
