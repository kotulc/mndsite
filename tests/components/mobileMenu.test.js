import { clear_mobile_drawer, mobile_menu_open, mobile_viewport, register_mobile_drawer_clear, route_pathname } from '../../components/mobileMenu'


beforeEach(() => {
  document.body.className = ''
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
})


test('test_mobile_viewport_matches_nextra_breakpoint', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 767 })
  expect(mobile_viewport()).toBe(true)
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 })
  expect(mobile_viewport()).toBe(false)
})


test('test_mobile_menu_open_reads_body_lock_class', () => {
  expect(mobile_menu_open()).toBe(false)
  document.body.classList.add('nx-overflow-hidden')
  expect(mobile_menu_open()).toBe(true)
})


test('test_route_pathname_strips_query_and_hash', () => {
  expect(route_pathname('/about?view=Tags#section')).toBe('/about')
})


test('test_register_mobile_drawer_clear', () => {
  const clear = jest.fn()
  const release = register_mobile_drawer_clear(clear)
  clear_mobile_drawer()
  expect(clear).toHaveBeenCalledTimes(1)
  release()
})
