/**
 * Facet index body for the left nav. View toggles live in the page rail above the layout;
 * this component only portals value chips into Nextra's sidebar while a group index is open.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { field_label } from './groups'
import { index_entries } from './filters'
import { useViewScope } from './ViewScope'


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
    node.className = 'sidebar-index nx-flex nx-w-full nx-flex-col'
    parent.prepend(node)
    set_host(node)

    return () => node.remove()
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


export default function SidebarViews() {
  const { toggles, group, field, selected, set_on } = useViewScope()
  const host = use_portal_host(toggles.length > 1 && !!group)

  if (!host || !group) return null

  return createPortal(
    <IndexList
      group={group}
      selected_field={field}
      selected={selected}
      on_select={set_on}
    />,
    host,
  )
}
