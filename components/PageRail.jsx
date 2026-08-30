/**
 * Page rail above the sidebar and body. View toggles port into a band above the layout;
 * breadcrumbs and Contents stay inside the article so they share its content inset.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { ViewToggles, useViewScope } from './ViewScope'


const RailHostContext = createContext(null)
const SIDEBAR = '.nextra-sidebar-container'


function use_rail_host() {
  const [host, set_host] = useState(null)

  useEffect(() => {
    const sidebar = document.querySelector(SIDEBAR)
    const row = sidebar?.parentElement
    const container = row?.parentElement
    if (!row || !container) return

    const node = document.createElement('div')
    node.className = 'page-rail-host'
    container.insertBefore(node, row)
    set_host(node)

    return () => node.remove()
  }, [])

  return host
}


function sync_trail_row(host, trail) {
  if (!host || !trail) return

  const band = host.querySelector('.page-rail-band')
  if (!band) {
    trail.style.removeProperty('margin-top')
    return
  }

  trail.style.marginTop = '0'
  const band_rect = band.getBoundingClientRect()
  const trail_rect = trail.getBoundingClientRect()
  const shift = (band_rect.top + band_rect.height / 2) - (trail_rect.top + trail_rect.height / 2)
  trail.style.marginTop = `${shift}px`
}


function use_trail_row_sync(host, trail_ref) {
  const { asPath } = useRouter()

  useLayoutEffect(() => {
    const trail = trail_ref.current
    if (!host || !trail) return

    function sync() {
      sync_trail_row(host, trail_ref.current)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(host)
    ro.observe(trail)
    window.addEventListener('resize', sync)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
      trail.style.removeProperty('margin-top')
    }
  }, [host, asPath, trail_ref])
}


function TogglesBand() {
  const { toggles } = useViewScope()
  if (toggles.length <= 1) return null

  return (
    <div className="page-rail-band">
      <div className="page-rail-sidebar">
        <ViewToggles />
      </div>
      <div className="page-rail-body" aria-hidden="true" />
      <div className="page-rail-toc" aria-hidden="true" />
    </div>
  )
}


export function PageRailProvider({ children }) {
  const host = use_rail_host()

  return (
    <RailHostContext.Provider value={host}>
      {children}
    </RailHostContext.Provider>
  )
}


function PageRailTrail({ trail, actions, host }) {
  const trail_ref = useRef(null)
  const has_trail = !!trail
  const has_actions = !!actions
  use_trail_row_sync(host, trail_ref)

  if (!has_trail && !has_actions) return null

  return (
    <div className="page-rail-trail" ref={trail_ref}>
      {trail}
      {has_actions ? <div className="page-rail-actions">{actions}</div> : null}
    </div>
  )
}


export default function PageRail({ trail, actions }) {
  const host = useContext(RailHostContext)

  if (!host) {
    return (
      <>
        <TogglesBand />
        <PageRailTrail trail={trail} actions={actions} host={null} />
      </>
    )
  }

  return (
    <>
      {createPortal(<TogglesBand />, host)}
      <PageRailTrail trail={trail} actions={actions} host={host} />
    </>
  )
}
