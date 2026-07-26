import { render } from '@testing-library/react'
import SectionMarker from '../../components/SectionMarker'
import { useSection } from '../../components/SectionContext'

jest.mock('../../components/SectionContext', () => ({ useSection: jest.fn() }))

beforeEach(() => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(), disconnect: jest.fn(),
  }))
})


test('test_section_marker_renders_no_visible_content', () => {
  /** The marker is a bare, invisible scroll anchor — no tag chips are rendered inline anymore. */
  const set_active = jest.fn()
  useSection.mockReturnValue({ set_active })
  const { container } = render(<SectionMarker i={2} />)
  expect(container.querySelector('.section-marker')).toBeEmptyDOMElement()
})

test('test_section_marker_observes_its_own_element_for_scrollspy', () => {
  /** Registers an IntersectionObserver on mount so scrolling into view updates the active section. */
  useSection.mockReturnValue({ set_active: jest.fn() })
  render(<SectionMarker i={0} />)
  expect(global.IntersectionObserver).toHaveBeenCalled()
})

test('test_section_marker_reports_its_index_when_intersecting', () => {
  /** set_active(i) is called with this marker's own index when it scrolls into the trigger band. */
  const set_active = jest.fn()
  useSection.mockReturnValue({ set_active })
  render(<SectionMarker i={3} />)
  const [[callback]] = global.IntersectionObserver.mock.calls
  callback([{ isIntersecting: true }])
  expect(set_active).toHaveBeenCalledWith(3)
})
