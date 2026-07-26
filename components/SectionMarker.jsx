/**
 * Invisible scroll marker injected by ingest.js right after each ## / ### heading.
 * Observes its own position and reports it into SectionContext so MetaSidebar can show
 * the currently-viewed section's tags/keywords/metrics — sections no longer render
 * their own inline chips (too busy), that content moved to the ToC sidebar instead.
 */
import { useEffect, useRef } from 'react'
import { useSection } from './SectionContext'

export default function SectionMarker({ i }) {
  const ref = useRef(null)
  const { set_active } = useSection()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) set_active(i) },
      { rootMargin: '-80px 0px -80% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [i, set_active])

  return <span ref={ref} className="section-marker" />
}
