import { render, screen } from '@testing-library/react'
import IndexListing from '../../components/IndexListing'


jest.mock('next/router', () => ({ useRouter: () => ({ query: { view: 'version' } }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }) => <a href={href} className={className}>{children}</a>,
}))
jest.mock('../../site.config', () => ({
  display: { header: ['date', 'reading_time', 'version', 'status', 'facets'] },
  facets: {
    version: { field: 'version', label: 'Versions', group_by: 'status', index: true },
    tags:    { field: 'tags',    label: 'Tags', index: true },
    status:  { field: 'status',  label: 'Status', values: ['draft', 'stable', 'deprecated'] },
  },
}))
jest.mock('../../components/filters', () => ({
  active_view: () => 'version',
  active_facet: () => 'version',
  sidebar_group: () => ({ id: 'version', label: 'Versions', facets: ['version', 'status'] }),
  selected_value: () => '0.2.0',
  listed_pages: () => [{
    url: '/about',
    name: 'About',
    published: '2026-01-15',
    excerpt: 'A portable static site renderer.',
    metrics: { reading_time: 3 },
    facets: { version: '0.2.0', tags: ['overview'], status: 'stable' },
  }],
}))


test('test_index_listing_renders_header_shaped_cards', () => {
  /** Each hit is its own card: title, date/reading time, leftover chips, body excerpt.
   *  Status is a group heading; the selected version is the page title, not a chip. */
  render(<IndexListing><p>PAGE BODY</p></IndexListing>)
  expect(screen.queryByText('PAGE BODY')).not.toBeInTheDocument()
  expect(screen.getByText('Versions')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1, name: '0.2.0' })).toBeInTheDocument()
  expect(screen.getByText('1 page')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: 'stable' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  expect(screen.getByText('January 15, 2026')).toBeInTheDocument()
  expect(screen.getByText('3 min read')).toBeInTheDocument()
  expect(screen.getByText('overview')).toBeInTheDocument()
  expect(screen.getByText('A portable static site renderer.')).toBeInTheDocument()
  expect(screen.getAllByText('0.2.0')).toHaveLength(1)
})
