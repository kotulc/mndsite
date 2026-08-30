import { render, screen } from '@testing-library/react'
import IndexListing from '../../components/IndexListing'


let asPath = '/about?view=Versions&field=version&on=0.2.0'
jest.mock('next/router', () => ({ useRouter: () => ({ query: { view: 'Versions' }, asPath }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }) => <a href={href} className={className}>{children}</a>,
}))
jest.mock('../../site.config', () => ({
  display: {
    sidebar: ['pages', 'Tags', 'Versions'],
    crumbs: ['home'],
    header: ['date', 'reading_time', 'version', 'status', 'facets'],
  },
  versioning: { field: 'version', label: 'Versions', group_by: 'status' },
  frontmatter: {
    groups: { Tags: ['tags', 'status'], Versions: 'versioning' },
    facets: {
      tags: { key: ['tags'], label: 'Tags' },
      status: { key: ['status'], label: 'Status' },
    },
  },
}))
jest.mock('../../components/filters', () => ({
  active_view: () => 'Versions',
  active_field: () => 'version',
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
  asPath = '/about?view=Versions&field=version&on=0.2.0'
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

test('test_index_listing_shows_article_when_url_has_no_facet_view', () => {
  asPath = '/about'
  render(<IndexListing><p>PAGE BODY</p></IndexListing>)
  expect(screen.getByText('PAGE BODY')).toBeInTheDocument()
})
