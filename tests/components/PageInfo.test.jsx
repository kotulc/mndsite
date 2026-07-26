import { render, screen } from '@testing-library/react'
import { PageInfoToggle, PageInfoPanel, limit_tags, layout_section_rows, section_anchor } from '../../components/PageInfo'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../site.config', () => ({ page_tags: 5 }))


test('test_page_info_toggle_hidden_without_description_or_tagged_sections', () => {
  /** No affordance when there's nothing to show (no desc, no tagged sections). */
  useSection.mockReturnValue({ page: { desc: '' }, sections: [] })
  const { container } = render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_toggle_shows_with_description_only', () => {
  /** A page with just a description still gets the toggle. */
  useSection.mockReturnValue({ page: { desc: 'About this page.' }, sections: [] })
  render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(screen.getByRole('button', { name: 'Show page info' })).toBeInTheDocument()
})

test('test_page_info_toggle_reflects_open_state_in_aria', () => {
  /** aria-expanded / label track the open flag for accessibility. */
  useSection.mockReturnValue({ page: { desc: 'x' }, sections: [] })
  render(<PageInfoToggle open={true} on_toggle={() => {}} />)
  const btn = screen.getByRole('button', { name: 'Hide page info' })
  expect(btn).toHaveAttribute('aria-expanded', 'true')
})

test('test_page_info_panel_renders_title_summary_and_section_tag_map', () => {
  /** Card labels its summary inline and packs sections into a content-sized mosaic. */
  useSection.mockReturnValue({
    page: { desc: 'A page about things.' },
    sections: [
      { name: 'Setup', tags: { categories: ['install'] } },
      { name: 'Usage', tags: { topics: ['cli'] } },
    ],
  })
  const { container } = render(<PageInfoPanel />)
  expect(screen.getByRole('heading', { name: 'Page intelligence' })).toBeInTheDocument()
  expect(screen.getByText('Summary')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Summary' })).not.toBeInTheDocument()
  expect(screen.getByText('A page about things.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup')
  expect(screen.getByText('install')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '#usage')
  expect(screen.getByText('cli')).toBeInTheDocument()
  expect(container.querySelectorAll('.page-info-section')).toHaveLength(2)
  expect(container.querySelectorAll('.page-info-row')).toHaveLength(1)
})

test('test_page_info_panel_omits_sections_with_no_tags_and_hides_keywords', () => {
  /** Sections whose only content is keywords (or nothing) are dropped, and keywords are
   *  never rendered. */
  useSection.mockReturnValue({
    page: { desc: 'Desc.' },
    sections: [
      { name: 'Empty', tags: { keywords: ['ignored'] } },
      { name: 'Tagged', tags: { concepts: ['shown'], keywords: ['hidden'] } },
    ],
  })
  render(<PageInfoPanel />)
  expect(screen.queryByText('Empty')).not.toBeInTheDocument()
  expect(screen.queryByText('ignored')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tagged' })).toBeInTheDocument()
  expect(screen.getByText('shown')).toBeInTheDocument()
  expect(screen.queryByText('hidden')).not.toBeInTheDocument()
})

test('test_page_info_panel_returns_null_when_no_info', () => {
  /** Nothing renders when there's neither a description nor tagged sections. */
  useSection.mockReturnValue({ page: { desc: '' }, sections: [{ name: 'x', tags: {} }] })
  const { container } = render(<PageInfoPanel />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_panel_limits_section_tags_to_page_tags', () => {
  /** Each section shows at most siteConfig.page_tags chips (standard groups first). */
  useSection.mockReturnValue({
    page: { desc: '' },
    sections: [{
      name: 'Busy',
      tags: {
        categories: ['c1', 'c2'],
        topics: ['t1', 't2'],
        concepts: ['x1', 'x2'],
        entities: ['e1'],
        keywords: ['ignored'],
      },
    }],
  })
  render(<PageInfoPanel />)
  expect(screen.getByText('c1')).toBeInTheDocument()
  expect(screen.getByText('c2')).toBeInTheDocument()
  expect(screen.getByText('t1')).toBeInTheDocument()
  expect(screen.getByText('t2')).toBeInTheDocument()
  expect(screen.getByText('x1')).toBeInTheDocument()
  expect(screen.queryByText('x2')).not.toBeInTheDocument()
  expect(screen.queryByText('e1')).not.toBeInTheDocument()
  expect(screen.queryByText('ignored')).not.toBeInTheDocument()
})

test('test_limit_tags_preserves_group_membership_for_chip_coloring', () => {
  /** Truncation keeps each kept term under its original group. */
  expect(limit_tags({ topics: ['a', 'b'], categories: ['c'] }, 2))
    .toEqual({ categories: ['c'], topics: ['a'] })
})

test('test_layout_section_rows_packs_busy_pages_without_thin_slices', () => {
  /** Eight sections become rows of ~3 — no absolute thin tiles that clip chips. */
  const sections = Array.from({ length: 8 }, (_, i) => ({
    name: `S${i}`,
    tags: { categories: ['a', 'b', 'c', 'd', 'e'] },
  }))
  const rows = layout_section_rows(sections)
  expect(rows).toHaveLength(3)
  expect(rows.map(r => r.length)).toEqual([3, 3, 2])
  expect(rows.flat()).toHaveLength(8)
  expect(rows[0][0].weight).toBe(5)
})

test('test_section_anchor_slugifies_heading_text', () => {
  /** Section links target the same GitHub-style fragment Nextra puts on headings. */
  expect(section_anchor('How It Works')).toBe('how-it-works')
  expect(section_anchor('Extraction in CI')).toBe('extraction-in-ci')
})
