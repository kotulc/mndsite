/**
 * Shares the current page's metadata and flattened section list with PageInfo,
 * MetaSidebar, and TocMenu. Provided once in _app.jsx. Data comes from the flat
 * public/site-meta.json pages list.
 */
import { createContext, useContext, useMemo } from 'react'
import { useRouter } from 'next/router'
import siteMeta from '../public/site-meta.json'


function strip_trailing_slash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

const PAGE_INDEX = Object.fromEntries(
  (siteMeta.pages || []).map(p => [strip_trailing_slash(p.url), p])
)


export function section_anchor(name) {
  /** Fragment id matching Nextra's heading anchors (GitHub-style slug of the section name). */
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}


export function find_page(url) {
  /** Page node for a given url, or undefined. Ignores #fragment and trailing slash. */
  const base = url.split('#')[0]
  return base ? PAGE_INDEX[strip_trailing_slash(base)] : undefined
}


export function flatten_sections(page) {
  /** Depth-first list of a page's sections in document order. */
  const out = []
  function walk(nodes) {
    for (const child of nodes || []) {
      out.push(child)
      walk(child.sections)
    }
  }
  walk(page && page.sections)
  return out
}


const SectionContext = createContext(null)


export function SectionProvider({ children }) {
  const { route } = useRouter()
  const page = PAGE_INDEX[strip_trailing_slash(route)] || PAGE_INDEX[route] || null
  const sections = useMemo(() => flatten_sections(page), [page])
  const value = useMemo(() => ({ page, sections }), [page, sections])
  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
}


export function useSection() {
  return useContext(SectionContext) || { page: null, sections: [] }
}
