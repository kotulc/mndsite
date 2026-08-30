import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ContentsToggle, ContentsPanel, close_contents_panel } from '../../components/ContentsMenu'
import { useSection } from '../../components/SectionContext'
import { useRouter } from 'next/router'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../components/PageContents', () => ({
  __esModule: true,
  default: () => <div data-testid="page-contents" />,
  contents_items: (order, page) => (page ? order : []),
}))
jest.mock('../../site.config', () => ({ display: { contents: ['sections', 'related'] } }))
jest.mock('next/router', () => {
  const handlers = new Map()
  return {
    useRouter: () => ({
      events: {
        on: (event, fn) => {
          if (!handlers.has(event)) handlers.set(event, new Set())
          handlers.get(event).add(fn)
        },
        off: (event, fn) => handlers.get(event)?.delete(fn),
        emit: (event) => handlers.get(event)?.forEach(fn => fn()),
      },
    }),
  }
})


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

test('test_close_contents_panel_compensates_scroll_when_panel_is_above_viewport', async () => {
  const panel = document.createElement('section')
  panel.id = 'contents-panel'
  Object.defineProperty(panel, 'offsetHeight', { value: 120 })
  panel.getBoundingClientRect = () => ({ top: -200, bottom: -80, height: 120 })
  document.body.appendChild(panel)

  const scrollTo = jest.fn()
  window.scrollTo = scrollTo
  Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })

  const on_close = jest.fn()
  close_contents_panel(on_close)

  expect(on_close).toHaveBeenCalled()
  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 280))

  panel.remove()
})

test('test_contents_panel_closes_after_route_change_completes', () => {
  useSection.mockReturnValue({ page: { name: 'Config' }, sections: [] })
  const on_close = jest.fn()
  const on_route_close = jest.fn()
  render(<ContentsPanel open={true} on_close={on_close} on_route_close={on_route_close} />)
  const { events } = useRouter()
  act(() => { events.emit('routeChangeStart') })
  expect(on_close).not.toHaveBeenCalled()
  expect(on_route_close).not.toHaveBeenCalled()
  act(() => { events.emit('routeChangeComplete') })
  expect(on_route_close).toHaveBeenCalled()
  expect(on_close).not.toHaveBeenCalled()
})
