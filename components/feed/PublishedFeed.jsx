import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Feed, { entryMediaType } from './Feed'
import { normalize_tags } from './card-meta.mjs'
import entries from '../../public/post-feed.json'
import siteConfig from '../../site.config'

function relative_url(value, from) {
  try {
    const url = new URL(value, 'https://mndsite.invalid/' + from)
    return url.origin === 'https://mndsite.invalid' ? url : null
  } catch {
    return null
  }
}

const posts = entries.map(entry => {
  const tags = entry.facets?.find(facet => facet.name === 'tags')?.values || []
  const searchable = [
    entry.title, entry.summary, entry.body, entry.site,
    ...entry.facets.flatMap(facet => facet.values),
    ...entry.sources.flatMap(source => [source.title, source.publisher, source.url]),
  ].filter(Boolean).join('\n').toLowerCase()
  return { entry, tags, media: entryMediaType(entry), searchable }
})
const tags = [...new Set(posts.flatMap(post => post.tags))].sort()
const mediaTypes = [...new Set(posts.map(post => post.media))].sort()

function single(value) {
  return typeof value === 'string' ? value : ''
}

export default function PublishedFeed() {
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

  const tag = normalize_tags([single(query.tag)])[0] || ''
  const media = single(query.media)
  const oldest = query.sort === 'oldest'
  const term = text.trim().toLowerCase()
  const visible = posts.filter(post => (!tag || post.tags.includes(tag)) &&
    (!media || post.media === media) && (!term || post.searchable.includes(term)))
  if (oldest) visible.sort((a, b) => a.entry.date.localeCompare(b.entry.date))

  function update(changes, replace = false) {
    const next = { ...query, q: text, ...changes }
    for (const key of Object.keys(next)) if (next[key] === '') delete next[key]
    const target = { pathname: router.pathname, query: next, hash: window.location.hash }
    router[replace ? 'replace' : 'push'](target, undefined, { shallow: true, scroll: false })
  }

  return <section className="published-feed" aria-label="Published posts">
    <div className="feed-controls" role="group" aria-label="Filter posts">
      <input type="search" aria-label="Search posts" placeholder="Search posts?" ref={search}
        value={text} onChange={event => {
          const value = event.target.value
          setText(value)
          update({ q: value }, !!text)
        }} />
      {(tags.length > 0 || tag) && <select aria-label="Filter by tag" value={tag}
        onChange={event => update({ tag: event.target.value })}>
        <option value="">All tags</option>
        {tag && !tags.includes(tag) && <option value={tag}>{tag}</option>}
        {tags.map(value => <option key={value}>{value}</option>)}
      </select>}
      {(mediaTypes.length > 1 || media) && <select aria-label="Filter by media" value={media}
        onChange={event => update({ media: event.target.value })}>
        <option value="">All media</option>
        {media && !mediaTypes.includes(media) && <option value={media}>{media}</option>}
        {mediaTypes.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </select>}
      <select aria-label="Sort posts" value={oldest ? 'oldest' : ''}
        onChange={event => update({ sort: event.target.value })}>
        <option value="">Newest first</option><option value="oldest">Oldest first</option>
      </select>
      {(text || tag || media || oldest) && <button type="button" onClick={() => {
        setText('')
        update({ q: '', tag: '', media: '', sort: '' })
      }}>Clear</button>}
      <span className="feed-count" role="status">{visible.length} {visible.length === 1 ? 'post' : 'posts'}</span>
    </div>
    {!visible.length && <p className="feed-empty">{posts.length ? 'No posts match these filters.' : 'No published posts yet.'}</p>}
    <Feed
      entries={visible.map(({ entry }) => ({ ...entry, href: basePath + entry.href + '/' }))}
      defaultSource={siteConfig.title}
      resolveImage={(value, entry) => {
        const url = relative_url(value, entry.path)
        if (!url) return undefined
        const asset = url.pathname.indexOf('/_assets/')
        const images = url.pathname.lastIndexOf('/images/')
        if (asset >= 0) return basePath + url.pathname.slice(asset)
        if (images >= 0) return basePath + '/images' + url.pathname.slice(0, images) + url.pathname.slice(images + 7)
        return url.pathname.startsWith('/assets/') ? basePath + url.pathname : undefined
      }}
      resolveLink={(value, entry) => {
        const url = relative_url(value, entry.path)
        if (!url) return undefined
        return basePath + (value.startsWith('#') ? entry.href.slice(basePath.length) : url.pathname.replace(/\.(?:mdx?|html)$/i, '/')) + url.search + url.hash
      }}
    />
  </section>
}
