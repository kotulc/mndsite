import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

export function single(value) {
  return typeof value === 'string' ? value : ''
}

export function useListingSearch() {
  const router = useRouter()
  const { basePath, query } = router
  const urlText = single(query.q)
  const [text, setText] = useState(urlText)
  const search = useRef(null)
  useEffect(() => setText(urlText), [urlText])
  useEffect(() => {
    function shortcut(event) {
      if (event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey ||
          event.target.isContentEditable || event.target.closest?.('input, textarea, select')) return
      event.preventDefault()
      event.stopPropagation()
      search.current?.focus()
    }
    window.addEventListener('keydown', shortcut, true)
    return () => window.removeEventListener('keydown', shortcut, true)
  }, [])

  function update(changes, replace = false) {
    const next = { ...query, q: text, ...changes }
    for (const key of Object.keys(next)) if (next[key] === '') delete next[key]
    const target = { pathname: router.pathname, query: next, hash: window.location.hash }
    router[replace ? 'replace' : 'push'](target, undefined, { shallow: true, scroll: false })
  }

  function changeText(value) {
    setText(value)
    update({ q: value }, !!text)
  }
  return { basePath, query, text, setText, search, update, changeText }
}
