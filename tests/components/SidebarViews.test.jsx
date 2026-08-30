import { render, screen } from '@testing-library/react'
import SidebarViews from '../../components/SidebarViews'
import { ViewScopeProvider } from '../../components/ViewScope'


jest.mock('next/router', () => ({
  useRouter: () => ({ query: { view: 'Tags' }, replace: jest.fn() }),
}))

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: node => node,
}))

jest.mock('../../site.config', () => ({
  versioning: null,
  display: { sidebar: ['pages', 'Tags'] },
  frontmatter: {
    groups: { Tags: ['status', 'categories', 'tags'] },
    facets: {
      status: { key: ['status'], label: 'Status' },
      categories: { key: ['categories'], label: 'Category' },
      tags: { key: ['tags'], label: 'Tags' },
    },
  },
}))

jest.mock('../../public/site-meta.json', () => ({
  pages: [
    { url: '/a', facets: { status: 'stable', categories: ['guide'], tags: ['overview'] } },
  ],
}), { virtual: true })

beforeEach(() => {
  document.body.innerHTML = '<div class="nextra-sidebar-container"><div class="nextra-scrollbar"></div></div>'
})


test('test_sidebar_shows_facet_labels_for_multi_field_group', () => {
  render(
    <ViewScopeProvider>
      <SidebarViews />
    </ViewScopeProvider>,
  )
  expect(screen.getByText('Status')).toBeInTheDocument()
  expect(screen.getByText('Category')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'overview' })).toBeInTheDocument()
})
