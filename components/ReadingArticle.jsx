import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useReadingSectionHighlight } from './ReadingSections'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function fragmentId(hash) {
  try { return decodeURIComponent(hash.slice(1)) }
  catch { return '' }
}

export default function ReadingArticle({ children, summaries }) {
  const cards = Children.toArray(children).filter(child => child.props?.['data-reading-id']).map(content => ({
    id: content.props['data-reading-id'],
    title: content.props['data-reading-title'],
    content,
  }))
  const article = useRef(null)
  const toolbar = useRef(null)
  const pendingScroll = useRef(null)
  const lastHash = useRef(null)
  const navigationTimer = useRef(null)
  const first = cards[0]?.id
  const [current, setCurrent] = useState(first)
  const [open, setOpen] = useState(null)
  const [animatedCard, setAnimatedCard] = useState(null)
  const allOpen = open?.length === cards.length
  const currentIndex = Math.max(0, cards.findIndex(card => card.id === current))
  useReadingSectionHighlight(open, current)

  const finishNavigation = useCallback(() => {
    clearTimeout(navigationTimer.current)
    if (article.current) delete article.current.dataset.scrolling
  }, [])

  const startNavigation = useCallback(() => {
    finishNavigation()
    article.current.dataset.scrolling = ''
    navigationTimer.current = setTimeout(finishNavigation, 700)
  }, [finishNavigation])

  useBrowserLayoutEffect(() => {
    const pending = pendingScroll.current
    if (!pending || !open) return
    pendingScroll.current = null
    const { anchor, top, focus } = pending
    if (focus) {
      // Wait for the accordion layout and the mobile navigation to finish updating.
      const frame = requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        startNavigation()
        anchor.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' })
      })
      return () => cancelAnimationFrame(frame)
    } else if (top === undefined) {
      anchor.scrollIntoView({ block: 'start', behavior: 'instant' })
    } else {
      const delta = anchor.getBoundingClientRect().top - top
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' })
    }
  }, [open, startNavigation])

  useBrowserLayoutEffect(() => {
    if (!first) return
    const root = article.current

    function sectionFor(hash) {
      const target = document.getElementById(fragmentId(hash))
      const card = target?.closest('[data-reading-card]')
      if (!card || !root.contains(card)) return null
      const summary = card.querySelector('summary')
      return { id: card.dataset.readingCard, target, summary }
    }

    function reveal(section) {
      setAnimatedCard(null)
      setCurrent(section.id)
      setOpen([section.id])
    }

    function syncFragment() {
      const { hash } = window.location
      if (hash === lastHash.current) return
      lastHash.current = hash
      const section = sectionFor(hash)
      if (section) {
        pendingScroll.current = { anchor: section.target }
        reveal(section)
      } else if (!hash) {
        setAnimatedCard(null)
        setOpen([])
      }
    }

    function onLink(event) {
      const link = event.target.closest?.('a[href]')
      if (event.defaultPrevented || !link || link.target || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return
      const section = sectionFor(url.hash)
      if (!section) return
      lastHash.current = url.hash
      startNavigation()
      pendingScroll.current = { anchor: section.target, focus: true }
      // Commit the accordion before the browser resolves the fragment.
      flushSync(() => reveal(section))
      section.summary.focus({ preventScroll: true })
    }

    let frame = 0
    function updateProgress() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (root.hasAttribute('data-scrolling')) return
        let visible = first
        const line = toolbar.current.getBoundingClientRect().bottom + 24
        for (const card of root.querySelectorAll('[data-reading-card]')) {
          if (card.getBoundingClientRect().top > line) break
          visible = card.dataset.readingCard
        }
        setCurrent(visible)
      })
    }

    syncFragment()
    setOpen(previous => previous ?? [])
    document.addEventListener('click', onLink, true)
    window.addEventListener('hashchange', syncFragment)
    window.addEventListener('popstate', syncFragment)
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    window.addEventListener('wheel', finishNavigation, { passive: true })
    window.addEventListener('touchmove', finishNavigation, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      finishNavigation()
      document.removeEventListener('click', onLink, true)
      window.removeEventListener('hashchange', syncFragment)
      window.removeEventListener('popstate', syncFragment)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      window.removeEventListener('wheel', finishNavigation)
      window.removeEventListener('touchmove', finishNavigation)
    }
  }, [first, finishNavigation, startNavigation])

  function toggleSummary(event, id, isOpen) {
    event.preventDefault()
    if (!isOpen) {
      const anchor = event.currentTarget
      anchor.focus({ preventScroll: true })
      pendingScroll.current = { anchor, focus: true }
    }
    setAnimatedCard(id)
    setCurrent(id)
    setOpen(isOpen ? [] : [id])
  }

  function setAll(expand) {
    const anchor = article.current.querySelectorAll('[data-reading-card] > summary')[currentIndex]
    const top = anchor.getBoundingClientRect().top
    const inset = toolbar.current.getBoundingClientRect().bottom + 12
    pendingScroll.current = { anchor, top: expand ? top : Math.max(top, inset) }
    setAnimatedCard(null)
    setOpen(expand ? cards.map(card => card.id) : [])
  }

  if (!cards.length) return children

  return <div ref={article} className="reading-article">
    <div ref={toolbar} className="reading-controls">
      <button type="button" onClick={() => setAll(!allOpen)} disabled={open === null}>
        {allOpen ? 'Collapse sections' : 'Expand sections'}
      </button>
    </div>
    <div className="mnd-feed reading-card-list">
      {cards.map(({ id, title, content }) => {
        const isOpen = open?.includes(id) ?? false
        const preview = typeof summaries[id] === 'string' ? summaries[id] : ''
        return <details key={id} className="mnd-feed-entry reading-card" data-reading-card={id}
          data-animate={animatedCard === id ? '' : undefined} open={isOpen}>
          <summary id={id} className="mnd-feed-summary" onClick={event => toggleSummary(event, id, isOpen)}>
            <span className="mnd-feed-info">
              <span className="mnd-feed-title">{title}</span>
              {!isOpen && preview && <span className="mnd-feed-search-excerpt">{preview}</span>}
            </span>
            <span className="mnd-feed-chevron" aria-hidden="true" />
          </summary>
          <div className="reading-card-panel">
            {preview && <div className="mnd-feed-context"><p className="mnd-feed-excerpt">{preview}</p></div>}
            <div className="mnd-feed-body reading-card-body">{content}</div>
          </div>
        </details>
      })}
    </div>
  </div>
}
