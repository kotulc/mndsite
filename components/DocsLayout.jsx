import { useEffect } from 'react'
import DocsTheme from 'nextra-theme-docs'
import { SectionProvider } from './SectionContext'

export default function DocsLayout(props) {
  useEffect(() => {
    const sidebar = document.querySelector('.nextra-sidebar-container')
    if (!sidebar) return
    const layout = sidebar.parentElement
    const desktop = window.matchMedia('(min-width: 768px)')
    let frame = 0
    let height

    function sizeSidebars() {
      frame = 0
      if (!desktop.matches) return
      const inset = parseFloat(getComputedStyle(sidebar).top) || 0
      const bottom = Math.min(window.innerHeight, layout.getBoundingClientRect().bottom)
      const available = Math.max(0, Math.floor(bottom - inset))
      if (height === available) return
      height = available
      layout.style.setProperty('--site-sidebar-height', `${available}px`)
    }

    function scheduleSize() {
      if (!frame) frame = requestAnimationFrame(sizeSidebars)
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      sizeSidebars()
    })
    observer.observe(layout)
    window.addEventListener('scroll', scheduleSize, { passive: true })
    window.addEventListener('resize', scheduleSize)
    sizeSidebars()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', scheduleSize)
      window.removeEventListener('resize', scheduleSize)
      layout.style.removeProperty('--site-sidebar-height')
    }
  }, [props.pageOpts.filePath])

  return (
    <SectionProvider headings={props.pageOpts.headings}>
      <DocsTheme {...props} />
    </SectionProvider>
  )
}
