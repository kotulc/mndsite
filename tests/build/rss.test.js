const fs = require('fs')
const os = require('os')
const path = require('path')
const { load_config } = require('../../scripts/config')
const { run } = require('../../scripts/ingest')

describe('static RSS feed', () => {
  let root
  let config_path

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-rss-'))
    config_path = path.join(root, 'mndsite.yaml')
    fs.mkdirSync(path.join(root, 'posts', 'updates'), { recursive: true })
    fs.mkdirSync(path.join(root, 'drafts'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  function configure(rss = 'rss:\n  site_url: https://example.org/project\n') {
    fs.writeFileSync(config_path, 'title: Updates & notes\ncontent: posts\nfeed_url: updates\n' + rss)
    return { ...load_config(config_path), root }
  }

  function post(file, title, date, description) {
    fs.writeFileSync(path.join(root, file), `---\ntitle: "${title}"\n${date ? `date: ${date}\n` : ''}${description ? `description: "${description}"\n` : ''}---\n\nFirst paragraph.\n`)
  }

  test('preserves an authored Browse page and links the generated list at a free route', async () => {
    fs.writeFileSync(path.join(root, 'posts/browse.md'),
      '---\ntitle: Authored Browse\n---\n\nFirst paragraph.\n\n## Details\n\nCase-sensitive identifier.\n')
    post('drafts/hidden.md', 'Hidden keyword')
    await run(configure())
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/site-meta.json'), 'utf8'))
    const index = JSON.parse(fs.readFileSync(path.join(root, 'public/search-index.json'), 'utf8'))
    expect(metadata.browse).toBe('/browse-pages')
    expect(metadata.pages.map(page => page.url)).toEqual(['/browse'])
    expect(fs.readFileSync(path.join(root, 'pages/browse-pages.mdx'), 'utf8')).toContain('<Browse />')
    expect(Object.keys(index)).toEqual(['/browse'])
    expect(index['/browse']).toContain('Case-sensitive identifier')
  })

  test('the homepage feed preserves an authored introduction and stays separate from RSS', async () => {
    post('posts/index.md', 'Site introduction')
    post('posts/updates/index.md', 'Updates introduction')
    post('posts/updates/new.md', 'New post', '2026-10-10')
    post('posts/guide.md', 'Dated guide', '2026-10-12')
    const config = configure('homepage_feed: true\nexpandable_feed: true\nrss:\n  site_url: https://example.org/project/\n')
    await run(config)

    const home = fs.readFileSync(path.join(root, 'pages/index.mdx'), 'utf8')
    expect(home.indexOf('First paragraph.')).toBeLessThan(home.indexOf('<PageFeed />'))
    expect(home).toContain('<PageFeed />')
    expect(home).not.toContain('<AutoRedirect')
    const { reading_order } = JSON.parse(fs.readFileSync(path.join(root, 'public/site-meta.json'), 'utf8'))
    expect(reading_order).toEqual(['/', '/guide', '/updates', '/updates/new'])
    const rss = new DOMParser().parseFromString(fs.readFileSync(path.join(root, 'public/rss.xml'), 'utf8'), 'text/xml')
    expect([...rss.querySelectorAll('item > title')].map(title => title.textContent)).toEqual(['New post'])
  })

  test('a separate feed route selects directories and exact files for both outputs', async () => {
    post('posts/updates/new.md', 'Selected update', '2026-10-10')
    post('posts/updates/notes.md', 'Undated note')
    post('posts/updates/draft.md', 'Draft update', '2026-10-14')
    post('posts/guide.md', 'Selected guide', '2026-10-12')
    post('posts/reference.md', 'Reference', '2026-10-13')
    fs.mkdirSync(path.join(root, 'posts/updates-archive'))
    post('posts/updates-archive/old.md', 'Archive', '2026-10-11')
    await run(configure('feed:\n  path: /news/feed/\n  include: [updates/, guide.md]\n' +
      'drafts: [posts/updates/draft.md]\nrss:\n  site_url: https://example.org/project/\n'))

    const read = file => fs.readFileSync(path.join(root, file), 'utf8')
    expect(read('pages/news/feed.mdx')).toContain("import PublishedFeed from '../../components/feed/PublishedFeed'")
    expect(JSON.parse(read('pages/_meta.json')).news).toEqual({ display: 'children' })
    expect(JSON.parse(read('pages/news/_meta.json')).feed).toEqual({ display: 'hidden' })
    expect(JSON.parse(read('pages/updates/_meta.json')).notes).toBe('Undated note')
    const cards = JSON.parse(read('public/post-feed.json'))
    expect(cards.map(card => card.href)).toEqual(['/guide', '/updates/new'])
    const rss = new DOMParser().parseFromString(read('public/rss.xml'), 'text/xml')
    expect(rss.querySelector('channel > link').textContent).toBe('https://example.org/project/news/feed/')
    expect([...rss.querySelectorAll('item > title')].map(title => title.textContent)).toEqual(cards.map(card => card.title))
  })

  test('exports ordered published summaries and permanent URLs, then removes disabled output', async () => {
    post('posts/updates/new.md', 'New & notable', '2026-10-10', 'A <B> summary')
    post('posts/updates/old.md', 'Old note', '2026-09-08')
    post('posts/updates/index.md', 'Updates index', '2026-10-12')
    post('posts/updates/undated.md', 'Undated')
    post('posts/other.md', 'Outside section', '2026-10-13')
    post('drafts/secret.md', 'Private draft', '2026-10-14')
    const target = path.join(root, 'public', 'rss.xml')
    const config = configure()
    await run(config)

    function read_feed() {
      const xml = fs.readFileSync(target, 'utf8')
      const parsed = new DOMParser().parseFromString(xml, 'application/xml')
      expect(parsed.querySelector('parsererror')).toBeNull()
      return parsed
    }

    const parsed = read_feed()
    const items = [...parsed.querySelectorAll('item')]
    expect(items.map(item => item.querySelector('title').textContent)).toEqual(['New & notable', 'Old note'])
    expect(items.map(item => item.querySelector('description').textContent)).toEqual(['A <B> summary', 'First paragraph.'])
    expect(items[0].querySelector('pubDate').textContent).toBe('Sat, 10 Oct 2026 00:00:00 GMT')
    expect(parsed.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'link')[0].getAttribute('href'))
      .toBe('https://example.org/project/rss.xml')

    const guid = items[0].querySelector('guid').textContent
    expect(guid).toBe('https://example.org/project/updates/new/')
    post('posts/updates/new.md', 'Revised title', '2026-10-10')
    await run(config)
    expect(read_feed().querySelector('item guid').textContent).toBe(guid)

    await run(configure('rss: false\n'))
    expect(fs.existsSync(target)).toBe(false)
  })

  test('rejects a relative public site URL', () => {
    expect(() => configure('rss:\n  site_url: /project/\n')).toThrow('rss.site_url')
  })

  test('omits configured draft paths from public pages and RSS and restores their URLs when republished', async () => {
    post('posts/updates/new.md', 'Draft update', '2026-10-10')
    post('posts/updates/old.md', 'Other update', '2026-09-08')
    const rss = 'rss:\n  site_url: https://example.org/project/\n'
    const read = name => fs.readFileSync(path.join(root, 'public', name), 'utf8')
    const page = path.join(root, 'pages', 'updates', 'new.mdx')
    await run(configure(rss + 'drafts:\n  - posts/updates/new.md\n'))
    expect(fs.existsSync(path.join(root, 'posts', 'updates', 'new.md'))).toBe(true)
    expect(fs.existsSync(page)).toBe(false)
    for (const file of ['rss.xml', 'site-meta.json']) {
      expect(read(file)).toContain('Other update')
      expect(read(file)).not.toContain('Draft update')
    }

    await run(configure(rss + 'drafts: []\n'))
    expect(fs.existsSync(page)).toBe(true)
    expect(read('rss.xml')).toContain('<guid isPermaLink="true">https://example.org/project/updates/new/</guid>')
  })

  test('a non-expandable RSS section with no index gets a readable landing page', async () => {
    post('posts/updates/public.md', 'Public update', '2026-10-10')
    post('posts/updates/draft.md', 'Draft update', '2026-10-11')
    await run(configure('rss:\n  site_url: https://example.org/\ndrafts: [posts/updates/draft.md]\n'))
    const landing = fs.readFileSync(path.join(root, 'pages', 'updates', 'index.mdx'), 'utf8')
    expect(landing).toContain('# Updates')
    expect(landing).toContain('/updates/public')
    expect(landing).not.toMatch(/AutoRedirect|PublishedFeed|Draft update/)
  })

  test('uses the RSS selection in the section index and preserves an authored introduction', async () => {
    post('posts/updates/new.md', 'Published update', '2026-10-10')
    post('drafts/secret.md', 'Private draft', '2026-10-14')
    const source = path.join(root, 'posts', 'updates', 'new.md')
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace(
      '\n---\n', '\nsite: Field Notes\nstatus: Published\ntags: [design]\ncover:\n  url: ../_assets/cover.jpg\n  alt: Trail map\nformat: Essay\n---\n'
    ))
    const config = configure('expandable_feed: true\nrss:\n  site_url: https://example.org/project/\n' +
      'frontmatter:\n  facets:\n    format:\n      key: format\n      label: Format\n      color: teal\n')
    const output = path.join(root, 'pages', 'updates', 'index.mdx')
    await run(config)
    expect(fs.readFileSync(path.join(root, 'pages', 'index.mdx'), 'utf8')).toContain('to="/updates/"')
    expect(fs.readFileSync(output, 'utf8')).toContain('# Feed')
    expect(fs.readFileSync(output, 'utf8')).toContain('<PublishedFeed />')
    expect(JSON.parse(fs.readFileSync(path.join(root, 'public', 'post-feed.json'), 'utf8')))
      .toEqual([expect.objectContaining({
        title: 'Published update', body: 'First paragraph.\n', href: '/updates/new', site: 'Field Notes',
        cover: { url: '../_assets/cover.jpg', alt: 'Trail map' },
        facets: expect.arrayContaining([
          expect.objectContaining({ name: 'status', values: ['Published'] }),
          expect.objectContaining({ name: 'tags', values: ['design'] }),
          expect.objectContaining({ name: 'format', hue: 190, values: ['Essay'] }),
        ]),
      })])
    post('posts/updates/index.md', 'Authored introduction')
    await run(config)
    expect(fs.readFileSync(output, 'utf8')).toContain('Authored introduction')
    expect(fs.readFileSync(output, 'utf8')).toContain('<PublishedFeed />')
  })
})
