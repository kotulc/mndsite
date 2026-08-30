/** Nextra mobile drawer helpers (menu state is not exported from nextra-theme-docs). */

export const MOBILE_MAX = 767
export const HAMBURGER = 'button.nextra-hamburger[aria-label="Menu"]'


export function mobile_viewport() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX
}


export function mobile_menu_open() {
  return mobile_viewport() && document.body.classList.contains('nx-overflow-hidden')
}


export function route_pathname(url) {
  return url.split('?')[0].split('#')[0]
}


let clear_mobile_drawer_fn = null


export function register_mobile_drawer_clear(fn) {
  clear_mobile_drawer_fn = fn
  return () => {
    if (clear_mobile_drawer_fn === fn) clear_mobile_drawer_fn = null
  }
}


export function clear_mobile_drawer() {
  clear_mobile_drawer_fn?.()
}
