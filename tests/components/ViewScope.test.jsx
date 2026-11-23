/**
 * Unit tests for the view-toggle wrap separators (components/ViewScope.jsx).
 * Separators between toggles hide where the row wrapped, measured from a ResizeObserver
 * on the toggle row.
 */
import { act, render, screen } from '@testing-library/react'
import { ViewScopeProvider, ViewToggles } from '../../components/ViewScope'


jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    asPath: '/',
    replace: jest.fn(),
    events: { on: jest.fn(), off: jest.fn() },
  }),
}))

jest.mock('../../site.config', () => ({
  versioning: null,
  display: { sidebar: ['pages', 'Tags', 'Topics'] },
  frontmatter: {
    groups: { Tags: ['tags'], Topics: ['categories'] },
    facets: {
      tags: { key: ['tags'], label: 'Tags' },
      categories: { key: ['categories'], label: 'Category' },
    },
  },
}))

jest.mock('../../public/site-meta.json', () => ({
  pages: [{ url: '/a', facets: { tags: ['overview'], categories: ['guide'] } }],
}), { virtual: true })


let observers = []

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.targets = []
    this.disconnected = false
    observers.push(this)
  }
  observe(target) { this.targets.push(target) }
  unobserve() {}
  disconnect() { this.disconnected = true }
}

beforeEach(() => {
  observers = []
  global.ResizeObserver = MockResizeObserver
})

/** Place each toggle on the row given by `rows`, then deliver a resize. */
function lay_out(rows) {
  const buttons = screen.getAllByRole('tab')
  buttons.forEach((button, i) => {
    button.getBoundingClientRect = () => ({ top: rows[i] * 30, left: 0, width: 60, height: 24 })
  })
  act(() => observers[0].callback())
}

const separators = () => [...document.querySelectorAll('.view-toggle-sep')]

/** ViewToggles reads its toggle list from the provider's context. */
const show = () => render(<ViewScopeProvider><ViewToggles /></ViewScopeProvider>)


test('test_toggles_observe_their_row', () => {
  show()
  expect(observers).toHaveLength(1)
  expect(observers[0].targets).toEqual([document.querySelector('.view-toggles')])
})


test('test_separators_visible_on_a_single_row', () => {
  show()
  lay_out([0, 0, 0])
  expect(separators().map(s => s.classList.contains('is-hidden'))).toEqual([false, false])
})


test('test_separator_hidden_where_the_row_wraps', () => {
  show()
  lay_out([0, 0, 1])
  expect(separators().map(s => s.classList.contains('is-hidden'))).toEqual([false, true])
})


test('test_observer_disconnects_on_unmount', () => {
  const { unmount } = show()
  unmount()
  expect(observers[0].disconnected).toBe(true)
})
