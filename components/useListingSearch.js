import { useEffect, useState } from 'react'

export function single(value) {
  return typeof value === 'string' ? value : ''
}

export function usePageSearchIndex(basePath, searching) {
  const [content, setContent] = useState(null)
  useEffect(() => {
    if (!searching || content !== null) return
    const controller = new AbortController()
    fetch(`${basePath}/search-index.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Could not load page content')
        return response.json()
      })
      .then(setContent)
      .catch(() => {
        if (!controller.signal.aborted) setContent(false)
      })
    return () => controller.abort()
  }, [basePath, searching, content])
  return content
}
