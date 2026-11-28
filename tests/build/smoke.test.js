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

test('published documentation links to the exported Feed page and current repository', () => {
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
  expect(updates.querySelector('main h1').textContent).toBe('Feed')
  expect(updates.querySelectorAll('input[type="search"]')).toHaveLength(1)
  expect(updates.querySelector('nav input[aria-label="Search feed"]').form.getAttribute('action'))
    .toBe(base + '/updates/')
  expect(home.querySelector('nav a[type="application/rss+xml"]')).toBeNull()
  const rss = updates.querySelector('article a[type="application/rss+xml"]')
  expect(rss.previousElementSibling).toBe(updates.querySelector('main h1'))
  expect(updates.querySelector('main .nx-border-t a[title]')).toBeNull()
  expect(read('updates/welcome/index.html').querySelector('main .nx-border-t a[title]')).not.toBeNull()
  expect(read('about/index.html').querySelector('main .nx-border-t a[title]')).not.toBeNull()
  expect([...updates.querySelectorAll('.nextra-sidebar-container button')].some(button => button.textContent.trim() === 'Updates'))
    .toBe(true)
  expect([...updates.querySelectorAll('.nextra-sidebar-container a[href*="/updates/"]')].map(a => a.textContent))
    .toEqual(['Publishing with Trendly', 'Simplification', 'Welcome'])
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

test('the homepage shows a card for every published page and retains the site tree', () => {
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
  const home = new DOMParser().parseFromString(html, 'text/html')
  const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'site-meta.json'), 'utf8'))
  const titles = [...home.querySelectorAll('.page-feed summary .mnd-feed-title')].map(card => card.textContent)
  const sidebar = home.querySelector('.nextra-sidebar-container')
  const base = JSON.parse(home.getElementById('__NEXT_DATA__').textContent).assetPrefix || ''

  expect(home.querySelector('main h1').textContent).toBe('Pages')
  expect(home.title).toBe('Pages')
  expect([...titles].sort()).toEqual(meta.pages.map(page => page.name).sort())
  const namesByRoute = new Map(meta.pages.map(page => [page.url, page.name]))
  expect(titles).toEqual(meta.reading_order.map(url => namesByRoute.get(url)))
  const controls = home.querySelector('.page-feed .feed-controls')
  expect(home.querySelectorAll('input[type="search"]')).toHaveLength(1)
  expect(home.querySelector('nav input[aria-label="Search pages"]').form.getAttribute('action')).toBe(base + '/')
  expect(controls.querySelector('select[aria-label="Filter pages by label"] optgroup')).not.toBeNull()
  expect([...controls.querySelector('select[aria-label="Sort pages"]').options].map(option => option.text))
    .toEqual(['Reading order', 'Newest first', 'Oldest first'])
  expect(home.querySelector('.published-feed')).toBeNull()
  expect([...sidebar.querySelectorAll('a')].slice(0, 3).map(link => link.textContent))
    .toEqual(['About', 'Getting Started', 'Configuration'])
  expect(sidebar.querySelector('a[href$="/about/"]')).not.toBeNull()
})

test('article search and labels link to the published page results', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'site-meta.json'), 'utf8'))
  const parse = file => new DOMParser().parseFromString(fs.readFileSync(path.join(OUT, file), 'utf8'), 'text/html')
  const article = parse('about/index.html')
  const base = JSON.parse(article.getElementById('__NEXT_DATA__').textContent).assetPrefix || ''
  const link = meta.browse === '/' ? base + '/' : base + meta.browse + '/'
  expect(article.querySelector('nav input[aria-label="Search site"]').form.getAttribute('action')).toBe(link)
  expect(article.querySelector('.tag-list a.chip-tags').getAttribute('href')).toContain((meta.browse === '/' ? base + '/?' : link + '?'))
  const listingPath = meta.browse === '/' ? 'index.html' : meta.browse.slice(1) + '/index.html'
  const listing = parse(listingPath)
  expect(listing.querySelector('main h1').textContent).toBe('Pages')
  expect(listing.title).toMatch(/^Pages/)
  expect(listing.querySelectorAll('input[type="search"]')).toHaveLength(1)
  expect(listing.querySelector('.nextra-nav-container input[type="search"]')).not.toBeNull()
  expect(listing.querySelector('.nextra-sidebar-container a[href$="/about/"]')).not.toBeNull()
  if (meta.browse === '/') {
    expect(listing.querySelector('.page-feed')).not.toBeNull()
    expect(listing.querySelectorAll('.page-feed summary .mnd-feed-title')).toHaveLength(meta.pages.length)
  } else {
    const rows = [...listing.querySelectorAll('main .browse-result > a')]
    expect(rows).toHaveLength(meta.pages.length)
    expect(rows.some(row => row.textContent === 'Future Plans')).toBe(false)
  }
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

test('reading cards keep article content, navigation, and search anchors in sync', () => {
  const html = fs.readFileSync(path.join(OUT, 'features/content-pipeline/index.html'), 'utf8')
  const page = new DOMParser().parseFromString(html, 'text/html')
  const cards = [...page.querySelectorAll('details[data-reading-card]')]
  const ids = cards.map(card => card.dataset.readingCard)
  const search = JSON.parse(fs.readFileSync(path.join(OUT, 'search-index.json'), 'utf8'))
  const entry = search['/features/content-pipeline']
  expect(ids).toEqual(['pipeline-workflow', 'running-ingest', 'what-ingest-does',
    'source-layout-rules', 'cross-project-contract'])
  expect(entry.cards.map(card => card.id)).toEqual(ids)
  expect([...page.querySelectorAll('.reading-controls button')].map(button => button.textContent))
    .toEqual(['Expand sections'])
  expect(page.querySelector('.reading-controls').textContent).toBe('Expand sections')
  expect(ids.every(id => page.querySelector(`.nextra-toc a[href="#${id}"]`))).toBe(true)
  expect(cards.every((card, index) => !card.open &&
    card.querySelector('summary') === page.getElementById(ids[index]))).toBe(true)
  expect(cards[0].contains(page.getElementById('mndsite-owns'))).toBe(true)
  expect(cards[1].querySelector('pre').textContent).toContain('npm run ingest')
  expect(page.querySelector('.reading-article .reading-card-links')).toBeNull()
  expect([...page.querySelectorAll('main > .nx-border-t > a[title]')].map(link => link.title))
    .toEqual(['Components', 'Deployment'])
  expect(entry.cards[1].text).toContain('npm run ingest')
  expect(typeof search['/features/overview']).toBe('string')
})

test('site defaults fold H2 sections and the Components pilot also folds H3', () => {
  const parse = route => new DOMParser().parseFromString(
    fs.readFileSync(path.join(OUT, route, 'index.html'), 'utf8'), 'text/html',
  )
  const search = JSON.parse(fs.readFileSync(path.join(OUT, 'search-index.json'), 'utf8'))
  const about = parse('about')
  const components = parse('features/components')
  const child = components.getElementById('taglist')
  const details = child.closest('details')

  expect(about.querySelectorAll('.reading-card-list > details').length).toBeGreaterThan(0)
  expect(about.querySelector('.reading-subsection')).toBeNull()
  expect(parse('features/overview').querySelector('.reading-article')).toBeNull()
  expect(details.classList.contains('reading-subsection')).toBe(true)
  expect(details.parentElement.closest('details').dataset.readingCard).toBe('component-reference')
  expect(search['/features/components'].cards.find(card => card.id === 'taglist').parents)
    .toEqual(['Component reference'])
  expect(components.querySelectorAll('#taglist')).toHaveLength(1)
})
