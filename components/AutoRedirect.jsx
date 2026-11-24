/**
 * Client-side redirect for auto-generated index pages.
 * Uses Next.js router.replace() so basePath is handled automatically.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'


export default function AutoRedirect({ to }) {
  const router = useRouter()
  useEffect(() => {
    if (router.isReady && (typeof router.query.view !== 'string' || router.query.view === 'pages')) router.replace(to)
  }, [router.isReady, router.query.view, to])
  return null
}
