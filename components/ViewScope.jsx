/**
 * Shared sidebar view state (?view= / ?field= / ?on=) for the page rail toggles and the
 * facet index portaled into Nextra's left nav.
 */
import { createContext, useContext, useEffect } from 'react'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'
import { active_field, active_view, selected_value, sidebar_groups, sidebar_toggles } from './filters'
import { MobileDrawerBackdrop, useMobileDrawer } from './MobileDrawer'


const ViewScopeContext = createContext(null)
const SIDEBAR = '.nextra-sidebar-container'


function use_view_scope_state(drawer) {
  const router = useRouter()
  const toggles = sidebar_toggles()
  const groups = sidebar_groups()
  const view = active_view(router.query)
  const group = view === 'pages' ? null : groups.find(g => g.id === view) ?? null
  const field = group ? active_field(router.query, view) : ''
  const selected = group ? selected_value(router.query, view) : ''

  useEffect(() => {
    if (toggles.length <= 1) return
    document.documentElement.dataset.view = view
    const container = document.querySelector(SIDEBAR)
    if (container) container.dataset.view = view
    return () => {
      delete document.documentElement.dataset.view
      const node = document.querySelector(SIDEBAR)
      if (node) delete node.dataset.view
    }
  }, [view, toggles.length])

  function set_view(next) {
    drawer.pin_for_group_toggle()
    const query = { ...router.query }
    delete query.view
    delete query.field
    delete query.on
    if (next !== 'pages') {
      const target = groups.find(g => g.id === next)
      if (!target) return
      query.view = next
      const value = selected_value({}, next)
      const versioning = siteConfig.versioning
      const default_on = target.versioning && versioning ? versioning.default : ''
      if (value && value !== default_on) query.on = value
    }
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  function set_on(field_key, value) {
    if (!group) return
    drawer.clear()
    const query = { ...router.query, view }
    if (field_key !== group.fields[0]) query.field = field_key
    else delete query.field
    const versioning = siteConfig.versioning
    const default_on = group.versioning && versioning ? versioning.default : ''
    if (value && value !== default_on) query.on = value
    else delete query.on
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  return { view, toggles, groups, group, field, selected, set_view, set_on }
}


export function ViewScopeProvider({ children }) {
  const drawer = useMobileDrawer()
  const value = use_view_scope_state(drawer)
  return (
    <ViewScopeContext.Provider value={value}>
      <MobileDrawerBackdrop pinned={drawer.pinned} on_close={drawer.clear} />
      {children}
    </ViewScopeContext.Provider>
  )
}


export function useViewScope() {
  return useContext(ViewScopeContext) || {
    view: 'pages',
    toggles: [],
    groups: [],
    group: null,
    field: '',
    selected: '',
    set_view() {},
    set_on() {},
  }
}


export function ViewToggles() {
  const { view, toggles, set_view } = useViewScope()
  if (toggles.length <= 1) return null

  return (
    <div className="view-toggles" role="tablist" aria-label="Browse views">
      {toggles.map(toggle => (
        <button
          key={toggle.id}
          type="button"
          role="tab"
          aria-selected={view === toggle.id}
          className={view === toggle.id ? 'sidebar-toggle is-active' : 'sidebar-toggle'}
          onClick={() => set_view(toggle.id)}
        >
          {toggle.label}
        </button>
      ))}
    </div>
  )
}
