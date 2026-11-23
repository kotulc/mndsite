import { fireEvent, render, screen } from '@testing-library/react'
import ContentsMenu from '../../components/ContentsMenu'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))
jest.mock('../../site.config', () => ({ display: { contents: ['sections'], toc: ['sections'] } }))

function setPage(url) {
  useSection.mockReturnValue({ page: { url }, sections: [{ name: 'Fields', id: 'fields', level: 2 }] })
}

test('omits an empty disclosure', () => {
  useSection.mockReturnValue({ page: null, sections: [] })
  expect(render(<ContentsMenu />).container).toBeEmptyDOMElement()
})

test('native disclosure starts closed, opens in place and closes on section selection', () => {
  setPage('/guide')
  render(<ContentsMenu />)
  const summary = screen.getByText('Page Overview')
  expect(summary.parentElement.open).toBe(false)
  fireEvent.click(summary)
  expect(summary.parentElement.open).toBe(true)
  fireEvent.click(screen.getByRole('link', { name: 'Fields' }))
  expect(summary.parentElement.open).toBe(false)
})

test('Escape restores focus to the summary and a different page starts collapsed', () => {
  setPage('/guide')
  const { rerender } = render(<ContentsMenu />)
  const summary = screen.getByText('Page Overview')
  fireEvent.click(summary)
  fireEvent.keyDown(screen.getByRole('link'), { key: 'Escape' })
  expect(summary).toHaveFocus()
  expect(summary.parentElement.open).toBe(false)
  fireEvent.click(summary)
  setPage('/another')
  rerender(<ContentsMenu />)
  expect(screen.getByText('Page Overview').closest('details').open).toBe(false)
})
