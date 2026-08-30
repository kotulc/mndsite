import { renderHook, act } from '@testing-library/react'
import { useMobileDrawer } from '../../components/MobileDrawer'


const listeners = new Map()

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/features/overview',
    events: {
      on: (event, handler) => {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event).add(handler)
      },
      off: (event, handler) => listeners.get(event)?.delete(handler),
    },
  }),
}))

function fire_route(url) {
  for (const handler of listeners.get('routeChangeComplete') || []) handler(url)
}


beforeEach(() => {
  listeners.clear()
  document.body.className = ''
  document.body.innerHTML = [
    '<div class="nextra-sidebar-container">',
    '<a href="/about">About</a>',
    '</div>',
  ].join('')
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
})


test('test_mobile_drawer_clears_on_path_change', () => {
  const { result } = renderHook(() => useMobileDrawer())
  document.body.classList.add('nx-overflow-hidden')

  act(() => {
    result.current.pin_for_group_toggle()
  })
  expect(document.documentElement.dataset.mobileDrawer).toBe('open')

  act(() => {
    fire_route('/about')
  })
  expect(document.documentElement.dataset.mobileDrawer).toBeUndefined()
})

test('test_mobile_drawer_clears_on_sidebar_link_click', () => {
  const { result } = renderHook(() => useMobileDrawer())
  document.body.classList.add('nx-overflow-hidden')

  act(() => {
    result.current.pin_for_group_toggle()
  })
  expect(document.documentElement.dataset.mobileDrawer).toBe('open')

  act(() => {
    document.querySelector('a[href="/about"]').click()
  })
  expect(document.documentElement.dataset.mobileDrawer).toBeUndefined()
})

test('test_mobile_drawer_clears_on_sidebar_section_link_click', () => {
  document.body.innerHTML = [
    '<div class="nextra-sidebar-container">',
    '<a href="#fields">Fields</a>',
    '</div>',
  ].join('')
  const { result } = renderHook(() => useMobileDrawer())
  document.body.classList.add('nx-overflow-hidden')

  act(() => {
    result.current.pin_for_group_toggle()
  })

  act(() => {
    document.querySelector('a[href="#fields"]').click()
  })
  expect(document.documentElement.dataset.mobileDrawer).toBeUndefined()
})

test('test_mobile_drawer_stays_pinned_on_query_only_route', () => {
  const { result } = renderHook(() => useMobileDrawer())
  document.body.classList.add('nx-overflow-hidden')

  act(() => {
    result.current.pin_for_group_toggle()
  })

  act(() => {
    fire_route('/features/overview?view=Tags')
  })
  expect(document.documentElement.dataset.mobileDrawer).toBe('open')
})
