/**
 * Cross-project fixture contract tests for mndmap destination ingestion.
 * Builds into a temp root so the repo's own generated pages/ stay untouched.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { load_config } = require('../../scripts/config')
const ingest = require('../../scripts/ingest')


const FIXTURE = path.join(__dirname, '../fixtures/mndmap-destination')
let root


describe('mndmap fixture contract', () => {
  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-fixture-'))
    const cfg = load_config(path.join(FIXTURE, 'mndsite.yaml'))
    await ingest.run({ ...cfg, content: FIXTURE, root })
  })

  afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

  test('preserves nested folder structure', () => {
    expect(fs.existsSync(path.join(root, 'pages/docs/readme.mdx'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'pages/docs/nested/child.mdx'))).toBe(true)
  })

  test('copies _assets to public/_assets', () => {
    expect(fs.existsSync(path.join(root, 'public/_assets/diagram.svg'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'public/_assets/widget.ts'))).toBe(true)
  })

  test('preserves supplied frontmatter on emitted pages', () => {
    const page = fs.readFileSync(path.join(root, 'pages/docs/guide.mdx'), 'utf8')
    expect(page.startsWith('---\n')).toBe(true)
    expect(page).toContain('source_id: mndmap-0042')
    expect(page).toContain('# Guide')
  })

  test('emits no extension links', () => {
    const page = fs.readFileSync(path.join(root, 'pages/docs/readme.mdx'), 'utf8')
    expect(page).toContain('](/docs/guide)')
    expect(page).not.toMatch(/\]\(\S+\.mdx?\)/)
  })

  test('rewrites _assets svg to a base-path aware image', () => {
    const page = fs.readFileSync(path.join(root, 'pages/docs/readme.mdx'), 'utf8')
    expect(page).toContain('process.env.NEXT_PUBLIC_BASE_PATH')
    expect(page).toContain('/_assets/diagram.svg`}')
  })

  test('derives metadata from frontmatter only', () => {
    const { pages } = JSON.parse(fs.readFileSync(path.join(root, 'public/site-meta.json'), 'utf8'))
    const page = pages.find(p => p.url === '/docs/guide')
    expect(page.metrics.reading_time).toBe(3)
    expect(page.related).toEqual([{ url: '/docs/readme', name: 'Readme' }])
    expect(page.sections.every(s => Array.isArray(s.tags) && s.tags.length === 0)).toBe(true)
  })
})
