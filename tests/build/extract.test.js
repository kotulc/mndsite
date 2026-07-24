/**
 * Unit tests for NLP extraction: taggly query params, tag/metric extraction, rank-based
 * trimming, bottom-up aggregation, page descriptions, and related-page ranking. Node-level
 * helpers are tested against a stubbed `call` function; only extract_graph exercises the
 * real fetch-based taggly() client (mocked global.fetch) end-to-end.
 */
const {
  extract_graph, extract_node, node_tags, node_metrics, page_desc,
  aggregate_tags, aggregate_metrics, compute_related, rank_select,
  mean_scores, union, tags_string, query_string,
} = require('../../scripts/extract')
const { build_page, root_node } = require('../../scripts/graph')

const CFG = {
  url: 'http://test', max_comparisons: 128, top_n_related: 3,
  extract_descriptions: true,
  extract_concepts: ['categories', 'topics', 'concepts'],
  max_concepts: 8, max_keywords: 32, max_entities: 8,
  score_polarity: true, score_toxicity: true, score_spam: true,
}

// Canned taggly responses by command
const RESPONSES = {
  ext:   { concepts: { categories: ['c1'], topics: ['t1'], concepts: ['x1', 'x2'] } },
  ent:   { entities: ['e1', 'e2'] },
  key:   { keywords: ['k1', 'k2'] },
  desc:  { description: 'A summary.' },
  polar: { scores: { negative: 0.1, neutral: 0.4, positive: 0.5 } },
  spam:  { score: 0.04 },
  tox:   { score: 0.002 },
}

function make_call(overrides = {}) {
  /** A stubbed taggly caller: canned responses per command, with a default rank
   *  behavior (passes the first top_n candidates through) unless overridden. */
  return (cmd, body, params) => {
    if (overrides[cmd]) return Promise.resolve(overrides[cmd])
    if (cmd === 'rank') return Promise.resolve({ ranked: body.candidates.slice(0, params.top_n) })
    return Promise.resolve(RESPONSES[cmd])
  }
}


describe('query_string', () => {
  test('test_query_string_builds_params', () => {
    /** Params serialize to a query string; empty params yield ''. */
    expect(query_string({ top_n: 8, normalize: true })).toBe('?top_n=8&normalize=true')
    expect(query_string({})).toBe('')
  })
})


describe('rank_select', () => {
  test('test_rank_select_passes_through_when_within_limit', async () => {
    /** No rank call is made when the raw result already fits the limit. */
    const call = jest.fn()
    const result = await rank_select(call, 'prose', ['a', 'b'], 5, 128)
    expect(result).toEqual(['a', 'b'])
    expect(call).not.toHaveBeenCalled()
  })

  test('test_rank_select_trims_via_rank_when_over_limit', async () => {
    /** Over the limit, rank is called with the source text as query and top_n set. */
    const call = jest.fn((cmd, body, params) => {
      expect(cmd).toBe('rank')
      expect(body.query).toBe('prose')
      expect(params.top_n).toBe(2)
      return Promise.resolve({ ranked: ['a', 'b'] })
    })
    const result = await rank_select(call, 'prose', ['a', 'b', 'c', 'd'], 2, 128)
    expect(result).toEqual(['a', 'b'])
  })
})


describe('node_tags', () => {
  test('test_node_tags_maps_ext_ent_key_groups', async () => {
    /** ext concept groups, entities, and keywords all land under tags, each within limits. */
    const tags = await node_tags(make_call(), CFG, 'body text')
    expect(tags).toEqual({
      categories: ['c1'], topics: ['t1'], concepts: ['x1', 'x2'],
      entities: ['e1', 'e2'], keywords: ['k1', 'k2'],
    })
  })

  test('test_node_tags_skips_ext_when_extract_concepts_empty', async () => {
    /** An empty extract_concepts list disables the /ext call entirely. */
    const call = jest.fn(make_call())
    const tags = await node_tags(call, { ...CFG, extract_concepts: [] }, 'body text')
    expect(tags).toEqual({ entities: ['e1', 'e2'], keywords: ['k1', 'k2'] })
    expect(call).not.toHaveBeenCalledWith('ext', expect.anything(), expect.anything())
  })

  test('test_node_tags_null_for_empty_content', async () => {
    /** No content, no calls. */
    const call = jest.fn()
    expect(await node_tags(call, CFG, '   ')).toBeNull()
    expect(call).not.toHaveBeenCalled()
  })
})


describe('node_metrics', () => {
  test('test_node_metrics_respects_score_toggles', async () => {
    /** Each metric is individually gated by its score_* config flag. */
    const metrics = await node_metrics(make_call(), { ...CFG, score_spam: false }, 'text')
    expect(metrics).toEqual({
      polarity: RESPONSES.polar.scores,
      toxicity: RESPONSES.tox.score,
    })
  })
})


describe('aggregate_tags / aggregate_metrics', () => {
  test('test_aggregate_tags_unions_each_group', () => {
    /** Each tag group unions across children, deduped, first-seen order. */
    const metas = [
      { tags: { topics: ['a', 'b'], keywords: ['k'] } },
      { tags: { topics: ['b', 'c'], entities: ['e'] } },
    ]
    expect(aggregate_tags(metas)).toEqual({ topics: ['a', 'b', 'c'], keywords: ['k'], entities: ['e'] })
  })

  test('test_aggregate_metrics_means_each_key', () => {
    /** Each metric key averages independently across children. */
    const metas = [
      { metrics: { spam: 0.1, toxicity: 0 } },
      { metrics: { spam: 0.3, toxicity: 0.1 } },
    ]
    expect(aggregate_metrics(metas)).toEqual({ spam: 0.2, toxicity: 0.05 })
  })
})


