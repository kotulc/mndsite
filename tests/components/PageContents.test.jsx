import { render, screen, fireEvent } from '@testing-library/react'
import PageContents, { cap_name } from '../../components/PageContents'
import { useSection, find_page } from '../../components/SectionContext'
import site_config from '../../site.config'
import siteMeta from '../../public/site-meta.json'

jest.mock('../../components/SectionContext', () => ({
  useSection: jest.fn(),
  find_page: jest.fn(),
}))
jest.mock('../../public/site-meta.json', () => ({}))
jest.mock('../../site.config', () => ({
  display: { toc: ['description', 'sections', 'related'] },
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, onClick, title }) => (
    <a href={href} onClick={onClick} title={title}>{children}</a>
  ),
}))

const mock_push = jest.fn(() => Promise.resolve())
const mock_replace = jest.fn(() => Promise.resolve())
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/current',
    query: {},
    push: mock_push,
    replace: mock_replace,
  }),
}))

const ORDER = ['description', 'sections', 'related']

function mock_page(page, sections = []) {
  useSection.mockReturnValue({ page: { links: [], related: [], ...page }, sections })
}

beforeEach(() => {
  site_config.related_links = []
  siteMeta.recent_posts = []
  find_page.mockReturnValue(undefined)
  mock_push.mockClear()
  mock_replace.mockClear()
})


