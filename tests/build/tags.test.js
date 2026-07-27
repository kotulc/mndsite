/**
 * Unit tests for local keyword extraction and embedding-based tagging.
 */
const { extract_keywords, tag_unit, cosine, fill_related, USER_GROUP } = require('../../scripts/tags')


async function fake_embedder(texts) {
  return texts.map(t => {
    const v = new Array(8).fill(0)
    const s = String(t)
    for (let i = 0; i < s.length; i++) v[i % 8] += s.charCodeAt(i) / 1000
    const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1
    return v.map(x => x / n)
  })
}


describe('extract_keywords', () => {
  test('test_extract_keywords_returns_top_terms', () => {
    const text = 'configuration yaml configuration extract yaml pipeline extract configuration'
    const terms = extract_keywords(text, 3)
    expect(terms[0]).toBe('configuration')
    expect(terms).toHaveLength(3)
  })
})


describe('tag_unit', () => {
  test('test_tag_unit_user_tags_first_with_user_group', async () => {
    const tags = await tag_unit({
      title: 'Configuration',
      text: 'yaml extract pipeline configuration documentation keywords topics concepts',
      user_terms: ['my-tag'],
      max_keywords: 10,
      page_tags: 5,
      embedder: fake_embedder,
    })
    expect(tags[0]).toMatchObject({ term: 'my-tag', group: USER_GROUP })
    expect(tags[0].score).toBeGreaterThanOrEqual(0)
    expect(tags.length).toBeGreaterThan(1)
    expect(tags.slice(1).every(t => t.group !== USER_GROUP || t.term === 'my-tag')).toBe(true)
  })
})


describe('fill_related', () => {
  test('test_fill_related_picks_top_n_by_similarity', async () => {
    /** Controlled vectors: page 0 close to 1, far from 2. */
    const vecs = {
      'A. shared topic. alpha': [1, 0, 0],
      'B. shared topic. alpha': [0.99, 0.1, 0],
      'C. other stuff. zeta': [0, 1, 0],
    }
    const embedder = async (texts) => texts.map(t => {
      const v = vecs[t] || [0, 0, 1]
      const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1
      return v.map(x => x / n)
    })
    const pages = [
      { name: 'A', url: '/a', desc: 'shared topic', tags: [{ term: 'alpha' }], links: [] },
      { name: 'B', url: '/b', desc: 'shared topic', tags: [{ term: 'alpha' }], links: [] },
      { name: 'C', url: '/c', desc: 'other stuff', tags: [{ term: 'zeta' }], links: [] },
    ]
    await fill_related(pages, { related_links: 1, embedder })
    expect(pages[0].related).toHaveLength(1)
    expect(pages[0].related[0]).toMatchObject({ url: '/b', name: 'B' })
    expect(typeof pages[0].related[0].score).toBe('number')
  })

  test('test_fill_related_skips_existing_links', async () => {
    const embedder = async (texts) => texts.map(() => [1, 0, 0])
    const pages = [
      { name: 'A', url: '/a', tags: [{ term: 'x' }], links: ['/b'] },
      { name: 'B', url: '/b', tags: [{ term: 'x' }], links: [] },
      { name: 'C', url: '/c', tags: [{ term: 'x' }], links: [] },
    ]
    await fill_related(pages, { related_links: 5, embedder })
    expect(pages[0].related.map(r => r.url)).not.toContain('/b')
    expect(pages[0].related.map(r => r.url)).toContain('/c')
  })
})


describe('cosine', () => {
  test('test_cosine_identical_vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
  })
})
