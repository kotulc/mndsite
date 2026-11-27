import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConfig } from 'nextra-theme-docs'
import { useSection } from './SectionContext'

export function useReadingSectionHighlight(id) {
  useEffect(() => {
    const sidebar = document.querySelector('.nextra-sidebar-container')
    if (!sidebar || !id) return
    const href = `#${encodeURIComponent(id)}`
    const marked = new Set()

    function markSection() {
      for (const link of sidebar.querySelectorAll(
        '.reading-sidebar-sections a[href^="#"], .nextra-menu-mobile li.active > ul a[href^="#"]',
      )) {
        if (link.hash !== href) continue
        link.setAttribute('aria-current', 'location')
        marked.add(link)
      }
    }

    // The desktop portal and Nextra's mobile tree can mount after the article.
    const observer = new MutationObserver(markSection)
    observer.observe(sidebar, { childList: true, subtree: true })
    markSection()
    return () => {
      observer.disconnect()
      for (const link of marked) link.removeAttribute('aria-current')
    }
  }, [id])
}

function SectionLinks({ title, sections }) {
  const label = useRef(null)
  const [list, setList] = useState(null)

  useEffect(() => {
    // Nextra renders the title slot inside the page link. Mount the list beside it.
    const row = label.current.closest('li')
    if (!row?.closest('.nextra-menu-desktop')) return
    const element = document.createElement('ul')
    element.className = 'reading-sidebar-sections'
    element.setAttribute('aria-label', 'Sections')
    row.append(element)
    setList(element)
    return () => element.remove()
  }, [])

  return <>
    <span ref={label}>{title}</span>
    {list && createPortal(sections.map(({ id, name }) => <li key={id}>
      <a href={`#${encodeURIComponent(id)}`} onClick={event => event.stopPropagation()}>{name}</a>
    </li>), list)}
  </>
}

export default function SidebarTitle({ title, route }) {
  const { frontMatter } = useConfig()
  const { page, sections } = useSection()
  if (!frontMatter?.reading_cards || route !== page?.url) return title
  const cards = sections.filter(section => section.level === 2)
  return cards.length ? <SectionLinks key={route} title={title} sections={cards} /> : title
}
