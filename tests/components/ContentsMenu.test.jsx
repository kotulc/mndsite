import { render, screen, fireEvent } from '@testing-library/react'
import { ContentsToggle, ContentsPanel } from '../../components/ContentsMenu'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../components/PageContents', () => ({
  __esModule: true,
  default: () => <div data-testid="page-contents" />,
  contents_items: (order, page) => (page ? order : []),
}))
jest.mock('../../site.config', () => ({ display: { contents: ['sections', 'related'] } }))
jest.mock('next/router', () => ({
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn() } }),
}))


test('test_contents_toggle_hidden_without_page', () => {
  /** No Contents button when the page has nothing to list. */
  useSection.mockReturnValue({ page: null, sections: [] })
  const { container } = render(<ContentsToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_contents_toggle_shows_section_count', () => {
  /** Button labels Contents and surfaces the section count. */
  useSection.mockReturnValue({
    page: { name: 'Config' },
    sections: [{ name: 'Fields', level: 2 }, { name: 'Theme', level: 2 }],
  })
  render(<ContentsToggle open={false} on_toggle={() => {}} />)
  expect(screen.getByRole('button', { name: 'Show page contents' })).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
})

test('test_contents_panel_renders_the_sidebar_body', () => {
  /** The open panel is a labeled region wrapping PageContents. */
  useSection.mockReturnValue({ page: { name: 'Config' }, sections: [] })
  render(<ContentsPanel open={true} on_close={() => {}} />)
  expect(screen.getByRole('region', { name: 'Page contents' })).toBeInTheDocument()
  expect(screen.getByTestId('page-contents')).toBeInTheDocument()
})

test('test_contents_panel_returns_null_when_closed', () => {
  /** Nothing mounts while the panel is closed. */
  useSection.mockReturnValue({ page: { name: 'X' }, sections: [] })
  const { container } = render(<ContentsPanel open={false} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_contents_panel_closes_on_escape', () => {
  /** Escape dismisses the panel. */
  useSection.mockReturnValue({ page: { name: 'Config' }, sections: [] })
  const on_close = jest.fn()
  render(<ContentsPanel open={true} on_close={on_close} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(on_close).toHaveBeenCalled()
})
