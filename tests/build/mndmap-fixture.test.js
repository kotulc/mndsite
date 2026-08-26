/**
 * Cross-project fixture contract tests for mndmap destination ingestion.
 */
const fs   = require('fs')
const path = require('path')

const { load_config } = require('../../scripts/config')
const ingest = require('../../scripts/ingest')


const FIXTURE = path.join(__dirname, '../fixtures/mndmap-destination')
const ROOT_CFG = path.join(__dirname, '../../mndsite.yaml')


describe('mndmap fixture contract', () => {
  beforeAll(async () => {
    const cfg = load_config(path.join(FIXTURE, 'mndsite.yaml'))
    cfg.content = FIXTURE
    await ingest.run(cfg)
  })

  afterAll(async () => {
    await ingest.run(load_config(ROOT_CFG))
  })

  test('preserves nested folder structure', () => {
    expect(fs.existsSync(path.join(__dirname, '../../pages/docs/readme.mdx'))).toBe(true)
    expect(fs.existsSync(path.join(__dirname, '../../pages/docs/nested/child.mdx'))).toBe(true)
  })

  test('copies _assets to public/_assets', () => {
    expect(fs.existsSync(path.join(__dirname, '../../public/_assets/diagram.svg'))).toBe(true)
  })

  test('derives metadata from frontmatter only', () => {
    const { pages } = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/site-meta.json'), 'utf8'))
    const page = pages.find(p => p.url === '/docs/guide')
    expect(page.metrics.reading_time).toBe(3)
    expect(page.related).toEqual([{ url: '/docs/readme', name: 'Readme' }])
    expect(page.sections.every(s => Array.isArray(s.tags) && s.tags.length === 0)).toBe(true)
  })
})
