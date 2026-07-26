import { render, screen } from '@testing-library/react'
import MetaSidebar from '../../components/MetaSidebar'
import { useSection, find_page } from '../../components/SectionContext'
import site_config from '../../site.config'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn(), find_page: jest.fn() }))
jest.mock('../../site.config', () => ({ repo_url: 'https://github.com/x/y' }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }) => <a href={href}>{children}</a> }))

beforeEach(() => { find_page.mockReturnValue(undefined) })


test('test_meta_sidebar_returns_null_without_page', () => {
  /** Nothing renders when there is no matching page (e.g. 404). */
  useSection.mockReturnValue({ page: null })
  const { container } = render(<MetaSidebar />)
  expect(container).toBeEmptyDOMElement()
})

test('test_meta_sidebar_no_longer_renders_description_tags_or_keywords', () => {
  /** Description, tags, keywords and metrics moved to the PageInfo panel — the sidebar
   *  only carries Related + Edit now. */
  useSection.mockReturnValue({
    page: {
      desc: 'A page about things.',
      tags: { categories: ['news'], keywords: ['thing'] },
      page_tags: { categories: ['news'] },
      metrics: { word_count: 100 },
      links: [],
      related: [],
    },
  })
  render(<MetaSidebar />)
  expect(screen.queryByText('Description')).not.toBeInTheDocument()
  expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  expect(screen.queryByText('Keywords')).not.toBeInTheDocument()
  expect(screen.queryByText('A page about things.')).not.toBeInTheDocument()
})

test('test_meta_sidebar_edit_link_renders_last', () => {
  /** With a Related block present, the edit link is still the final child. */
  useSection.mockReturnValue({ page: { links: ['/other'], related: [] } })
  const { container } = render(<MetaSidebar />)
  expect(container.querySelector('.meta-sidebar-content').lastElementChild)
    .toBe(screen.getByText('Edit this page'))
})

test('test_meta_sidebar_link_resolves_to_page_name_not_path', () => {
  /** An outbound link that resolves to a known page shows that page's name, not its URL. */
  find_page.mockReturnValue({ name: 'Configuration', url: '/configuration' })
  useSection.mockReturnValue({ page: { links: ['/configuration'], related: [] } })
  render(<MetaSidebar />)
  expect(screen.getByText('Configuration')).toBeInTheDocument()
  expect(screen.queryByText('/configuration')).not.toBeInTheDocument()
})

test('test_meta_sidebar_unresolved_link_falls_back_to_raw_href', () => {
  /** A link with no matching page (e.g. external) falls back to showing its raw href. */
  find_page.mockReturnValue(undefined)
  useSection.mockReturnValue({ page: { links: ['https://example.com'], related: [] } })
  render(<MetaSidebar />)
  expect(screen.getByText('https://example.com')).toBeInTheDocument()
})

test('test_meta_sidebar_links_and_related_share_one_section', () => {
  /** Links and related pages render together under a single "Related" label. */
  find_page.mockReturnValue({ name: 'Styling', url: '/features/styling' })
  useSection.mockReturnValue({
    page: {
      links: ['/features/styling'],
      related: [{ name: 'Metadata', url: '/features/metadata' }],
    },
  })
  const { container } = render(<MetaSidebar />)
  const labels = [...container.querySelectorAll('.meta-sidebar-label')].map(l => l.textContent)
  expect(labels.filter(l => l === 'Related')).toHaveLength(1)
  expect(container.querySelectorAll('.related-link')).toHaveLength(2)
})

test('test_meta_sidebar_hides_edit_link_without_repo_url', () => {
  /** Edit link is omitted when repo_url is unset. */
  const original = site_config.repo_url
  site_config.repo_url = ''
  useSection.mockReturnValue({ page: { links: [], related: [] } })
  render(<MetaSidebar />)
  expect(screen.queryByText('Edit this page')).not.toBeInTheDocument()
  site_config.repo_url = original
})