describe('extract_node — bottom-up', () => {
  test('test_extract_node_leaf_uses_own_content', async () => {
    /** A childless section gets tags/metrics straight from its own content. */
    const node = { name: 'S', type: 'section', level: 2, content: 'text', children: [] }
    await extract_node(node, make_call(), CFG)
    expect(node.tags.keywords).toEqual(['k1', 'k2'])
    expect(node.metrics.spam).toBe(0.04)
  })

  test('test_extract_node_parent_aggregates_children', async () => {
    /** A page with sections but no own intro aggregates its children (no leaf call for itself). */
    const node = {
      name: 'P', type: 'page', content: '', children: [
        { name: 'A', type: 'section', level: 2, content: 'a', children: [] },
        { name: 'B', type: 'section', level: 2, content: 'b', children: [] },
      ],
    }
    await extract_node(node, make_call(), CFG)
    expect(node.tags.topics).toEqual(['t1'])   // unioned from both children (deduped)
    expect(node.metrics.spam).toBe(0.04)       // mean of equal children values
  })
})


describe('page_desc', () => {
  test('test_page_desc_uses_full_page_text_not_tags', async () => {
    /** desc is generated from the page's own content plus all descendant section content. */
    const page = { content: 'intro', children: [{ content: 'section body', children: [] }] }
    const call = jest.fn((cmd, body) => {
      expect(cmd).toBe('desc')
      expect(body.content).toContain('intro')
      expect(body.content).toContain('section body')
      return Promise.resolve(RESPONSES.desc)
    })
    await page_desc(call, page)
    expect(page.desc).toBe('A summary.')
  })

  test('test_page_desc_empty_for_empty_page', async () => {
    /** No content anywhere in the page: desc is '' and no call is made. */
    const call = jest.fn()
    const page = { content: '', children: [] }
    await page_desc(call, page)
    expect(page.desc).toBe('')
    expect(call).not.toHaveBeenCalled()
  })
})


describe('tags_string', () => {
  test('test_tags_string_flattens_all_groups', () => {
    /** All tag groups flatten into one comma-joined string for rank comparison. */
    expect(tags_string({ tags: { topics: ['a'], keywords: ['b', 'c'] } })).toBe('a, b, c')
    expect(tags_string({})).toBe('')
  })
})


describe('compute_related', () => {
  test('test_compute_related_ranks_by_tag_terms', async () => {
    /** Pages are compared by their combined tag terms via rank, not description. */
    const pages = [
      { name: 'A', url: '/a', tags: { keywords: ['x'] } },
      { name: 'B', url: '/b', tags: { keywords: ['y'] } },
      { name: 'C', url: '/c', tags: { keywords: ['z'] } },
    ]
    const call = jest.fn((cmd, body, params) => {
      expect(cmd).toBe('rank')
      expect(params.top_n).toBe(1)
      return Promise.resolve({ ranked: [body.candidates[0]] })
    })
    await compute_related(pages, call, { max_comparisons: 128, top_n_related: 1 })
    expect(pages[0].related).toEqual([{ name: 'B', url: '/b' }])
  })

  test('test_compute_related_empty_without_tags', async () => {
    /** A page with no tags gets an empty related list and makes no rank call. */
    const call = jest.fn()
    const pages = [{ name: 'A', url: '/a', tags: {} }, { name: 'B', url: '/b', tags: { keywords: ['y'] } }]
    await compute_related(pages, call, { max_comparisons: 128, top_n_related: 1 })
    expect(pages[0].related).toEqual([])
    expect(call).not.toHaveBeenCalled()
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
  function mock_fetch() {
    global.fetch = jest.fn((url, opts) => {
      const cmd = url.split('/').pop().split('?')[0]
      if (cmd === 'rank') {
        const { candidates } = JSON.parse(opts.body)
        const top_n = Number(new URL(url).searchParams.get('top_n')) || candidates.length
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ranked: candidates.slice(0, top_n) }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSES[cmd]) })
    })
  }
  afterEach(() => { delete global.fetch })

  test('test_extract_graph_enriches_pages_and_related', async () => {
    /** End-to-end over a small graph: pages get tags/metrics/desc and related links. */
    mock_fetch()
    const page = (slug) => build_page({ slug, title: slug, url: `/${slug}`, content: `# ${slug}\n\nintro\n\n## S\n\nbody\n` })
    const graph = root_node({ name: 'Site', children: [page('a'), page('b')] })
    await extract_graph(graph, CFG, () => {})
    expect(graph.children[0].tags.keywords).toEqual(['k1', 'k2'])
    expect(graph.children[0].desc).toBe('A summary.')
    expect(graph.children[0].related[0].url).toBe('/b')
    expect(graph.children[0].updated).toEqual(expect.any(String))
  })

  test('test_extract_graph_skips_pages_with_unchanged_hash', async () => {
    /** A page whose hash matches the previous graph is copied forward, not re-extracted. */
    mock_fetch()
    const page = build_page({ slug: 'a', title: 'a', url: '/a', content: '# a\n\nintro\n' })
    const graph = root_node({ name: 'Site', children: [page] })
    const previous = {
      '/a': { ...page, tags: { keywords: ['cached'] }, metrics: { spam: 0.5 }, desc: 'cached desc', updated: '2020-01-01T00:00:00.000Z' },
    }
    await extract_graph(graph, CFG, () => {}, previous)
    expect(graph.children[0].tags).toEqual({ keywords: ['cached'] })
    expect(graph.children[0].desc).toBe('cached desc')
    expect(graph.children[0].updated).toBe('2020-01-01T00:00:00.000Z')
    expect(fetch).not.toHaveBeenCalled()   // single page, no peers to compare for related
  })
})
