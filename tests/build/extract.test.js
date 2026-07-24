/**
 * Unit tests for NLP extraction: taggly query params, leaf metadata, bottom-up
 * aggregation, and related-page scoring. All taggly calls are mocked — no live service.
 */
const { extract_graph, extract_node, leaf_meta, aggregate, compute_related, mean_scores, union, query_string, TAGGLY_DEFAULTS } = require('../../scripts/extract')
const { build_page, root_node } = require('../../scripts/graph')

const CFG = {
  url: 'http://test', max_comparisons: 128, top_n_related: 3, taggly: TAGGLY_DEFAULTS,
}

// Canned taggly responses by command
const RESPONSES = {
  tag:   { tags: { concepts: ['c1', 'c2'], topics: ['t1'], keywords: ['k1', 'k2'] } },
  desc:  { description: 'A summary.' },
  polar: { scores: { negative: 0.1, neutral: 0.4, positive: 0.5 } },
  spam:  { score: 0.04 },
  tox:   { score: 0.002 },
  score: { scores: [0.9, 0.1] },
}

beforeEach(() => {
  global.fetch = jest.fn(url => {
    const cmd = url.split('/').pop().split('?')[0]
    return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSES[cmd]) })
  })
})
afterEach(() => { delete global.fetch })


describe('query_string', () => {
  test('test_query_string_builds_params', () => {
    /** Params serialize to a query string; empty params yield ''. */
    expect(query_string({ top_n: 8, normalize: true })).toBe('?top_n=8&normalize=true')
    expect(query_string({})).toBe('')
  })

  test('test_taggly_sends_configured_params', async () => {
    /** leaf_meta calls /tag with the configured concepts/top_n params. */
    await leaf_meta(CFG, 'some text')
    const tag_call = fetch.mock.calls.find(c => c[0].includes('/tag'))
    expect(tag_call[0]).toContain('top_n=10')
    expect(tag_call[0]).toContain('normalize=true')
  })
})


describe('leaf_meta', () => {
  test('test_leaf_meta_maps_all_fields', async () => {
    /** A leaf's content is scored into desc, concepts/topics/keywords, and metrics. */
    const meta = await leaf_meta(CFG, 'body text')
    expect(meta).toEqual({
      desc: 'A summary.',
      concepts: ['c1', 'c2'], topics: ['t1'], keywords: ['k1', 'k2'],
      polarity: { negative: 0.1, neutral: 0.4, positive: 0.5 }, spam: 0.04, toxicity: 0.002,
    })
  })
})


describe('aggregate', () => {
  test('test_aggregate_unions_tags_and_means_scores', async () => {
    /** Parent tag lists union+dedupe; scores average; desc re-summarizes child descs. */
    const metas = [
      { desc: 'a', concepts: ['x', 'y'], topics: ['t'], keywords: ['k'], polarity: { negative: 0, neutral: 1, positive: 0 }, spam: 0.1, toxicity: 0 },
      { desc: 'b', concepts: ['y', 'z'], topics: ['t'], keywords: ['j'], polarity: { negative: 0.2, neutral: 0.6, positive: 0.2 }, spam: 0.3, toxicity: 0.1 },
    ]
    const agg = await aggregate(CFG, metas)
    expect(agg.concepts).toEqual(['x', 'y', 'z'])   // union, first-seen order
    expect(agg.topics).toEqual(['t'])               // deduped
    expect(agg.spam).toBe(0.2)                       // mean
    expect(agg.polarity).toEqual({ negative: 0.1, neutral: 0.8, positive: 0.1 })
    expect(agg.desc).toBe('A summary.')             // /desc of combined child descs
  })
})


describe('extract_node — bottom-up', () => {
  test('test_extract_node_leaf_uses_own_content', async () => {
    /** A childless section gets metadata straight from its own content. */
    const node = { name: 'S', type: 'section', level: 2, content: 'text', children: [] }
    await extract_node(node, CFG)
    expect(node.desc).toBe('A summary.')
    expect(node.keywords).toEqual(['k1', 'k2'])
  })

  test('test_extract_node_parent_aggregates_children', async () => {
    /** A page with sections but no own intro aggregates its children (no leaf call for itself). */
    const node = { name: 'P', type: 'page', content: '', children: [
      { name: 'A', type: 'section', level: 2, content: 'a', children: [] },
      { name: 'B', type: 'section', level: 2, content: 'b', children: [] },
    ] }
    await extract_node(node, CFG)
    expect(node.children[0].desc).toBe('A summary.')  // leaves scored
    expect(node.topics).toEqual(['t1'])               // parent unioned from children
  })
})


describe('compute_related', () => {
  test('test_compute_related_scores_and_ranks', async () => {
    /** Each page is scored against the others; top_n_related attached, sorted by score. */
    const pages = [
      { name: 'A', url: '/a', desc: 'da' },
      { name: 'B', url: '/b', desc: 'db' },
      { name: 'C', url: '/c', desc: 'dc' },
    ]
    await compute_related(pages, { ...CFG, top_n_related: 1 })
    expect(pages[0].related).toHaveLength(1)
    expect(pages[0].related[0]).toMatchObject({ url: '/b', score: 0.9 })  // highest of [0.9, 0.1]
  })

  test('test_compute_related_empty_without_desc', async () => {
    /** A page without a description gets an empty related list and makes no score call. */
    const pages = [{ name: 'A', url: '/a', desc: '' }, { name: 'B', url: '/b', desc: 'db' }]
    await compute_related(pages, CFG)
    expect(pages[0].related).toEqual([])
  })
})


describe('mean_scores / union', () => {
  test('test_mean_scores_numbers_and_objects', () => {
    expect(mean_scores([0.1, 0.2, 0.6])).toBe(0.3)
    expect(mean_scores([{ a: 0.2 }, { a: 0.4 }])).toEqual({ a: 0.3 })
  })

  test('test_union_dedupes_preserving_order', () => {
    expect(union([['a', 'b'], ['b', 'c']])).toEqual(['a', 'b', 'c'])
  })
})


describe('extract_graph', () => {
  test('test_extract_graph_enriches_pages_and_related', async () => {
    /** End-to-end over a small graph: pages get metadata and related links. */
    const page = (slug) => build_page({ slug, title: slug, url: `/${slug}`, content: `# ${slug}\n\nintro\n\n## S\n\nbody\n` })
    const graph = root_node({ name: 'Site', children: [page('a'), page('b')] })
    await extract_graph(graph, CFG)
    expect(graph.children[0].desc).toBe('A summary.')
    expect(graph.children[0].related[0].url).toBe('/b')
  })
})
