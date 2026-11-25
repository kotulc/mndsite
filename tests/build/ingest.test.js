/**
 * Unit and integration tests for the ingest pipeline's sort ordering.
 * Imports exported functions directly from ingest.js.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { parse_fm, sort_entries, extract_content, norm_path, slug_to_title } = require('../../scripts/ingest')
const { load_config } = require('../../scripts/config')
const ingest = require('../../scripts/ingest')


function entry(slug, opts = {}) {
  return { slug, title: slug, published: opts.date || '' }
}

const TEST_REL  = 'test-dir'
const siteConfig = require('../../site.config')
const ARRAY_REL  = '__test-array__'
beforeAll(() => { siteConfig.nav_order[ARRAY_REL] = ['pinned-b', 'pinned-a'] })
afterAll(() => { delete siteConfig.nav_order[ARRAY_REL] })


describe('sort_entries — alphabetical (default)', () => {
  test('test_sort_alpha', () => {
    const result = sort_entries([entry('zebra'), entry('apple'), entry('mango')], TEST_REL)
    expect(result.map(e => e.slug)).toEqual(['apple', 'mango', 'zebra'])
  })

  test('test_sort_index_always_first', () => {
    const result = sort_entries([entry('zebra'), entry('index'), entry('apple')], TEST_REL)
    expect(result[0].slug).toBe('index')
  })
})


describe('sort_entries — array nav_order', () => {
  test('test_sort_array_pins_listed_slugs_first', () => {
    const result = sort_entries([
      entry('unlisted-z'),
      entry('pinned-a'),
      entry('unlisted-a'),
      entry('pinned-b'),
    ], ARRAY_REL)
    expect(result.map(e => e.slug)).toEqual(['pinned-b', 'pinned-a', 'unlisted-a', 'unlisted-z'])
  })

  test('test_sort_array_unlisted_alpha', () => {
    const result = sort_entries([
      entry('pinned-b'),
      entry('newer'),
      entry('older'),
    ], ARRAY_REL)
    const keys = result.map(e => e.slug)
    expect(keys[0]).toBe('pinned-b')
    expect(keys.slice(1)).toEqual(['newer', 'older'])
  })
})


describe('extract_content', () => {
  test('test_extract_strips_frontmatter', () => {
    const mdx = '---\ntitle: Test\n---\n\nBody text.\n'
    expect(extract_content(mdx)).toBe('Body text.')
  })

  test('test_extract_strips_leading_h1', () => {
    const mdx = '---\ntitle: T\n---\n\n# My Page\n\nBody text.\n'
    expect(extract_content(mdx)).toBe('Body text.')
  })

  test('test_extract_strips_top_level_imports', () => {
    const mdx = '---\ntitle: T\n---\n\nimport Foo from \'./Foo\'\n\nBody.\n'
    expect(extract_content(mdx)).toBe('Body.')
  })

  test('test_extract_preserves_imports_in_code_fences', () => {
    const mdx = [
      '---', 'title: T', '---', '',
      '```js',
      'import React from \'react\'',
      '```',
      '',
      'Body.',
    ].join('\n')
    expect(extract_content(mdx)).toContain('import React from \'react\'')
  })
})


const ROOT_CFG = path.join(__dirname, '../../mndsite.yaml')

// Ingest the repo's own content into a temp root, so the generated pages/ and
// public/site-meta.json the dev server and the other suites read stay untouched.
let root
const pages_dir = () => path.join(root, 'pages')

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-ingest-'))
  await ingest.run({ ...load_config(ROOT_CFG), root })
})

afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

describe('pages output ordering', () => {
  test('repeat ingestion preserves unchanged routes and removes obsolete output', async () => {
    const article = path.join(pages_dir(), 'about.mdx')
    const stale = path.join(pages_dir(), 'obsolete.mdx')
    fs.utimesSync(article, 100, 100)
    fs.writeFileSync(stale, '# Obsolete')
    await ingest.run({ ...load_config(ROOT_CFG), root })
    expect(fs.statSync(article).mtimeMs).toBe(100000)
    expect(fs.existsSync(stale)).toBe(false)
  })

  test('test_pages_features_meta_follows_nav_order', () => {
    const expected = siteConfig.nav_order['features']
    const meta = JSON.parse(fs.readFileSync(path.join(pages_dir(), 'features', '_meta.json'), 'utf8'))
    const keys = Object.keys(meta).filter(k => k !== 'index')
    expect(keys.slice(0, expected.length)).toEqual(expected)
  })

  test('the feed selection leaves the content tree in navigation order', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(pages_dir(), 'updates', '_meta.json'), 'utf8'))
    const cards = JSON.parse(fs.readFileSync(path.join(root, 'public', 'post-feed.json'), 'utf8'))
    expect(Object.keys(meta).filter(slug => slug !== 'index'))
      .toEqual(['publishing-with-trendly', 'simplification', 'welcome'])
    expect(cards.map(card => card.href)).toEqual(['/updates/publishing-with-trendly', '/updates/welcome'])
    const nav = JSON.parse(fs.readFileSync(path.join(pages_dir(), '_meta.json'), 'utf8'))
    expect(nav.updates).toBe('Updates')
  })

  test('the homepage feed stays out of the site tree and About is listed once', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(pages_dir(), '_meta.json'), 'utf8'))
    expect(fs.readFileSync(path.join(pages_dir(), 'index.mdx'), 'utf8')).toContain('<PageFeed />')
    expect(meta.index).toEqual({ display: 'hidden', theme: { toc: false, pagination: false } })
    expect(Object.values(meta).filter(title => title === 'About')).toHaveLength(1)
    expect(fs.readFileSync(path.join(pages_dir(), 'features', 'index.mdx'), 'utf8')).toContain('<AutoRedirect')
  })

  test('homepage_feed uses the root Pages index as the browse route', () => {
    const site = JSON.parse(fs.readFileSync(path.join(root, 'public/site-meta.json'), 'utf8'))
    expect(site.browse).toBe('/')
    expect(fs.existsSync(path.join(pages_dir(), 'browse.mdx'))).toBe(false)
    expect(fs.readFileSync(path.join(pages_dir(), 'index.mdx'), 'utf8')).not.toContain('<AutoRedirect')
  })

  test('homepage reading order follows root, nested, and Updates navigation', () => {
    const { reading_order } = JSON.parse(fs.readFileSync(path.join(root, 'public', 'site-meta.json'), 'utf8'))
    expect(reading_order.slice(0, 4)).toEqual(['/about', '/getting-started', '/configuration', '/archive'])
    expect(reading_order.filter(url => url.startsWith('/features/')).slice(0, 3))
      .toEqual(['/features/overview', '/features/components', '/features/content-pipeline'])
    expect(reading_order.filter(url => url.startsWith('/updates/')))
      .toEqual(['/updates/publishing-with-trendly', '/updates/simplification', '/updates/welcome'])
  })
})


describe('site meta output', () => {
  const load = () => JSON.parse(fs.readFileSync(path.join(root, 'public', 'site-meta.json'), 'utf8'))
  const has_pages = () => {
    try { return load().pages.length > 0 } catch { return false }
  }

  test('test_site_meta_is_flat_pages_list', () => {
    const m = load()
    expect(Array.isArray(m.pages)).toBe(true)
    if (!has_pages()) return
    expect(m.pages.length).toBeGreaterThan(0)
  })

  test('test_site_meta_page_fields', () => {
    if (!has_pages()) return
    const page = load().pages.find(p => p.url === '/configuration')
    expect(page).toMatchObject({ slug: 'configuration' })
    expect(page.metrics.word_count).toBeGreaterThan(0)
    expect(page.sections.map(s => s.name)).toContain('Fields')
    expect(Array.isArray(page.links)).toBe(true)
    expect(Array.isArray(page.related)).toBe(true)
    expect(page.facets).toMatchObject({ categories: expect.any(Array) })
  })

  test('test_pages_preserve_frontmatter', () => {
    for (const f of ['getting-started.mdx', 'configuration.mdx']) {
      const p = path.join(pages_dir(), f)
      if (!fs.existsSync(p)) return
      const content = fs.readFileSync(p, 'utf8')
      expect(content.startsWith('---\n')).toBe(true)
      expect(content).toContain('\n---\n')
    }
  })
})


describe('navtree naming', () => {
  test('test_nav_label_from_frontmatter_title', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(pages_dir(), 'specifications', '_meta.json'), 'utf8'))
    expect(meta['page-metadata']).toBe('Page Metadata')
  })

  test('test_nav_label_fallback_slug_to_title', () => {
    expect(slug_to_title('my-page')).toBe('My Page')
    expect(slug_to_title('getting_started')).toBe('Getting Started')
  })
})


describe('norm_path', () => {
  test('test_norm_path_strips_slashes', () => {
    expect(norm_path('/updates/')).toBe('updates')
    expect(norm_path('/')).toBe('')
  })
})
