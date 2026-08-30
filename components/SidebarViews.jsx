/**
 * Left-nav index switcher and value lists.
 * Pages is the directory tree. Each configured facet (and optional versioning) is a
 * sidebar group; field keys within a group render as chips in declaration order.
 *
 * State: ?view=<pages|group> ?field=<frontmatter-key> ?on=<value>
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'
import { field_label } from './groups'
import {
  active_field, active_view, index_entries, selected_value, sidebar_groups, sidebar_toggles,
} from './filters'


const SIDEBAR = '.nextra-sidebar-container'

const MENU_LIST = 'nx-flex nx-flex-col nx-gap-1'
const MENU_BORDER = [
  "nx-relative before:nx-absolute before:nx-inset-y-1 before:nx-w-px",
  "before:nx-bg-gray-200 before:nx-content-[''] dark:before:nx-bg-neutral-800",
  'ltr:nx-pl-3 ltr:before:nx-left-0 rtl:nx-pr-3 rtl:before:nx-right-0',
].join(' ')
const GROUP_LABEL = [
  'nx-px-2 nx-py-1.5 nx-text-sm nx-font-medium nx-capitalize',
  'nx-text-gray-500 dark:nx-text-neutral-400',
].join(' ')
const CHIP_ROW = 'nx-flex nx-flex-wrap nx-gap-1 nx-px-2 nx-pb-1'


function use_portal_host(enabled) {
  const [host, set_host] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const container = document.querySelector(SIDEBAR)
    if (!container) return
    const parent = container.querySelector('.nextra-scrollbar') || container

    const node = document.createElement('div')
    node.className = 'sidebar-views nx-flex nx-w-full nx-flex-col nx-gap-1'
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


function ValueButton({ entry, selected, on_select, field_key }) {
  const active = entry.value === selected
  return (
    <button
      type="button"
      className={`chip chip-${field_key}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={() => on_select(field_key, entry.value)}
    >
      {entry.label}
    </button>
  )
}


function ChipRow({ items, field_key, selected, on_select }) {
  return (
    <div className={CHIP_ROW}>
      {items.map(entry => (
        <ValueButton
          key={entry.value}
          entry={entry}
          selected={selected}
          on_select={on_select}
          field_key={field_key}
        />
      ))}
    </div>
  )
}


function FieldList({ group_id, field_key, selected_field, selected_value, on_select, show_label }) {
  const groups = group_entries(index_entries(group_id, field_key))
  if (!groups.length) return null
  const active = field_key === selected_field ? selected_value : ''

  return (
    <li>
      {show_label ? <div className={GROUP_LABEL}>{field_label(field_key)}</div> : null}
      {groups.map(({ group, items }) => {
        const chips = (
          <ChipRow
            items={items}
            field_key={field_key}
            selected={active}
            on_select={on_select}
          />
        )
        if (!group) {
          return <div key={items.map(e => e.value).join('-')}>{chips}</div>
        }
        return (
          <div key={group}>
            <div className={GROUP_LABEL}>{group}</div>
            <div className="ltr:nx-pr-0 rtl:nx-pl-0 nx-pt-1">
              <ul className={`${MENU_LIST} ${MENU_BORDER} ltr:nx-ml-3 rtl:nx-mr-3`}>
                <li>{chips}</li>
              </ul>
            </div>
          </div>
        )
      })}
    </li>
  )
}


function IndexList({ group, selected_field, selected, on_select }) {
  const fields = group.fields.filter(key => index_entries(group.id, key).length)
  if (!fields.length) {
    return <p className="sidebar-empty nx-px-2 nx-text-sm nx-text-gray-500 dark:nx-text-neutral-400">No values for this index.</p>
  }

  const show_labels = fields.length > 1

  return (
    <ul className={MENU_LIST}>
      {fields.map(field_key => (
        <FieldList
          key={field_key}
          group_id={group.id}
          field_key={field_key}
          selected_field={selected_field}
          selected_value={selected}
          on_select={on_select}
          show_label={show_labels}
        />
      ))}
    </ul>
  )
}


function Toggles({ current, on_select }) {
  const toggles = sidebar_toggles()
  return (
    <div className="sidebar-index-toggles nx-mb-2 nx-flex nx-flex-wrap nx-gap-1" role="tablist">
      {toggles.map(toggle => (
        <button
          key={toggle.id}
          type="button"
          role="tab"
          aria-selected={current === toggle.id}
          className={current === toggle.id ? 'sidebar-toggle is-active' : 'sidebar-toggle'}
          onClick={() => on_select(toggle.id)}
        >
          {toggle.label}
        </button>
      ))}
    </div>
  )
}


export default function SidebarViews() {
  const router = useRouter()
  const toggles = sidebar_toggles()
  const groups = sidebar_groups()
  const host = use_portal_host(toggles.length > 1)

  const view = active_view(router.query)
  const group = view === 'pages' ? null : groups.find(g => g.id === view)
  const field = group ? active_field(router.query, view) : ''
  const selected = group ? selected_value(router.query, view) : ''

  useEffect(() => {
    if (toggles.length <= 1) return
    const container = document.querySelector(SIDEBAR)
    if (container) container.dataset.view = view
    document.documentElement.dataset.view = view
    return () => { delete document.documentElement.dataset.view }
  }, [view, toggles.length])

  function set_view(next) {
    const query = { ...router.query }
    delete query.view
    delete query.field
    delete query.on
    if (next !== 'pages') {
      const group = groups.find(g => g.id === next)
      if (!group) return
      query.view = next
      const value = selected_value({}, next)
      const versioning = siteConfig.versioning
      const default_on = group.versioning && versioning ? versioning.default : ''
      if (value && value !== default_on) query.on = value
    }
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  function set_on(field_key, value) {
    const query = { ...router.query, view }
    if (field_key !== group.fields[0]) query.field = field_key
    else delete query.field
    const versioning = siteConfig.versioning
    const default_on = group.versioning && versioning ? versioning.default : ''
    if (value && value !== default_on) query.on = value
    else delete query.on
    router.replace({ query }, undefined, { shallow: true, scroll: false })
  }

  if (!host || toggles.length <= 1) return null

  return createPortal(
    <>
      <Toggles current={view} on_select={set_view} />
      {group && (
        <IndexList
          group={group}
          selected_field={field}
          selected={selected}
          on_select={set_on}
        />
      )}
    </>,
    host
  )
}
