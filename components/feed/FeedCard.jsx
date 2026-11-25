import { useEffect, useLayoutEffect, useRef } from 'react'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function reveal_offset({ top, bottom }, inset) {
  if (top < inset) return top - inset
  return Math.max(0, Math.min(bottom - window.innerHeight, top - inset))
}

function reveal_as_it_resizes(element, header, bounds = () => element.getBoundingClientRect()) {
  let frame = 0
  let destination
  const interaction = new AbortController()
  const observer = new ResizeObserver(() => {
    const inset = parseFloat(getComputedStyle(header).scrollMarginTop) || 0
    const start = window.scrollY
    const max = document.scrollingElement.scrollHeight - window.innerHeight
    const target = Math.max(0, Math.min(max, start + reveal_offset(bounds(inset), inset)))
    if (target === destination) return
    cancelAnimationFrame(frame)
    destination = target
    const distance = target - start
    if (Math.abs(distance) < 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: target, behavior: 'instant' })
      return
    }

    const duration = Math.min(700, 320 + Math.abs(distance) * .5)
    const started = performance.now()
    let last_position = start
    function animate(now) {
      if (Math.abs(window.scrollY - last_position) > 1) {
        stop()
        return
      }
      const progress = Math.min(1, (now - started) / duration)
      const eased = progress * progress * (3 - 2 * progress)
      window.scrollTo({ top: start + distance * eased, behavior: 'instant' })
      last_position = window.scrollY
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
  })

  function stop() {
    cancelAnimationFrame(frame)
    observer.disconnect()
    interaction.abort()
  }

  for (const event of ['wheel', 'touchmove', 'pointerdown', 'keydown']) {
    window.addEventListener(event, stop, { passive: true, capture: true, signal: interaction.signal })
  }
  observer.observe(element)
  return stop
}

export function FacetChip({ facet: { name, label, hue, value } }) {
  return <span className="mnd-feed-facet" title={`${label}: ${value}`}
    data-status={name === 'status' ? value.toLowerCase() : undefined}
    style={hue === undefined ? undefined : { '--facet-hue': hue }}>{value}</span>
}

export function FeedCard({ title, meta, tags, badge, excerpt, searchExcerpt, preview = searchExcerpt, open, focusOnOpen, toggle, children }) {
  const summary = useRef(null)

  useBrowserLayoutEffect(() => {
    if (!open) return
    const header = summary.current
    if (focusOnOpen) header.focus({ preventScroll: true })

    const card = header.parentElement
    return reveal_as_it_resizes(card, header, inset => {
      const rect = card.getBoundingClientRect()
      const available = window.innerHeight - inset
      if (rect.height <= available) return rect

      const media = card.querySelector('.mnd-feed-body :is(.mnd-feed-player, img:not(.mnd-feed-thumb))')
      const media_rect = media?.getBoundingClientRect()
      if (!media_rect?.height) return rect
      // Keep the title and media together when they can share the viewport.
      return media_rect.bottom - rect.top <= available ? { top: rect.top, bottom: media_rect.bottom } : media_rect
    })
  }, [open, focusOnOpen])

  return <details className="mnd-feed-entry" open={open}>
    <summary ref={summary} className="mnd-feed-summary" onClick={event => {
      event.preventDefault()
      if (!open) event.currentTarget.focus({ preventScroll: true })
      toggle()
    }}>
      <span className="mnd-feed-info">
        <span className="mnd-feed-title" title={title}>{title}</span>
        <span className="mnd-feed-meta">{meta}</span>
        {!open && preview && <span className="mnd-feed-search-excerpt">{preview}</span>}
      </span>
      {tags}
      {badge}
    </summary>
    {open && <>
      {excerpt && <div className="mnd-feed-context"><p className="mnd-feed-excerpt">{excerpt}</p></div>}
      <div className="mnd-feed-body">{children}</div>
    </>}
  </details>
}
