/** Article metadata from site-meta.json and heading IDs from the compiled MDX page. */
import { createContext, useContext, useMemo } from 'react'
import { useRouter } from 'next/router'
import siteMeta from '../public/site-meta.json'


function strip_trailing_slash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

const PAGE_INDEX = Object.fromEntries(
  (siteMeta.pages || []).map(p => [strip_trailing_slash(p.url), p])
)


export function find_page(url) {
  /** Page node for a given url, or undefined. Ignores #fragment and trailing slash. */
  const base = url.split('#')[0]
  return base ? PAGE_INDEX[strip_trailing_slash(base)] : undefined
}


const SectionContext = createContext(null)


export function SectionProvider({ headings, children }) {
  const { route } = useRouter()
  const page = PAGE_INDEX[strip_trailing_slash(route)] || PAGE_INDEX[route] || null
  const sections = useMemo(() => headings
    .filter(heading => heading.depth === 2 || heading.depth === 3)
    .map(({ id, value, depth }) => ({ id, name: value, level: depth })), [headings])
  const value = useMemo(() => ({ page, sections }), [page, sections])
  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
}


export function useSection() {
  return useContext(SectionContext) || { page: null, sections: [] }
}
