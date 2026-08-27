import { render, screen, fireEvent } from '@testing-library/react'
import { PageInfoToggle, PageInfoPanel, limit_tags, layout_section_rows, section_anchor } from '../../components/PageInfo'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../site.config', () => ({}))
jest.mock('next/router', () => ({
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn() } }),
}))


test('test_page_info_toggle_hidden_without_description_or_tagged_sections', () => {
  useSection.mockReturnValue({ page: { desc: null }, sections: [] })
  const { container } = render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_toggle_shows_with_description_only', () => {
  useSection.mockReturnValue({ page: { desc: 'About this page.' }, sections: [] })
  render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(screen.getByRole('button', { name: 'Show page info' })).toBeInTheDocument()
})

test('test_page_info_toggle_reflects_open_state_in_aria', () => {
  useSection.mockReturnValue({ page: { desc: 'x' }, sections: [] })
  render(<PageInfoToggle open={true} on_toggle={() => {}} />)
  const btn = screen.getByRole('button', { name: 'Hide page info' })
  expect(btn).toHaveAttribute('aria-expanded', 'true')
  expect(btn).toHaveAttribute('aria-controls', 'page-info-panel')
})

test('test_page_info_panel_renders_title_summary_and_section_tag_map', () => {
  useSection.mockReturnValue({
    page: { desc: 'A page about things.' },
    sections: [
      { name: 'Setup', tags: [{ term: 'install', group: 'category', score: 0.9 }] },
      { name: 'Usage', tags: [{ term: 'cli', group: 'topic', score: 0.8 }] },
    ],
  })
  const { container } = render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Page intelligence' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
  expect(screen.getByText('A page about things.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup')
  expect(screen.getByText('install')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '#usage')
  expect(screen.getByText('cli')).toBeInTheDocument()
  expect(container.querySelectorAll('.page-info-section')).toHaveLength(2)
})

test('test_page_info_panel_omits_summary_without_desc', () => {
  useSection.mockReturnValue({
    page: { desc: null },
    sections: [{ name: 'Only', tags: [{ term: 'x', group: 'topic', score: 1 }] }],
  })
  render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(screen.queryByRole('heading', { name: 'Summary' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Only' })).toBeInTheDocument()
})

test('test_page_info_panel_returns_null_when_closed', () => {
  useSection.mockReturnValue({ page: { desc: 'x' }, sections: [] })
  const { container } = render(<PageInfoPanel open={false} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_panel_closes_on_escape', () => {
  useSection.mockReturnValue({ page: { desc: 'x' }, sections: [] })
  const on_close = jest.fn()
  render(<PageInfoPanel open={true} on_close={on_close} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(on_close).toHaveBeenCalled()
})

test('test_page_info_panel_returns_null_when_no_info', () => {
  useSection.mockReturnValue({ page: { desc: null }, sections: [] })
  const { container } = render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_panel_limits_section_tags', () => {
  useSection.mockReturnValue({
    page: { desc: null },
    sections: [{
      name: 'Busy',
      tags: [
        { term: 'c1', group: 'category' },
        { term: 'c2', group: 'category' },
        { term: 't1', group: 'topic' },
        { term: 't2', group: 'topic' },
        { term: 'x1', group: 'concept' },
        { term: 'x2', group: 'concept' },
        { term: 'x3', group: 'concept' },
        { term: 'x4', group: 'concept' },
        { term: 'x5', group: 'concept' },
      ],
    }],
  })
  render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(screen.getByText('c1')).toBeInTheDocument()
  expect(screen.getByText('x1')).toBeInTheDocument()
  expect(screen.queryByText('x5')).not.toBeInTheDocument()
})

test('test_limit_tags_slices_array', () => {
  expect(limit_tags([{ term: 'a' }, { term: 'b' }, { term: 'c' }], 2))
    .toEqual([{ term: 'a' }, { term: 'b' }])
})

test('test_layout_section_rows_packs_busy_pages_without_thin_slices', () => {
  const sections = Array.from({ length: 8 }, (_, i) => ({
    name: `S${i}`,
    tags: [{ term: 'a' }, { term: 'b' }, { term: 'c' }, { term: 'd' }, { term: 'e' }],
  }))
  const rows = layout_section_rows(sections)
  expect(rows).toHaveLength(3)
  expect(rows.map(r => r.length)).toEqual([3, 3, 2])
  expect(rows[0][0].weight).toBe(5)
})

test('test_section_anchor_slugifies_heading_text', () => {
  expect(section_anchor('How It Works')).toBe('how-it-works')
})
