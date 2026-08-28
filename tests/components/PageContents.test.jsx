import { render, screen } from '@testing-library/react'
import PageContents, { cap_name, contents_items, edit_href } from '../../components/PageContents'
import { useSection, find_page } from '../../components/SectionContext'
import site_config from '../../site.config'

jest.mock('../../components/SectionContext', () => ({
  useSection: jest.fn(),
  find_page: jest.fn(),
  section_anchor: (name) => name.toLowerCase().replace(/\s+/g, '-'),
}))
jest.mock('../../site.config', () => ({
  repo_url: 'https://github.com/x/y',
  display: { toc: ['description', 'sections', 'related', 'edit'] },
  edit: { branch: 'main', path: 'docs', url: '{repo_url}/edit/{branch}/{file}' },
}))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }) => <a href={href}>{children}</a> }))

const ORDER = ['description', 'sections', 'related', 'edit']

function mock_page(page, sections = []) {
  useSection.mockReturnValue({ page: { links: [], related: [], ...page }, sections })
}

beforeEach(() => { find_page.mockReturnValue(undefined) })


test('test_page_contents_returns_null_without_page', () => {
  /** Nothing renders when there is no matching page (e.g. 404). */
  useSection.mockReturnValue({ page: null, sections: [] })
  const { container } = render(<PageContents order={ORDER} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_contents_returns_null_when_nothing_to_list', () => {
  /** A page with no description, sections, links or repo_url renders nothing at all. */
  const original = site_config.repo_url
  site_config.repo_url = ''
  mock_page({})
  const { container } = render(<PageContents order={ORDER} />)
  expect(container).toBeEmptyDOMElement()
  site_config.repo_url = original
})

test('test_page_contents_renders_labeled_description_first', () => {
  /** The description leads the list, under its own label, when supplied. */
  mock_page({ desc: 'A page about things.' }, [{ name: 'Fields', level: 2 }])
  const { container } = render(<PageContents order={ORDER} />)
  const first = container.querySelector('.page-contents').firstElementChild
  expect(first.querySelector('.panel-label')).toHaveTextContent('Description')
  expect(first).toHaveTextContent('A page about things.')
})

test('test_page_contents_lists_sections_with_anchors', () => {
  /** Section names link to their heading anchors; level 3+ headings indent. */
  mock_page({}, [{ name: 'Fields', level: 2 }, { name: 'Nested', level: 3 }])
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

test('test_page_contents_edit_link_renders_last', () => {
  /** With a Related block present, the edit link is still the final child. */
  find_page.mockReturnValue({ name: 'Other', url: '/other' })
  mock_page({ links: ['/other'] })
  const { container } = render(<PageContents order={ORDER} />)
  expect(container.querySelector('.page-contents').lastElementChild)
    .toContainElement(screen.getByText('Edit this page'))
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
  /** Links and related pages render together under a single "Related" label. */
  find_page.mockReturnValue({ name: 'Styling', url: '/features/styling' })
  mock_page({ links: ['/features/styling'], related: [{ name: 'Metadata', url: '/features/metadata' }] })
  const { container } = render(<PageContents order={ORDER} />)
  const labels = [...container.querySelectorAll('.panel-label')].map(l => l.textContent)
  expect(labels.filter(l => l === 'Related')).toHaveLength(1)
  expect(container.querySelectorAll('.related-link')).toHaveLength(2)
})

test('test_page_contents_follows_the_supplied_order', () => {
  /** Omitting an element drops it; the list order is the render order. */
  mock_page({ desc: 'Summary.' }, [{ name: 'Fields', level: 2 }])
  render(<PageContents order={['sections']} />)
  expect(screen.queryByText('Summary.')).not.toBeInTheDocument()
  expect(screen.getByText('On This Page')).toBeInTheDocument()
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


describe('contents_items', () => {
  test('test_contents_items_keeps_only_elements_with_content', () => {
    const page = { desc: '', links: [], related: [], source: 'a.md' }
    expect(contents_items(ORDER, page, [])).toEqual(['edit'])
  })

  test('test_contents_items_empty_without_page', () => {
    expect(contents_items(ORDER, null, [])).toEqual([])
  })
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
