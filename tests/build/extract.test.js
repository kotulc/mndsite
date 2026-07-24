/**
 * Unit tests for NLP extraction: taggly query params, tag/metric extraction, bottom-up
 * aggregation, page descriptions, related-page scoring, and config-hash cache
 * invalidation. Node-level helpers are tested against a stubbed `call` function; only
 * extract_graph exercises the real fetch-based taggly() client (mocked global.fetch).
 */
const {
  extract_graph, extract_node, node_tags, node_metrics, page_desc,
  aggregate_tags, aggregate_metrics, compute_related, compare_text,
  mean_scores, union, tags_string, config_hash, query_string,
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
  score: { scores: [0.9, 0.1] },
}

function make_call(overrides = {}) {
  /** A stubbed taggly caller returning canned responses per command. */
  return (cmd) => Promise.resolve(overrides[cmd] || RESPONSES[cmd])
}


describe('query_string', () => {
  test('test_query_string_builds_params', () => {
    /** Params serialize to a query string; empty params yield ''. */
    expect(query_string({ top_n: 8, normalize: true })).toBe('?top_n=8&normalize=true')
    expect(query_string({})).toBe('')
  })
})


describe('node_tags', () => {
  test('test_node_tags_maps_ext_ent_key_groups', async () => {
    /** ext concept groups, entities, and keywords all land under tags. */
    const tags = await node_tags(make_call(), CFG, 'body text')
    expect(tags).toEqual({
      categories: ['c1'], topics: ['t1'], concepts: ['x1', 'x2'],
      entities: ['e1', 'e2'], keywords: ['k1', 'k2'],
    })
  })

  test('test_node_tags_sends_native_top_n_for_ent_and_key', async () => {
    /** /ent and /key are called with max_entities/max_keywords as their own top_n —
     *  no separate selection call. */
    const call = jest.fn(make_call())
    await node_tags(call, CFG, 'body text')
    expect(call).toHaveBeenCalledWith('ent', expect.anything(), expect.objectContaining({ top_n: CFG.max_entities }))
    expect(call).toHaveBeenCalledWith('key', expect.anything(), expect.objectContaining({ top_n: CFG.max_keywords }))
  })

  test('test_node_tags_slices_ext_groups_to_max_concepts', async () => {
    /** /ext has no top_n of its own — each group is plain-sliced to max_concepts. */
    const call = make_call({ ext: { concepts: { topics: ['a', 'b', 'c', 'd'] } } })
    const tags = await node_tags(call, { ...CFG, max_concepts: 2 }, 'body text')
    expect(tags.topics).toEqual(['a', 'b'])
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


describe('tags_string / compare_text', () => {
  test('test_tags_string_flattens_all_groups', () => {
    /** All tag groups flatten into one comma-joined string. */
    expect(tags_string({ tags: { topics: ['a'], keywords: ['b', 'c'] } })).toBe('a, b, c')
    expect(tags_string({})).toBe('')
  })

  test('test_compare_text_prefers_desc_over_tags', () => {
    /** A page's description is used for comparison when present. */
    expect(compare_text({ desc: 'the desc', tags: { keywords: ['x'] } })).toBe('the desc')
  })

  test('test_compare_text_falls_back_to_tags_without_desc', () => {
    /** Without a description, the combined tag terms are used instead. */
    expect(compare_text({ desc: '', tags: { keywords: ['x', 'y'] } })).toBe('x, y')
  })
})


describe('compute_related', () => {
  test('test_compute_related_prefers_desc_scores_and_ranks', async () => {
    /** Pages with descriptions are compared by desc; results carry a similarity score. */
    const pages = [
      { name: 'A', url: '/a', desc: 'da' },
      { name: 'B', url: '/b', desc: 'db' },
      { name: 'C', url: '/c', desc: 'dc' },
    ]
    const call = jest.fn((cmd) => { expect(cmd).toBe('score'); return Promise.resolve(RESPONSES.score) })
    await compute_related(pages, call, { max_comparisons: 128, top_n_related: 1 })
    expect(call.mock.calls[0][1]).toEqual({ query: 'da', candidates: ['db', 'dc'] })
    expect(pages[0].related).toEqual([{ name: 'B', url: '/b', score: 0.9 }])
  })

  test('test_compute_related_falls_back_to_tags_without_desc', async () => {
    /** Pages without descriptions compare by their combined tag terms instead. */
    const pages = [
      { name: 'A', url: '/a', tags: { keywords: ['x'] } },
      { name: 'B', url: '/b', tags: { keywords: ['y'] } },
    ]
    const call = jest.fn(() => Promise.resolve({ scores: [0.5] }))
    await compute_related(pages, call, { max_comparisons: 128, top_n_related: 1 })
    expect(call.mock.calls[0][1]).toEqual({ query: 'x', candidates: ['y'] })
    expect(pages[0].related).toEqual([{ name: 'B', url: '/b', score: 0.5 }])
  })

  test('test_compute_related_empty_without_desc_or_tags', async () => {
    /** A page with neither desc nor tags gets an empty related list and makes no call. */
    const call = jest.fn()
    const pages = [{ name: 'A', url: '/a' }, { name: 'B', url: '/b', desc: 'db' }]
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


describe('config_hash', () => {
  test('test_config_hash_stable_for_identical_relevant_fields', () => {
    /** Two configs differing only in irrelevant fields (url, strict) hash the same. */
    expect(config_hash(CFG)).toBe(config_hash({ ...CFG, url: 'http://other', strict: false }))
  })

  test('test_config_hash_changes_with_relevant_field', () => {
    /** Changing a field that affects computed output changes the hash. */
    expect(config_hash(CFG)).not.toBe(config_hash({ ...CFG, max_keywords: 99 }))
  })
})


describe('extract_graph', () => {
  function mock_fetch() {
    global.fetch = jest.fn((url, opts) => {
      const cmd = url.split('/').pop().split('?')[0]
      return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSES[cmd]) })
    })
  }
  afterEach(() => { delete global.fetch })

  test('test_extract_graph_enriches_pages_and_related', async () => {
    /** End-to-end over a small graph: pages get tags/metrics/desc and related scores. */
    mock_fetch()
    const page = (slug) => build_page({ slug, title: slug, url: `/${slug}`, content: `# ${slug}\n\nintro\n\n## S\n\nbody\n` })
    const graph = root_node({ name: 'Site', children: [page('a'), page('b')] })
    await extract_graph(graph, CFG, () => {})
    expect(graph.children[0].tags.keywords).toEqual(['k1', 'k2'])
    expect(graph.children[0].desc).toBe('A summary.')
    expect(graph.children[0].related[0]).toMatchObject({ url: '/b', score: 0.9 })
    expect(graph.children[0].updated).toEqual(expect.any(String))
    expect(graph.extract_config).toBe(config_hash(CFG))
  })

  test('test_extract_graph_skips_pages_with_unchanged_hash', async () => {
    /** A page whose hash matches the previous graph is copied forward, not re-extracted. */
    mock_fetch()
    const page = build_page({ slug: 'a', title: 'a', url: '/a', content: '# a\n\nintro\n' })
    const graph = root_node({ name: 'Site', children: [page] })
    const previous = {
      '/a': { ...page, tags: { keywords: ['cached'] }, metrics: { spam: 0.5 }, desc: 'cached desc', updated: '2020-01-01T00:00:00.000Z' },
    }
    await extract_graph(graph, CFG, () => {}, previous, config_hash(CFG))
    expect(graph.children[0].tags).toEqual({ keywords: ['cached'] })
    expect(graph.children[0].desc).toBe('cached desc')
    expect(graph.children[0].updated).toBe('2020-01-01T00:00:00.000Z')
    expect(fetch).not.toHaveBeenCalled()   // single page, no peers to compare for related
  })

  test('test_extract_graph_reextracts_all_when_config_changed', async () => {
    /** A changed extract config invalidates the content-hash cache for every page,
     *  even when content itself is unchanged. */
    mock_fetch()
    const page = build_page({ slug: 'a', title: 'a', url: '/a', content: '# a\n\nintro\n' })
    const graph = root_node({ name: 'Site', children: [page] })
    const previous = {
      '/a': { ...page, tags: { keywords: ['cached'] }, metrics: { spam: 0.5 }, desc: 'cached desc', updated: '2020-01-01T00:00:00.000Z' },
    }
    await extract_graph(graph, CFG, () => {}, previous, 'a-different-config-hash')
    expect(graph.children[0].tags.keywords).toEqual(['k1', 'k2'])   // freshly extracted, not cached
    expect(graph.children[0].desc).toBe('A summary.')
    expect(fetch).toHaveBeenCalled()
  })
})
