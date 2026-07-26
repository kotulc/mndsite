import { render, screen, fireEvent } from '@testing-library/react'
import { TocMenuToggle, TocMenuPanel } from '../../components/TocMenu'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../components/MetaSidebar', () => () => <div data-testid="meta-sidebar" />)
jest.mock('../../components/PageInfo', () => ({ section_anchor: (name) => name.toLowerCase().replace(/\s+/g, '-') }))
jest.mock('../../site.config', () => ({ toc: true }))
jest.mock('next/router', () => ({
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn() } }),
}))


test('test_toc_menu_toggle_hidden_when_toc_disabled', () => {
  /** Contents button respects siteConfig.toc === false. */
  const siteConfig = require('../../site.config')
  const original = siteConfig.toc
  siteConfig.toc = false
  useSection.mockReturnValue({ page: { name: 'Config' }, sections: [{ name: 'A', level: 2 }] })
  const { container } = render(<TocMenuToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
  siteConfig.toc = original
})

test('test_toc_menu_toggle_hidden_without_page', () => {
  /** No Contents button when there is no matching page. */
  useSection.mockReturnValue({ page: null, sections: [] })
  const { container } = render(<TocMenuToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_toc_menu_toggle_shows_for_page_with_section_count', () => {
  /** Button labels Contents and surfaces the section count. */
  useSection.mockReturnValue({
    page: { name: 'Config' },
    sections: [{ name: 'Fields', level: 2 }, { name: 'Theme', level: 2 }],
  })
  render(<TocMenuToggle open={false} on_toggle={() => {}} />)
  expect(screen.getByRole('button', { name: 'Show page contents' })).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
})

test('test_toc_menu_panel_lists_sections_and_meta_sidebar', () => {
  /** Inline panel shows Page Contents links (### indented) plus MetaSidebar. */
  useSection.mockReturnValue({
    page: { name: 'Config' },
    sections: [
      { name: 'Fields', level: 2 },
      { name: 'Nested', level: 3 },
    ],
  })
  const on_close = jest.fn()
  const { container } = render(<TocMenuPanel open={true} on_close={on_close} />)
  expect(screen.getByRole('region', { name: 'Page contents' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Page Contents' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Fields' })).toHaveAttribute('href', '#fields')
  expect(screen.getByRole('link', { name: 'Nested' })).toHaveAttribute('href', '#nested')
  expect(container.querySelector('.toc-menu-sub')).toHaveTextContent('Nested')
  expect(screen.getByTestId('meta-sidebar')).toBeInTheDocument()
})

test('test_toc_menu_panel_returns_null_when_closed', () => {
  /** Nothing mounts while the panel is closed. */
  useSection.mockReturnValue({ page: { name: 'X' }, sections: [] })
  const { container } = render(<TocMenuPanel open={false} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_toc_menu_panel_closes_on_escape_and_section_click', () => {
  /** Escape and choosing a heading both dismiss the panel. */
  useSection.mockReturnValue({
    page: { name: 'Config' },
    sections: [{ name: 'Theme', level: 2 }],
  })
  const on_close = jest.fn()
  render(<TocMenuPanel open={true} on_close={on_close} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(on_close).toHaveBeenCalled()
  on_close.mockClear()
  fireEvent.click(screen.getByRole('link', { name: 'Theme' }))
  expect(on_close).toHaveBeenCalled()
})
