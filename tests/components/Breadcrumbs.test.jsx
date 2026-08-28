import { render, screen } from '@testing-library/react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { find_page } from '../../components/SectionContext'

let mock_route = '/about'

jest.mock('../../components/SectionContext', () => ({ find_page: jest.fn() }))
jest.mock('../../site.config', () => ({ title: 'mndsite', display: { crumbs: ['home', 'path'] } }))
jest.mock('next/router', () => ({ useRouter: () => ({ route: mock_route }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}))

beforeEach(() => { find_page.mockReturnValue(undefined) })


test('test_breadcrumbs_root_is_home', () => {
  /** The trail starts at Home, linked to the site root. */
  mock_route = '/about'
  find_page.mockReturnValue({ name: 'About mndsite', url: '/about' })
  render(<Breadcrumbs />)
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
})

test('test_breadcrumbs_omit_the_current_page', () => {
  /** The page's own heading follows the trail, so the trail stops at its parent. */
  mock_route = '/about'
  find_page.mockReturnValue({ name: 'About mndsite', url: '/about' })
  const { container } = render(<Breadcrumbs />)
  expect(screen.queryByText('About mndsite')).not.toBeInTheDocument()
  expect([...container.querySelectorAll('.page-crumb')].map(n => n.textContent)).toEqual(['Home'])
})

test('test_breadcrumbs_titles_directories_without_a_page_record', () => {
  /** Generated directory indexes have no page record, so the slug is title-cased. */
  mock_route = '/features/metadata'
  const { container } = render(<Breadcrumbs />)
  expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features')
  expect([...container.querySelectorAll('.page-crumb')].map(n => n.textContent))
    .toEqual(['Home', 'Features'])
})

test('test_breadcrumbs_omitted_when_crumbs_list_is_empty', () => {
  /** An empty display.crumbs turns the trail off entirely. */
  jest.resetModules()
  jest.doMock('../../site.config', () => ({ title: 'mndsite', display: { crumbs: [] } }))
  const Fresh = require('../../components/Breadcrumbs').default
  const { container } = render(<Fresh />)
  expect(container).toBeEmptyDOMElement()
})
