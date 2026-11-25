import { useRouter } from 'next/router'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import siteMeta from '../public/site-meta.json'
import siteConfig from '../site.config'
import { single } from './useListingSearch'

const SiteSearchContext = createContext(null)
const feedPath = siteConfig.feed?.cards && siteConfig.feed.path

export function useSiteSearch() {
  return useContext(SiteSearchContext)
}

export function SiteSearchProvider({ children }) {
  const router = useRouter()
  const { pathname } = router
  const onHome = siteConfig.homepage_feed && pathname === '/'
  const onFeed = pathname === feedPath
  const searchPath = onHome || onFeed ? pathname : siteMeta.browse
  const onListing = pathname === searchPath
  const label = onHome ? 'Search pages' : onFeed ? 'Search feed' : 'Search site'
  const urlText = onListing ? single(router.query.q) : ''
  const [draft, setDraft] = useState(null)
  const navbarInput = useRef(null)
  const timer = useRef(null)
  const revision = useRef(0)
  const navigation = useRef(null)
  const submitSearch = useRef(null)
  const text = draft ?? urlText

  useEffect(() => {
    const pending = navigation.current
    navigation.current = null
    if (pending && pathname === pending.path && urlText === pending.text) return
    clearTimeout(timer.current)
    revision.current += 1
    setDraft(null)
  }, [router.asPath, pathname, urlText])

  useEffect(() => () => clearTimeout(timer.current), [])

  async function update(changes, { replace = false, source } = {}) {
    clearTimeout(timer.current)
    const current = ++revision.current
    const query = { ...(onListing ? router.query : {}), q: text, ...changes }
    if (!query.q?.trim()) delete query.q
    for (const key of Object.keys(query)) if (query[key] === '') delete query[key]
    if ('q' in changes) setDraft(query.q || '')
    const pending = { path: searchPath, text: query.q || '' }
    navigation.current = pending
    const moveFocus = !onListing && document.activeElement === source

    let navigated
    try {
      navigated = await router[replace && urlText ? 'replace' : 'push'](
        { pathname: searchPath, query, hash: onListing ? window.location.hash : '' },
        undefined,
        { shallow: onListing, scroll: !onListing },
      )
      if (navigated && moveFocus &&
          (document.activeElement === source || document.activeElement === document.body)) {
        navbarInput.current?.focus({ preventScroll: true })
      }
    } finally {
      if (!navigated && navigation.current === pending) navigation.current = null
      if (current === revision.current) setDraft(null)
    }
  }
  submitSearch.current = update

  function changeText(value, { composing, ...field } = {}) {
    clearTimeout(timer.current)
    revision.current += 1
    setDraft(value)
    if (composing || (!onListing && !value.trim())) return
    timer.current = setTimeout(() => {
      submitSearch.current({ q: value }, { replace: true, ...field })
    }, 250)
  }

  return <SiteSearchContext.Provider value={{
    basePath: router.basePath, query: router.query, searchPath, onListing, label, text, changeText, update, navbarInput,
  }}>
    {children}
  </SiteSearchContext.Provider>
}

export default function NavbarSearch({ className = '' }) {
  const { basePath, searchPath, onListing, label, text, changeText, update, navbarInput } = useSiteSearch()
  const inNavbar = !!className
  const menuInput = useRef(null)
  const input = inNavbar ? navbarInput : menuInput
  const composition = useRef(false)

  useEffect(() => {
    if (!inNavbar) return
    function shortcut(event) {
      const { key, ctrlKey, metaKey, altKey, target } = event
      const slash = key === '/' && !ctrlKey && !metaKey && !altKey
      const find = key.toLowerCase() === 'k' && (ctrlKey || metaKey)
      if (event.defaultPrevented || (!slash && !find) || target.isContentEditable ||
          target.closest?.('input, textarea, select, button')) return
      if (!input.current?.getClientRects().length) return
      event.preventDefault()
      input.current.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [inNavbar, input])

  if (onListing && !inNavbar) return null

  return <form role="search" className={`nextra-search ${className}${onListing ? ' navbar-search-on-results' : ''}`}
    action={basePath + (searchPath === '/' ? '/' : searchPath + '/')}
    onSubmit={event => {
      event.preventDefault()
      if (!composition.current) update({ q: text }, { replace: onListing && !!text, source: input.current })
    }}>
    <input ref={input} type="search" name="q" aria-label={label} placeholder={label}
      spellCheck={false} value={text}
      onCompositionStart={() => { composition.current = true }}
      onCompositionEnd={event => {
        composition.current = false
        changeText(event.currentTarget.value, { source: input.current })
      }}
      onChange={event => changeText(event.target.value, {
        source: input.current, composing: composition.current,
      })} />
  </form>
}
