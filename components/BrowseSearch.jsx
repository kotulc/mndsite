import { useRouter } from 'next/router'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import siteMeta from '../public/site-meta.json'
import { single } from './useListingSearch'

const BrowseSearchContext = createContext(null)

export function useBrowseSearch() {
  return useContext(BrowseSearchContext)
}

export function BrowseSearchProvider({ children }) {
  const router = useRouter()
  const onBrowse = router.pathname === siteMeta.browse
  const urlText = onBrowse ? single(router.query.q) : ''
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
    if (pending && onBrowse && urlText === pending.text) return
    clearTimeout(timer.current)
    revision.current += 1
    setDraft(null)
  }, [router.asPath, onBrowse, urlText])

  useEffect(() => () => clearTimeout(timer.current), [])

  async function update(changes, { replace = false, source } = {}) {
    clearTimeout(timer.current)
    const current = ++revision.current
    const query = { ...(onBrowse ? router.query : {}), q: text, ...changes }
    if (!query.q?.trim()) delete query.q
    for (const key of ['facet', 'tag']) if (query[key] === '') delete query[key]
    if ('q' in changes) setDraft(query.q || '')
    const pending = { text: query.q || '' }
    navigation.current = pending
    const moveFocus = !onBrowse && document.activeElement === source

    let navigated
    try {
      navigated = await router[replace && urlText ? 'replace' : 'push'](
        { pathname: siteMeta.browse, query, hash: onBrowse ? window.location.hash : '' },
        undefined,
        { shallow: onBrowse, scroll: !onBrowse },
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
    if (composing || (!onBrowse && !value.trim())) return
    timer.current = setTimeout(() => {
      submitSearch.current({ q: value }, { replace: true, ...field })
    }, 250)
  }

  return <BrowseSearchContext.Provider value={{
    basePath: router.basePath, query: router.query, onBrowse, text, changeText, update, navbarInput,
  }}>
    {children}
  </BrowseSearchContext.Provider>
}

export default function NavbarSearch({ className = '' }) {
  const { basePath, onBrowse, text, changeText, update, navbarInput } = useBrowseSearch()
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

  if (onBrowse && !inNavbar) return null

  return <form role="search" className={`nextra-search ${className}${onBrowse ? ' navbar-search-on-results' : ''}`}
    action={`${basePath}${siteMeta.browse}/`}
    onSubmit={event => {
      event.preventDefault()
      if (!composition.current) update({ q: text }, { replace: onBrowse && !!text, source: input.current })
    }}>
    <input ref={input} type="search" name="q" aria-label="Search site" placeholder="Search site"
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
