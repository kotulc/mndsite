import { render, screen } from '@testing-library/react'
import MetaSidebar, { edit_href } from '../../components/MetaSidebar'
import { useSection, find_page } from '../../components/SectionContext'
import site_config from '../../site.config'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn(), find_page: jest.fn() }))
jest.mock('../../site.config', () => ({
  repo_url: 'https://github.com/x/y',
  display: { toc: ['sections', 'related', 'edit'] },
  edit: { branch: 'main', path: 'docs', url: '{repo_url}/edit/{branch}/{file}' },
}))
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
  find_page.mockReturnValue({ name: 'Other', url: '/other' })
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

test('test_meta_sidebar_external_link_shows_hostname', () => {
  /** Intentional external markdown links show the hostname, not the raw URL. */
  find_page.mockReturnValue(undefined)
  useSection.mockReturnValue({ page: { links: ['https://example.com/path'], related: [] } })
  render(<MetaSidebar />)
  expect(screen.getByText('example.com')).toBeInTheDocument()
  expect(screen.getByText('example.com').closest('a')).toHaveAttribute('href', 'https://example.com/path')
})

test('test_meta_sidebar_drops_unresolved_internal_and_fragments', () => {
  /** Fragment-only / unresolved internal paths are not shown in Related. */
  find_page.mockReturnValue(undefined)
  useSection.mockReturnValue({ page: { links: ['#theme', '/missing-page'], related: [] } })
  render(<MetaSidebar />)
  expect(screen.queryByText('#theme')).not.toBeInTheDocument()
  expect(screen.queryByText('/missing-page')).not.toBeInTheDocument()
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
  const labels = [...container.querySelectorAll('.panel-label')].map(l => l.textContent)
  expect(labels.filter(l => l === 'Related')).toHaveLength(1)
  expect(container.querySelectorAll('.related-link')).toHaveLength(2)
})

test('test_meta_sidebar_hides_edit_link_without_repo_url', () => {
  /** Edit link is omitted when repo_url is unset; empty sidebar returns null. */
  const original = site_config.repo_url
  site_config.repo_url = ''
  useSection.mockReturnValue({ page: { links: [], related: [] } })
  const { container } = render(<MetaSidebar />)
  expect(container).toBeEmptyDOMElement()
  site_config.repo_url = original
})


describe('edit_href', () => {
  test('test_edit_href_targets_the_page_source_in_the_repo', () => {
    expect(edit_href({ source: 'features/overview.md' }))
      .toBe('https://github.com/x/y/edit/main/docs/features/overview.md')
  })

  test('test_edit_href_falls_back_to_repo_root_without_source', () => {
    expect(edit_href({ source: '' })).toBe('https://github.com/x/y')
  })

  test('test_edit_href_falls_back_to_repo_root_for_unknown_host', () => {
    const original = site_config.edit.url
    site_config.edit.url = ''
    expect(edit_href({ source: 'a.md' })).toBe('https://github.com/x/y')
    site_config.edit.url = original
  })

  test('test_edit_href_empty_without_repo_url', () => {
    const original = site_config.repo_url
    site_config.repo_url = ''
    expect(edit_href({ source: 'a.md' })).toBe('')
    site_config.repo_url = original
  })

  test('test_edit_href_omits_empty_path_segment', () => {
    const original = site_config.edit.path
    site_config.edit.path = ''
    expect(edit_href({ source: 'a.md' })).toBe('https://github.com/x/y/edit/main/a.md')
    site_config.edit.path = original
  })
})
