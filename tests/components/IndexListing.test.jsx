import { render, screen } from '@testing-library/react'
import IndexListing from '../../components/IndexListing'
import SidebarViews from '../../components/SidebarViews'
import { ViewScopeProvider } from '../../components/ViewScope'


jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: node => node,
}))

let asPath = '/about?view=Versions&field=version&on=0.2.0'
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { view: 'Versions' },
    asPath,
    replace: jest.fn(),
    events: { on: jest.fn(), off: jest.fn() },
  }),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }) => <a href={href} className={className}>{children}</a>,
}))
jest.mock('../../site.config', () => ({
  display: {
    sidebar: ['pages', 'Tags', 'Versions'],
    crumbs: true,
    header: ['date', 'reading_time', 'version', 'status', 'facets'],
  },
  versioning: { key: 'version', label: 'Versions', group_by: 'status' },
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
  sidebar_toggles: () => [
    { id: 'pages', label: 'Pages' },
    { id: 'Tags', label: 'Tags' },
    { id: 'Versions', label: 'Versions' },
  ],
  sidebar_groups: () => [
    { id: 'Versions', label: 'Versions', fields: ['version'], versioning: true },
  ],
  listed_pages: () => [{
    url: '/about',
    name: 'About',
    published: '2026-01-15',
    excerpt: 'A portable static site renderer.',
    metrics: { reading_time: 3 },
    facets: { version: '0.2.0', tags: ['overview'], status: 'stable' },
  }],
  index_entries: () => [],
}))


function render_listing(children) {
  return render(
    <ViewScopeProvider>
      <SidebarViews />
      <IndexListing>{children}</IndexListing>
    </ViewScopeProvider>,
  )
}

beforeEach(() => {
  document.body.innerHTML = '<div class="nextra-sidebar-container"></div>'
})


test('test_index_listing_renders_header_shaped_cards', () => {
  asPath = '/about?view=Versions&field=version&on=0.2.0'
  render_listing(<p>PAGE BODY</p>)
  expect(screen.queryByText('PAGE BODY')).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Versions' })).toBeInTheDocument()
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
  render_listing(<p>PAGE BODY</p>)
  expect(screen.getByText('PAGE BODY')).toBeInTheDocument()
})
