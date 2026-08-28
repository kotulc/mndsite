import { render, screen, fireEvent } from '@testing-library/react'
import { PageInfoToggle, PageInfoPanel } from '../../components/PageInfo'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../site.config', () => ({}))
jest.mock('next/router', () => ({
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn() } }),
}))


test('test_page_info_toggle_hidden_without_description', () => {
  useSection.mockReturnValue({ page: { desc: null } })
  const { container } = render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_toggle_shows_with_description', () => {
  useSection.mockReturnValue({ page: { desc: 'About this page.' } })
  render(<PageInfoToggle open={false} on_toggle={() => {}} />)
  expect(screen.getByRole('button', { name: 'Show page info' })).toBeInTheDocument()
})

test('test_page_info_toggle_reflects_open_state_in_aria', () => {
  useSection.mockReturnValue({ page: { desc: 'x' } })
  render(<PageInfoToggle open={true} on_toggle={() => {}} />)
  const btn = screen.getByRole('button', { name: 'Hide page info' })
  expect(btn).toHaveAttribute('aria-expanded', 'true')
  expect(btn).toHaveAttribute('aria-controls', 'page-info-panel')
})

test('test_page_info_panel_renders_summary', () => {
  useSection.mockReturnValue({ page: { desc: 'A page about things.' } })
  render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
  expect(screen.getByText('A page about things.')).toBeInTheDocument()
})

test('test_page_info_panel_returns_null_when_closed', () => {
  useSection.mockReturnValue({ page: { desc: 'x' } })
  const { container } = render(<PageInfoPanel open={false} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_panel_returns_null_without_description', () => {
  useSection.mockReturnValue({ page: { desc: null } })
  const { container } = render(<PageInfoPanel open={true} on_close={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_page_info_panel_closes_on_escape', () => {
  useSection.mockReturnValue({ page: { desc: 'x' } })
  const on_close = jest.fn()
  render(<PageInfoPanel open={true} on_close={on_close} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(on_close).toHaveBeenCalled()
})
