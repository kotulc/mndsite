const fs   = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../../dist')


test('test_build_out_dir_exists', () => {
  expect(fs.existsSync(OUT)).toBe(true)
})

test('test_build_index_page_exists', () => {
  expect(fs.existsSync(path.join(OUT, 'index.html'))).toBe(true)
})

test('test_build_images_copied', () => {
  expect(fs.existsSync(path.join(OUT, 'images'))).toBe(true)
})

test('published documentation links to the exported Updates page and current repository', () => {
  const read = file => new DOMParser().parseFromString(
    fs.readFileSync(path.join(OUT, file), 'utf8'), 'text/html'
  )
  const home = read('index.html')
  const updates = read('updates/index.html')
  const base = JSON.parse(home.getElementById('__NEXT_DATA__').textContent).assetPrefix || ''
  const logo = home.querySelector('nav .site-logo')
  expect(logo.textContent).toBe('MndSite')
  expect(logo.querySelector('img').getAttribute('src')).toBe(base + '/assets/mnd.svg')
  expect(home.querySelector('head link[rel="icon"]').getAttribute('href')).toBe(base + '/assets/mnd.svg')
  expect(fs.existsSync(path.join(OUT, 'assets/mnd.svg'))).toBe(true)
  const feed = home.querySelector('nav a[aria-label="Feed"]')
  expect(feed.getAttribute('href')).toBe(base + '/updates/')
  expect(feed.querySelector('svg')).not.toBeNull()
  expect(feed.textContent.trim()).toBe('')
  expect(home.querySelector('nav a[type="application/rss+xml"]')).toBeNull()
  const rss = updates.querySelector('article a[type="application/rss+xml"]')
  expect(rss.previousElementSibling).toBe(updates.querySelector('main h1'))
  expect(updates.querySelector('main .nx-border-t a[title]')).toBeNull()
  expect(read('updates/welcome/index.html').querySelector('main .nx-border-t a[title]')).toBeNull()
  expect(read('about/index.html').querySelector('main .nx-border-t a[title]')).not.toBeNull()
  expect([...updates.querySelectorAll('.nextra-sidebar-container a[href*="/updates/"]')].map(a => a.textContent))
    .toEqual(['Publishing with Trendly', 'Welcome'])
  expect(rss.textContent).toBe('Subscribe via RSS')
  expect(rss.getAttribute('href')).toBe('https://kotulc.github.io/mndsite/rss.xml')
  expect(fs.existsSync(path.join(OUT, 'rss.xml'))).toBe(true)
  expect(updates.querySelector('.published-feed')).not.toBeNull()
  expect(updates.querySelector('a[aria-label="GitHub repository"]').getAttribute('href'))
    .toBe('https://github.com/kotulc/mndsite')
  const specification = read('specifications/specification/index.html')
  for (const link of specification.querySelectorAll('a[href]')) {
    expect(link.getAttribute('href')).not.toMatch(/(?:nlp-mn?dsite|\/\.\.\.(?:\/|$))/i)
  }
})

test('Pages is linked from articles and lists published pages under the navbar search', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'site-meta.json'), 'utf8'))
  const parse = file => new DOMParser().parseFromString(fs.readFileSync(path.join(OUT, file), 'utf8'), 'text/html')
  const article = parse('about/index.html')
  const browseLink = article.querySelector('.browse-link')
  expect(browseLink.getAttribute('aria-label')).toBe('Browse pages')
  expect(browseLink.querySelector('svg')).not.toBeNull()
  const link = browseLink.getAttribute('href')
  expect(link).toMatch(/\/browse\/$/)
  expect(article.querySelector('.tag-list a.chip-tags').getAttribute('href')).toContain(link + '?tag=')
  const browse = parse(meta.browse.slice(1) + '/index.html')
  expect(browse.querySelector('main h1').textContent).toBe('Pages')
  expect(browse.title).toMatch(/^Pages/)
  expect(browse.querySelectorAll('input[type="search"]')).toHaveLength(1)
  expect(browse.querySelector('.nextra-nav-container input[type="search"]')).not.toBeNull()
  expect(browse.querySelector('.nextra-sidebar-container a[href$="/about/"]')).not.toBeNull()
  const rows = [...browse.querySelectorAll('main .browse-result > a')]
  expect(rows).toHaveLength(meta.pages.length)
  expect(rows.some(row => row.textContent === 'Future Plans')).toBe(false)
})

test('exported Contents links resolve to the rendered headings', () => {
  const html = fs.readFileSync(path.join(OUT, 'archive/index.html'), 'utf8')
  const page = new DOMParser().parseFromString(html, 'text/html')
  const toc = page.querySelector('.nextra-toc')
  expect(toc).not.toBeNull()
  const links = toc.querySelectorAll('a[href^="#"]')
  expect(links.length).toBeGreaterThan(0)
  for (const link of links) expect(page.getElementById(link.hash.slice(1))).not.toBeNull()
})
