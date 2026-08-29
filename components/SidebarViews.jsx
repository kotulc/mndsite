/**
 * Left-tree view tabs and facet views.
 * Nextra owns the sidebar body and exposes no slot for extra content, so the strip is
 * portalled into `.nextra-sidebar-container` and a facet view replaces the tree with its
 * own grouped list — the container's `data-view` attribute is what hides Nextra's tree.
 *
 * Driven by sidebar.views and collections; state lives in the ?view / ?c query params.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'
import { facet_config } from './facets'
import {
  active_collection, active_view, collection_names, grouped_pages, resolve_filter,
} from './filters'


const VIEWS = (siteConfig.sidebar || {}).views || ['tree']
const SIDEBAR = '.nextra-sidebar-container'


function view_label(view) {
  return view === 'tree' ? 'Tree' : (facet_config(view) || {}).label || view
}


function use_portal_host() {
  /** A mount point prepended to Nextra's sidebar, cleaned up with the component. */
  const [host, set_host] = useState(null)

  useEffect(() => {
    const container = document.querySelector(SIDEBAR)
    if (!container) return

    const node = document.createElement('div')
    node.className = 'sidebar-views'
    container.prepend(node)
    set_host(node)

    return () => {
      node.remove()
      delete container.dataset.view
    }
  }, [])

  return host
}


function FacetView({ facet, filter, route }) {
  /** The tree replaced by pages bucketed under one facet's values. */
  const groups = grouped_pages(facet, filter)
  if (!groups.length) return <p className="sidebar-empty">No pages match this filter.</p>

  const here = route.replace(/\/+$/, '')

  return (
    <ul className="facet-view">
      {groups.map(group => (
        <li key={group.value}>
          <span className={`facet-group chip chip-${facet}`}>{group.value}</span>
          <ul>
            {group.pages.map(page => (
              <li key={page.url}>
                <Link
                  href={page.url}
                  className={page.url.replace(/\/+$/, '') === here ? 'active' : undefined}
                >
                  {page.name}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}


function Tabs({ current, on_select }) {
  return (
    <div className="sidebar-tabs" role="tablist">
      {VIEWS.map(view => (
        <button
          key={view}
          role="tab"
          aria-selected={view === current}
          className={view === current ? 'sidebar-tab active' : 'sidebar-tab'}
          onClick={() => on_select(view)}
        >
          {view_label(view)}
        </button>
      ))}
    </div>
  )
}


function Collections({ current, on_select }) {
  const names = collection_names()
  if (!names.length) return null

  return (
    <label className="sidebar-collection">
      <span className="nx-sr-only">Collection</span>
      <select value={current} onChange={event => on_select(event.target.value)}>
        {names.map(name => <option key={name} value={name}>{name}</option>)}
        <option value="all">all</option>
      </select>
    </label>
  )
}


export default function SidebarViews() {
  const router = useRouter()
  const host = use_portal_host()

  const view = active_view(router.query)
  const collection = active_collection(router.query)
  const filter = resolve_filter(router.query)

  // The tree is Nextra's; a facet view is ours. CSS swaps them on this attribute.
  useEffect(() => {
    const container = document.querySelector(SIDEBAR)
    if (container) container.dataset.view = view
  }, [view])

  function set_param(key, value, fallback) {
    /** The default selection stays out of the URL, so a plain link is the default view. */
    const query = { ...router.query }
    if (value && value !== fallback) query[key] = value
    else delete query[key]
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  if (!host || (VIEWS.length < 2 && !collection_names().length)) return null
  const default_collection = (siteConfig.collections || {}).default || 'all'

  return createPortal(
    <>
      {VIEWS.length > 1 && <Tabs current={view} on_select={v => set_param('view', v, VIEWS[0])} />}
      <Collections current={collection} on_select={c => set_param('c', c, default_collection)} />
      {view !== 'tree' && <FacetView facet={view} filter={filter} route={router.pathname} />}
    </>,
    host
  )
}
