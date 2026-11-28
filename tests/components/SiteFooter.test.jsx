import { render, screen } from '@testing-library/react'
import SiteFooter, { SiteFooterLayout } from '../../components/SiteFooter'
import siteConfig from '../../site.config'

jest.mock('../../site.config', () => ({ title: 'testsite', footer: '' }))


afterEach(() => {
  siteConfig.footer = ''
  delete siteConfig.icon
  delete siteConfig.support
  jest.restoreAllMocks()
})

test('the support banner renders its configured link text', () => {
  siteConfig.support = { title: 'Support the project', url: 'https://example.com/support' }
  render(<SiteFooterLayout />)
  expect(screen.getByRole('link', { name: 'Support the project' })).toHaveAttribute('href', 'https://example.com/support')
})

test('test_site_footer_default_credits', () => {
  /** Without a footer config value the default mndsite/Nextra credits render. */
  render(<SiteFooter />)
  expect(screen.getByText('mndsite')).toBeInTheDocument()
  expect(screen.getByText('Nextra')).toBeInTheDocument()
})

test('test_site_footer_custom_text', () => {
  /** A configured footer string replaces the default credits. */
  siteConfig.footer = 'Custom credits'
  render(<SiteFooter />)
  expect(screen.getByText('Custom credits')).toBeInTheDocument()
  expect(screen.queryByText('Nextra')).not.toBeInTheDocument()
})

test('the configured icon appears above the footer text and updated date', () => {
  siteConfig.icon = '/assets/mnd.svg'
  siteConfig.footer = 'Custom credits'
  const buildTime = '2026-01-02T15:04:00.000Z'
  jest.replaceProperty(process, 'env', {
    ...process.env, NEXT_PUBLIC_BASE_PATH: '/project', NEXT_PUBLIC_BUILD_TIME: buildTime,
  })

  const { container } = render(<SiteFooter />)
  const [icon, text, updated] = container.firstElementChild.children
  expect(icon).toHaveAttribute('src', '/project/assets/mnd.svg')
  expect(icon).toHaveAttribute('width', '44')
  expect(text).toHaveTextContent(/^Custom credits$/)
  expect(updated).toHaveAttribute('datetime', buildTime)
  expect(updated).toHaveTextContent('Updated January 2, 2026')
})
