/**
 * Keeps Nextra's mobile sidebar drawer open across shallow ?view= group toggles only.
 * Clears when the user picks a facet value or navigates to a page.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { HAMBURGER, mobile_menu_open, mobile_viewport, register_mobile_drawer_clear, route_pathname } from './mobileMenu'


const SIDEBAR_LINK = '.nextra-sidebar-container a[href]'


export function useMobileDrawer() {
  const router = useRouter()
  const [pinned, set_pinned] = useState(false)
  const pathname = useRef(route_pathname(router.asPath))

  useEffect(() => {
    return register_mobile_drawer_clear(() => set_pinned(false))
  }, [])

  useEffect(() => {
    if (!pinned) {
      delete document.documentElement.dataset.mobileDrawer
      if (!mobile_menu_open()) {
        document.body.classList.remove('nx-overflow-hidden', 'md:nx-overflow-auto')
      }
      return
    }

    document.documentElement.dataset.mobileDrawer = 'open'
    document.body.classList.add('nx-overflow-hidden', 'md:nx-overflow-auto')
    return () => {
      delete document.documentElement.dataset.mobileDrawer
    }
  }, [pinned])

  useEffect(() => {
    function on_hamburger_click(e) {
      if (!mobile_viewport()) return
      if (!e.target.closest(HAMBURGER)) return
      setTimeout(() => set_pinned(mobile_menu_open()), 0)
    }
    document.addEventListener('click', on_hamburger_click)
    return () => document.removeEventListener('click', on_hamburger_click)
  }, [])

  useEffect(() => {
    function on_sidebar_link(e) {
      if (!mobile_viewport() || !pinned) return
      const link = e.target.closest(SIDEBAR_LINK)
      if (!link) return
      set_pinned(false)
    }
    document.addEventListener('click', on_sidebar_link, true)
    return () => document.removeEventListener('click', on_sidebar_link, true)
  }, [pinned])

  useEffect(() => {
    function on_route(url) {
      const path = route_pathname(url)
      if (path !== pathname.current) {
        set_pinned(false)
      }
      pathname.current = path
    }
    router.events.on('routeChangeComplete', on_route)
    return () => router.events.off('routeChangeComplete', on_route)
  }, [router.events])

  function pin_for_group_toggle() {
    if (mobile_viewport() && (pinned || mobile_menu_open())) set_pinned(true)
  }

  return { pinned, pin_for_group_toggle, clear: () => set_pinned(false) }
}


export function MobileDrawerBackdrop({ pinned, on_close }) {
  if (!pinned || typeof document === 'undefined') return null
  return createPortal(
    <div className="mobile-drawer-backdrop" aria-hidden="true" onClick={on_close} />,
    document.body,
  )
}
