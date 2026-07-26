/**
 * Shares the current page's node and its flattened section list with PageInfo,
 * MetaSidebar, and TocMenu. Provided once in _app.jsx so it spans Nextra's separate
 * content and TOC-column subtrees. Section data comes from the site graph
 * (public/site-meta.json), not from in-page markers.
 */
import { createContext, useContext, useMemo } from 'react'
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
  /** Depth-first list of a page's sections in document order (from the site graph). */
  const out = []
  for (const child of (page && page.children) || []) {
    out.push(child)
    out.push(...flatten_sections(child))
  }
  return out
}


const SectionContext = createContext(null)


export function SectionProvider({ children }) {
  const { route } = useRouter()
  const page = PAGE_INDEX[route] || null
  const sections = useMemo(() => flatten_sections(page), [page])
  const value = useMemo(() => ({ page, sections }), [page, sections])
  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
}


export function useSection() {
  return useContext(SectionContext) || { page: null, sections: [] }
}
