import { render, screen, within } from '@testing-library/react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { find_page } from '../../components/SectionContext'
import siteConfig from '../../site.config'

let mock_route
jest.mock('../../components/SectionContext', () => ({ find_page: jest.fn() }))
jest.mock('../../site.config', () => ({ title: 'Field Notes', display: { crumbs: true } }))
jest.mock('next/router', () => ({ useRouter: () => ({ route: mock_route }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }) => <a href={href}>{children}</a>,
}))

beforeEach(() => {
  mock_route = '/browse'
  siteConfig.display.crumbs = true
  find_page.mockReturnValue(undefined)
})

test('generated views use the site name and the rendered view heading', () => {
  mock_route = '/browse-pages'
  render(<Breadcrumbs heading="Pages" />)
  expect(screen.getByRole('link', { name: 'Field Notes' })).toHaveAttribute('href', '/')
  expect(screen.getByText('Pages')).toHaveAttribute('aria-current', 'page')
  expect(screen.getAllByRole('link')).toHaveLength(1)
})

test('nested pages link ancestors and end with the authored navigation label', () => {
  mock_route = '/guides/reference/api-methods/'
  find_page.mockImplementation(href => ({
    '/guides': { name: 'User guides' },
    '/guides/reference/api-methods': { name: 'API methods' },
  })[href])
  render(<Breadcrumbs heading="Calling the API" />)
  const trail = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
  expect(trail.getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')]))
    .toEqual([['Field Notes', '/'], ['User guides', '/guides'], ['Reference', '/guides/reference']])
  expect(trail.getByText('API methods')).toHaveAttribute('aria-current', 'page')
  for (const separator of trail.getAllByText('/')) expect(separator).toHaveAttribute('aria-hidden', 'true')
})

test('the root identifies the site once', () => {
  mock_route = '/'
  render(<Breadcrumbs />)
  expect(screen.getByText('Field Notes')).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('display.crumbs disables the trail', () => {
  siteConfig.display.crumbs = false
  const { container } = render(<Breadcrumbs />)
  expect(container).toBeEmptyDOMElement()
})
