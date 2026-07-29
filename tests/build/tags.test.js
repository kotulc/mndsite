/**
 * Unit tests for local keyword extraction and embedding-based tagging.
 */
const {
  extract_keywords, tag_unit, cosine, fill_related, USER_GROUP,
  light_stem, overlaps_title, terms_conflict, filter_candidates,
} = require('../../scripts/tags')


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


describe('filter_candidates', () => {
  test('test_light_stem_collapses_plurals', () => {
    expect(light_stem('files')).toBe('file')
    expect(light_stem('file')).toBe('file')
    expect(light_stem('configs')).toBe('config')
  })

  test('test_overlaps_title_drops_header_words', () => {
    expect(overlaps_title('pipeline', 'What the pipeline does')).toBe(true)
    expect(overlaps_title('files', 'What the pipeline does')).toBe(false)
    expect(overlaps_title('pipeline steps', 'What the pipeline does')).toBe(true)
  })

  test('test_terms_conflict_catches_substring_and_shared_words', () => {
    expect(terms_conflict('file', 'files')).toBe(true)
    expect(terms_conflict('config', 'configuration')).toBe(true)
    expect(terms_conflict('yaml config', 'configuration')).toBe(true)
    expect(terms_conflict('yaml', 'pipeline')).toBe(false)
  })

  test('test_filter_candidates_applies_title_reserved_and_dedupe', () => {
    const kept = filter_candidates(
      ['pipeline', 'files', 'file', 'yaml', 'configuration', 'config', 'extract'],
      { title: 'What the pipeline does', reserved: ['yaml'] },
    )
    expect(kept).toEqual(['files', 'configuration', 'extract'])
  })
})


describe('tag_unit', () => {
  test('test_tag_unit_user_tags_first_with_user_group', async () => {
    const tags = await tag_unit({
      title: 'Getting Started',
      text: 'yaml extract pipeline documentation keywords topics concepts markdown site build',
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

  test('test_tag_unit_excludes_title_words_and_near_duplicates', async () => {
    const tags = await tag_unit({
      title: 'What the pipeline does',
      text: [
        'The pipeline copies files and each file is rewritten.',
        'files files files file file configuration config extract yaml markdown',
      ].join(' '),
      user_terms: [],
      max_keywords: 10,
      min_relevance: 0,
      embedder: fake_embedder,
    })
    const terms = tags.map(t => t.term)
    expect(terms).not.toContain('pipeline')
    expect(terms).not.toContain('does')
    expect(terms).not.toContain('what')
    // Prefer one of file/files, not both
    const file_like = terms.filter(t => /\bfiles?\b/.test(t))
    expect(file_like.length).toBeLessThanOrEqual(1)
    // Prefer one of config/configuration, not both
    const config_like = terms.filter(t => t.includes('config'))
    expect(config_like.length).toBeLessThanOrEqual(1)
  })

  test('test_tag_unit_drops_auto_tags_below_min_relevance', async () => {
    const tags = await tag_unit({
      title: 'zzzz',
      text: 'yaml extract pipeline documentation keywords topics concepts markdown site build',
      user_terms: ['keep-me'],
      max_keywords: 10,
      min_relevance: 0.99,
      embedder: fake_embedder,
    })
    expect(tags[0]).toMatchObject({ term: 'keep-me', group: USER_GROUP })
    expect(tags.slice(1).every(t => t.score >= 0.99)).toBe(true)
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
