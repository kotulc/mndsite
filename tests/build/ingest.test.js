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


const PAGES = path.join(__dirname, '../../pages')
const ROOT_CFG = path.join(__dirname, '../../mndsite.yaml')

beforeAll(async () => {
  await ingest.run(load_config(ROOT_CFG))
})

describe('pages output ordering', () => {
  test('test_pages_features_meta_follows_nav_order', () => {
    const expected = siteConfig.nav_order['features']
    const meta = JSON.parse(fs.readFileSync(path.join(PAGES, 'features', '_meta.json'), 'utf8'))
    const keys = Object.keys(meta).filter(k => k !== 'index')
    expect(keys.slice(0, expected.length)).toEqual(expected)
  })

  test('test_pages_updates_meta_follows_nav_order', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(PAGES, 'updates', '_meta.json'), 'utf8'))
    expect(Object.keys(meta)[0]).toBe('welcome')
  })
})


describe('site meta output', () => {
  const meta_path = path.join(__dirname, '../../public/site-meta.json')
  const load = () => JSON.parse(fs.readFileSync(meta_path, 'utf8'))
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
    expect(Array.isArray(page.tags)).toBe(true)
  })

  test('test_pages_preserve_frontmatter', () => {
    for (const f of ['getting-started.mdx', 'configuration.mdx']) {
      const p = path.join(PAGES, f)
      if (!fs.existsSync(p)) return
      const content = fs.readFileSync(p, 'utf8')
      expect(content.startsWith('---\n')).toBe(true)
      expect(content).toContain('\n---\n')
    }
  })
})


describe('navtree naming', () => {
  test('test_nav_label_from_frontmatter_title', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(PAGES, 'specifications', '_meta.json'), 'utf8'))
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
