import { header_field_keys, group_chips } from '../../components/facets'


jest.mock('../../site.config', () => ({
  frontmatter: {
    facets: {
      version: { key: ['version'], label: 'Edition' },
      categories: { key: ['categories'], label: 'Category', hue: 210 },
      tags: { key: ['tags', 'keywords'], label: 'Tags', hue: 265 },
      status: { key: ['status'], label: 'Status', hue: 35 },
    },
  },
}))


test('test_header_field_keys_named_then_remaining', () => {
  expect(header_field_keys(['date', 'version', 'status', 'facets'])).toEqual([
    'version', 'status', 'categories', 'tags', 'keywords',
  ])
})


test('test_group_chips_follows_header_order', () => {
  const chips = group_chips(
    { version: '0.2.0', tags: ['overview'], status: 'stable' },
    ['version', 'status', 'tags'],
  )
  expect(chips).toEqual([
    { term: '0.2.0', group: 'version', facet: 'version' },
    { term: 'stable', group: 'status', facet: 'status' },
    { term: 'overview', group: 'tags', facet: 'tags' },
  ])
})

test('shared Trendly normalization deduplicates tags across mapped keys', () => {
  expect(group_chips({ keywords: ['Static-site'], tags: ['STATIC SITE', 'code'] }))
    .toEqual([
      { term: 'static site', group: 'tags', facet: 'tags' },
      { term: 'code', group: 'tags', facet: 'tags' },
    ])
})
