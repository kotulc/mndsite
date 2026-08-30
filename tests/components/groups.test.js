import { header_field_keys, group_chips, listing_field_keys } from '../../components/groups'


jest.mock('../../site.config', () => ({
  display: {
    sidebar: ['pages', 'Tags', 'Versions'],
    header: ['date', 'reading_time', 'version', 'status', 'facets'],
  },
  versioning: { field: 'version', label: 'Versions', hue: 190, group_by: 'status' },
  frontmatter: {
    groups: {
      Tags: ['status', 'categories', 'tags'],
      Versions: 'versioning',
    },
    facets: {
      categories: { key: ['categories'], label: 'Category', hue: 210 },
      tags: { key: ['tags'], label: 'Tags', hue: 265 },
      status: { key: ['status'], label: 'Status', hue: 35 },
    },
  },
}))


test('test_header_field_keys_named_then_remaining', () => {
  expect(header_field_keys(['date', 'version', 'status', 'facets'])).toEqual([
    'version', 'status', 'categories', 'tags',
  ])
})


test('test_group_chips_follows_header_order', () => {
  const chips = group_chips(
    { version: '0.2.0', tags: ['overview'], status: 'stable' },
    ['version', 'status', 'tags'],
  )
  expect(chips).toEqual([
    { term: '0.2.0', group: 'version' },
    { term: 'stable', group: 'status' },
    { term: 'overview', group: 'tags' },
  ])
})


test('test_listing_field_keys_drops_group_fields', () => {
  expect(listing_field_keys('Versions', 'version')).toEqual(['categories', 'tags'])
  expect(listing_field_keys('Tags', 'status')).toEqual(['version'])
})
