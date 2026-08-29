/**
 * Left-nav index switcher and value lists.
 * Pages is the directory tree. Any other toggle replaces the tree with that group's
 * facet values. Nextra owns the tree; data-view hides it while an index is open.
 *
 * The portal mounts inside `.nextra-scrollbar` so the switcher and facet lists share
 * the tree's 1rem padding. Facet rows copy Nextra menu metrics (px-2 py-1.5, gap-1,
 * nested ml-3 with a left rule) so Versions/Tags line up with the directory tree.
 *
 * State: ?view=<pages|group> ?facet=<name> ?on=<value>
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { facet_config } from './facets'
import {
  active_facet, active_view, index_entries, selected_value, sidebar_groups,
} from './filters'


const SIDEBAR = '.nextra-sidebar-container'


function use_portal_host(enabled) {
  const [host, set_host] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const container = document.querySelector(SIDEBAR)
    if (!container) return
    const parent = container.querySelector('.nextra-scrollbar') || container

    const node = document.createElement('div')
    node.className = 'sidebar-views'
    parent.prepend(node)
    set_host(node)

    return () => {
      node.remove()
      delete container.dataset.view
    }
  }, [enabled])

  return host
}


function group_entries(entries) {
  const groups = []
  for (const entry of entries) {
    const key = entry.group || ''
    const last = groups[groups.length - 1]
    if (!last || last.group !== key) groups.push({ group: key, items: [entry] })
    else last.items.push(entry)
  }
  return groups
}


function ValueButton({ entry, selected, on_select, facet }) {
  const active = entry.value === selected
  return (
    <button
      type="button"
      className={`chip chip-${facet}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={() => on_select(facet, entry.value)}
    >
      {entry.label}
    </button>
  )
}


function ChipRow({ items, facet, selected, on_select }) {
  return (
    <div className="index-chips">
      {items.map(entry => (
        <ValueButton
          key={entry.value}
          entry={entry}
          selected={selected}
          on_select={on_select}
          facet={facet}
        />
      ))}
    </div>
  )
}


function FacetList({ facet, selected_facet, selected_value, on_select }) {
  const groups = group_entries(index_entries(facet))
  if (!groups.length) return null
  const active = facet === selected_facet ? selected_value : ''

  return (
    <li className="index-facet-block">
      {groups.map(({ group, items }) => {
        const chips = (
          <ChipRow
            items={items}
            facet={facet}
            selected={active}
            on_select={on_select}
          />
        )
        if (!group) {
          return <div key={items.map(e => e.value).join('-')}>{chips}</div>
        }
        return (
          <div key={group}>
            <div className="index-folder">{group}</div>
            <div className="index-nested">{chips}</div>
          </div>
        )
      })}
    </li>
  )
}


function IndexList({ group, selected_facet, selected, on_select }) {
  const facets = group.facets.filter(name => index_entries(name).length)
  if (!facets.length) return <p className="sidebar-empty">No values for this index.</p>

  return (
    <ul className="index-tree">
      {facets.map(facet => (
        <FacetList
          key={facet}
          facet={facet}
          selected_facet={selected_facet}
          selected_value={selected}
          on_select={on_select}
        />
      ))}
    </ul>
  )
}


function Toggles({ current, on_select }) {
  const groups = sidebar_groups()
  return (
    <div className="sidebar-index-toggles" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={current === 'pages'}
        className={current === 'pages' ? 'sidebar-toggle is-active' : 'sidebar-toggle'}
        onClick={() => on_select('pages')}
      >
        Pages
      </button>
      {groups.map(group => (
        <button
          key={group.id}
          type="button"
          role="tab"
          aria-selected={current === group.id}
          className={current === group.id ? 'sidebar-toggle is-active' : 'sidebar-toggle'}
          onClick={() => on_select(group.id)}
        >
          {group.label}
        </button>
      ))}
    </div>
  )
}


export default function SidebarViews() {
  const router = useRouter()
  const groups = sidebar_groups()
  const host = use_portal_host(groups.length > 0)

  const view = active_view(router.query)
  const group = view === 'pages' ? null : groups.find(g => g.id === view)
  const facet = group ? active_facet(router.query, view) : ''
  const selected = group ? selected_value(router.query, view) : ''

  useEffect(() => {
    if (!groups.length) return
    const container = document.querySelector(SIDEBAR)
    if (container) container.dataset.view = view
    document.documentElement.dataset.view = view
    return () => { delete document.documentElement.dataset.view }
  }, [view, groups.length])

  function set_view(next) {
    const query = { ...router.query }
    delete query.view
    delete query.facet
    delete query.on
    if (next !== 'pages') {
      const group = groups.find(g => g.id === next)
      if (!group) return
      query.view = next
      const facet = group.facets[0]
      const spec = facet_config(facet) || {}
      const value = selected_value({}, next)
      if (value && value !== spec.default) query.on = value
    }
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  function set_on(facet, value) {
    const query = { ...router.query, view }
    if (facet !== group.facets[0]) query.facet = facet
    else delete query.facet
    const spec = facet_config(facet) || {}
    if (value && value !== (spec.default || 'latest')) query.on = value
    else delete query.on
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  if (!host || !groups.length) return null

  return createPortal(
    <>
      <Toggles current={view} on_select={set_view} />
      {group && (
        <IndexList
          group={group}
          selected_facet={facet}
          selected={selected}
          on_select={set_on}
        />
      )}
    </>,
    host
  )
}
