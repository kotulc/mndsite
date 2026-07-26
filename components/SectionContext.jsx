/**
 * Shares the current page's node and scroll-active section index between the invisible
 * SectionMarker markers (injected by ingest.js after each heading) and the MetaSidebar
 * ToC panel. Provided once in _app.jsx so it spans Nextra's separate content and
 * TOC-column subtrees.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import siteMeta from '../public/site-meta.json'


function strip_trailing_slash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function index_pages(node, acc = {}) {
  if (node.type === 'page' || node.type === 'folder') acc[strip_trailing_slash(node.url)] = node
  for (const child of node.children || []) index_pages(child, acc)
  return acc
}
const PAGE_INDEX = index_pages(siteMeta)


export function find_page(url) {
  /** Page (or folder) node for a given url, or undefined (e.g. an external link, or a
   *  bare same-page #fragment with no path of its own). Ignores any #fragment suffix
   *  and trailing slash so it matches regardless of how the link was written. */
  const base = url.split('#')[0]
  return base ? PAGE_INDEX[strip_trailing_slash(base)] : undefined
}


export function flatten_sections(page) {
  /** Depth-first list of a page's sections in document order — matches the `i` index
   *  ingest.js bakes into each <SectionMarker i={N}/>. */
  const out = []
  for (const child of (page && page.children) || []) {
    out.push(child)
    out.push(...flatten_sections(child))
  }
  return out
}


const SectionContext = createContext(null)


function at_page_bottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
}

export function SectionProvider({ children }) {
  const { route } = useRouter()
  const page = PAGE_INDEX[route] || null
  const sections = useMemo(() => flatten_sections(page), [page])
  const [active, set_active] = useState(-1)

  // Reset synchronously (not via effect) so a render never pairs a stale `active` index
  // from the previous page with the new page's (possibly shorter) `sections` array.
  const [tracked_page, set_tracked_page] = useState(page)
  if (page !== tracked_page) {
    set_tracked_page(page)
    set_active(-1)
  }

  useEffect(() => {
    // The last section's own marker often can't cross the near-top trigger band used
    // for scrollspy — there may not be enough trailing content to scroll it that far.
    // Force it active once the user has scrolled as far as the page allows.
    if (!sections.length) return
    function on_scroll() {
      if (at_page_bottom()) set_active(sections.length - 1)
    }
    window.addEventListener('scroll', on_scroll, { passive: true })
    on_scroll()
    return () => window.removeEventListener('scroll', on_scroll)
  }, [sections])

  const value = useMemo(() => ({ page, sections, active, set_active }), [page, sections, active])
  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
}


export function useSection() {
  return useContext(SectionContext) || { page: null, sections: [], active: -1, set_active: () => {} }
}
