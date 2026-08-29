import { header_facet_names, facet_chips, listing_facet_names } from '../../components/facets'


jest.mock('../../site.config', () => ({
  display: { header: ['date', 'reading_time', 'version', 'status', 'facets'] },
  facets: {
    version: { field: 'version', label: 'Versions', group_by: 'status', index: true },
    tags:    { field: 'tags',    label: 'Tags', index: true },
    status:  { field: 'status',  label: 'Status' },
  },
}))


test('test_header_facet_names_named_then_remaining', () => {
  expect(header_facet_names(['date', 'version', 'status', 'facets'])).toEqual([
    'version', 'status', 'tags',
  ])
})


test('test_facet_chips_follows_header_order', () => {
  const chips = facet_chips(
    { version: '0.2.0', tags: ['overview'], status: 'stable' },
    ['version', 'status', 'tags'],
  )
  expect(chips).toEqual([
    { term: '0.2.0', group: 'version' },
    { term: 'stable', group: 'status' },
    { term: 'overview', group: 'tags' },
  ])
})


test('test_listing_facet_names_drops_index_and_group_facets', () => {
  expect(listing_facet_names('version')).toEqual(['tags'])
  expect(listing_facet_names('tags')).toEqual(['tags'])
})
