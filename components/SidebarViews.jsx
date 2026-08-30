/**
 * Left-nav chrome: view chips above the sidebar tree, then facet value lists when a
 * group index is open. Portaled into Nextra's sidebar container (flex order) so chips
 * stay above nav content on desktop and inside the mobile sidebar menu.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { field_label } from './groups'
import { index_entries } from './filters'
import { ViewToggles, useViewScope } from './ViewScope'


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


function tag_mobile_search(container) {
  if (!container) return () => {}
  const search = [...container.children].find(el => (
    !el.classList.contains('sidebar-views')
    && !el.classList.contains('nextra-scrollbar')
    && !el.classList.contains('sidebar-search')
    && [...el.classList].some(c => c === 'md:nx-hidden' || c.includes('nx-pt-4'))
  ))
  if (!search) return () => {}
  search.classList.add('sidebar-search')
  return () => search.classList.remove('sidebar-search')
}


function use_sidebar_search_tag() {
  useEffect(() => {
    let observer
    let release_search = () => {}

    function attach() {
      const container = document.querySelector(SIDEBAR)
      if (!container) return
      release_search()
      release_search = tag_mobile_search(container)
    }

    attach()
    if (!document.querySelector(SIDEBAR)) {
      observer = new MutationObserver(attach)
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      release_search()
    }
  }, [])
}


function use_sidebar_portal_target(enabled) {
  const [target, set_target] = useState(null)

  useEffect(() => {
    if (!enabled) {
      set_target(null)
      return
    }

    let observer

    function attach() {
      const container = document.querySelector(SIDEBAR)
      if (container) set_target(container)
    }

    attach()
    if (!document.querySelector(SIDEBAR)) {
      observer = new MutationObserver(attach)
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      set_target(null)
    }
  }, [enabled])

  return target
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


function FieldList({ group_id, field_key, selected_field, selected_value, on_select }) {
  const groups = group_entries(index_entries(group_id, field_key))
  if (!groups.length) return null
  const active = field_key === selected_field ? selected_value : ''

  return (
    <li>
      <div className={GROUP_LABEL}>{field_label(field_key)}</div>
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

  return (
    <div className="sidebar-index">
      <ul className={MENU_LIST}>
        {fields.map(field_key => (
          <FieldList
            key={field_key}
            group_id={group.id}
            field_key={field_key}
            selected_field={selected_field}
            selected_value={selected}
            on_select={on_select}
          />
        ))}
      </ul>
    </div>
  )
}


export default function SidebarViews() {
  const { toggles, group, field, selected, set_on } = useViewScope()
  use_sidebar_search_tag()
  const show_toggles = toggles.length > 1
  const target = use_sidebar_portal_target(show_toggles || !!group)

  if (!target) return null

  return createPortal(
    <div className="sidebar-views nx-flex nx-w-full nx-flex-col">
      {show_toggles ? <ViewToggles /> : null}
      {group ? (
        <IndexList
          group={group}
          selected_field={field}
          selected={selected}
          on_select={set_on}
        />
      ) : null}
    </div>,
    target,
  )
}