test('test_page_contents_returns_null_without_page', () => {
  /** Nothing renders when there is no matching page (e.g. 404). */
  useSection.mockReturnValue({ page: null, sections: [] })
  const { container } = render(<PageContents order={ORDER} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_contents_returns_null_when_nothing_to_list', () => {
  mock_page({})
  const { container } = render(<PageContents order={ORDER} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_contents_renders_labeled_description_first', () => {
  /** The description leads the list, under its own label, when supplied. */
  mock_page({ desc: 'A page about things.' }, [{ name: 'Fields', id: 'fields', level: 2 }])
  const { container } = render(<PageContents order={ORDER} />)
  const first = container.querySelector('.page-contents').firstElementChild
  expect(first.querySelector('.panel-label')).toHaveTextContent('Description')
  expect(first).toHaveTextContent('A page about things.')
})

test('test_page_contents_lists_sections_with_anchors', () => {
  /** Section names link to their heading anchors; level 3+ headings indent. */
  mock_page({}, [{ name: 'Fields', id: 'fields', level: 2 }, { name: 'Nested', id: 'nested', level: 3 }])
  const { container } = render(<PageContents order={ORDER} />)
  expect(screen.getByRole('link', { name: 'Fields' })).toHaveAttribute('href', '#fields')
  expect(container.querySelector('.page-contents-sub')).toHaveTextContent('Nested')
})

test('test_page_contents_elides_long_names_but_keeps_them_on_hover', () => {
  /** A long section name renders capped; the full text stays in the title attribute. */
  const long = 'A section heading long enough to need eliding in a column'
  mock_page({}, [{ name: long, level: 2 }])
  const link = render(<PageContents order={ORDER} />).container.querySelector('.page-contents-list a')
  expect(link).toHaveAttribute('title', long)
  expect(link.textContent.trim()).toBe(cap_name(long))
  expect(link.textContent).not.toContain('column')
})

test('renders Related Pages, Related Links, and Recent Posts in order', () => {
  mock_page({ links: ['/other', 'https://example.com/forum'] })
  find_page.mockImplementation(href => href === '/other' ? { name: 'Other', url: '/other' } : undefined)
  site_config.related_links = [
    { name: 'Forum', href: 'https://example.com/forum' },
    { name: 'Project guide', href: '/guide/' },
  ]
  siteMeta.recent_posts = [{ name: 'New post', href: '/new' }]
  const { container } = render(<PageContents order={ORDER} />)
  expect([...container.querySelectorAll('.panel-label')].map(label => label.textContent))
    .toEqual(['Related Pages', 'Related Links', 'Recent Posts'])
  expect(screen.getByRole('link', { name: 'Forum' })).toHaveAttribute('href', 'https://example.com/forum')
  expect(screen.getByRole('link', { name: 'Project guide' })).toHaveAttribute('href', '/guide/')
  expect(screen.queryByText('example.com')).not.toBeInTheDocument()
})

test('test_page_contents_link_resolves_to_page_name_not_path', () => {
  /** An outbound link that resolves to a known page shows that page's name, not its URL. */
  find_page.mockReturnValue({ name: 'Configuration', url: '/configuration' })
  mock_page({ links: ['/configuration'] })
  render(<PageContents order={ORDER} />)
  expect(screen.getByText('Configuration')).toBeInTheDocument()
  expect(screen.queryByText('/configuration')).not.toBeInTheDocument()
})

test('test_page_contents_external_link_shows_hostname', () => {
  /** Intentional external markdown links show the hostname, not the raw URL. */
  mock_page({ links: ['https://example.com/path'] })
  render(<PageContents order={ORDER} />)
  expect(screen.getByText('example.com').closest('a')).toHaveAttribute('href', 'https://example.com/path')
})

test('test_page_contents_drops_unresolved_internal_and_fragments', () => {
  /** Fragment-only / unresolved internal paths are not shown in Related. */
  mock_page({ links: ['#theme', '/missing-page'] })
  render(<PageContents order={ORDER} />)
  expect(screen.queryByText('#theme')).not.toBeInTheDocument()
  expect(screen.queryByText('/missing-page')).not.toBeInTheDocument()
})

test('test_page_contents_links_and_related_share_one_section', () => {
  /** Internal links and frontmatter recommendations share the Related Pages label. */
  find_page.mockReturnValue({ name: 'Styling', url: '/features/styling' })
  mock_page({ links: ['/features/styling'], related: [{ name: 'Metadata', url: '/features/metadata' }] })
  const { container } = render(<PageContents order={ORDER} />)
  const labels = [...container.querySelectorAll('.panel-label')].map(l => l.textContent)
  expect(labels.filter(l => l === 'Related Pages')).toHaveLength(1)
  expect(container.querySelectorAll('.related-link')).toHaveLength(2)
})

test('test_page_contents_follows_the_supplied_order', () => {
  /** Omitting an element drops it; the list order is the render order. */
  mock_page({ desc: 'Summary.' }, [{ name: 'Fields', id: 'fields', level: 2 }])
  render(<PageContents order={['sections']} />)
  expect(screen.queryByText('Summary.')).not.toBeInTheDocument()
  expect(screen.getByText('On This Page')).toBeInTheDocument()
})

test('test_page_contents_related_leaves_panel_open_on_click', () => {
  find_page.mockReturnValue({ name: 'Other', url: '/other' })
  mock_page({ links: ['/other'] })
  const on_close = jest.fn()
  render(<PageContents order={['related']} on_navigate={on_close} />)
  fireEvent.click(screen.getByRole('link', { name: 'Other' }))
  expect(on_close).not.toHaveBeenCalled()
})

test('section links retain their native fragment destination when dismissing Contents', () => {
  mock_page({}, [{ name: 'Fields', id: 'fields', level: 2 }])
  const on_close = jest.fn()
  render(<PageContents order={['sections']} on_navigate={on_close} />)
  const link = screen.getByRole('link', { name: 'Fields' })
  expect(link).toHaveAttribute('href', '#fields')
  fireEvent.click(link)
  expect(on_close).toHaveBeenCalled()
})

describe('cap_name', () => {
  const long = 'A section heading long enough to need eliding in a column'

  test('test_cap_name_leaves_short_names_untouched', () => {
    expect(cap_name('Fields')).toBe('Fields')
  })

  test('test_cap_name_elides_on_a_word_boundary', () => {
    const capped = cap_name(long)
    expect(capped.endsWith('…')).toBe(true)
    expect(long.startsWith(capped.slice(0, -1))).toBe(true)
    expect(capped).not.toMatch(/\s…$/)
  })

  test('test_cap_name_elides_a_single_long_word', () => {
    const word = 'x'.repeat(60)
    expect(cap_name(word)).toBe(`${'x'.repeat(26)}…`)
  })
})
