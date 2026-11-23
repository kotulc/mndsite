import { useRef } from 'react'
import { useSection } from './SectionContext'
import PageContents, { contents_items } from './PageContents'
import siteConfig from '../site.config'

export default function ContentsMenu() {
  const { page, sections } = useSection()
  const details = useRef(null)
  const order = siteConfig.display.contents
  if (!contents_items(order, page, sections).length) return null

  function close() {
    details.current.open = false
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !details.current.open) return
    event.stopPropagation()
    close()
    details.current.querySelector('summary').focus()
  }

  return (
    <details key={page.url} ref={details} className="contents-panel" onKeyDown={onKeyDown}>
      <summary>Contents</summary>
      <PageContents order={order} on_navigate={close} />
    </details>
  )
}
