/**
 * Unit tests for structural site-graph construction: section nesting, page node
 * fields, link extraction, and page flattening. Pure — no taggly service involved.
 */
const { section_tree, build_page, extract_links, word_count, flatten_pages, root_node, folder_node } = require('../../scripts/graph')


describe('section_tree', () => {
  test('test_section_tree_nests_by_level', () => {
    /** ## start top sections; ### nest beneath the current ##. */
    const { sections } = section_tree('## Alpha\n\nA text\n\n### Sub\n\nsub text\n\n## Beta\n\nB text\n')
    expect(sections.map(s => s.name)).toEqual(['Alpha', 'Beta'])
    expect(sections[0].children.map(s => s.name)).toEqual(['Sub'])
    expect(sections[0].content).toBe('A text')
    expect(sections[0].children[0].content).toBe('sub text')
  })

  test('test_section_tree_intro_before_first_heading', () => {
    /** Text before the first ## is returned as intro, not a section. */
    const { intro, sections } = section_tree('lead text\n\n## One\n\nbody\n')
    expect(intro).toBe('lead text')
    expect(sections).toHaveLength(1)
  })

  test('test_section_tree_folds_deep_headings', () => {
    /** Headings deeper than ### fold into their section content, not new nodes. */
    const { sections } = section_tree('## Top\n\n#### Deep\n\ntext\n')
    expect(sections).toHaveLength(1)
    expect(sections[0].children).toHaveLength(0)
    expect(sections[0].content).toContain('#### Deep')
  })

  test('test_section_tree_ignores_fenced_headings', () => {
    /** ## lines inside code fences are not section boundaries. */
    const { sections } = section_tree('## Real\n\n```\n## fake\n```\ntail\n')
    expect(sections.map(s => s.name)).toEqual(['Real'])
  })

  test('test_section_tree_handles_crlf', () => {
    /** CRLF line endings parse the same as LF. */
    const { sections } = section_tree('## Alpha\r\n\r\ntext\r\n\r\n### Sub\r\n\r\nx\r\n')
    expect(sections.map(s => s.name)).toEqual(['Alpha'])
    expect(sections[0].children.map(s => s.name)).toEqual(['Sub'])
  })
})


describe('build_page', () => {
  const content = '# My Page\n\nIntro line with a [link](/other) and https://example.com here.\n\n' +
                  '## Section One\n\nSome words in the first section.\n'

  test('test_build_page_structural_fields', () => {
    /** A page node carries name, url, slug, dates, counts, links, intro, sections. */
    const node = build_page({ slug: 'my-page', title: 'My Page', url: '/my-page', content, date: '2026-01-15', created: '2026-07-20' })
    expect(node).toMatchObject({ name: 'My Page', type: 'page', url: '/my-page', slug: 'my-page', date: '2026-01-15', created: '2026-07-20' })
    expect(node.word_count).toBeGreaterThan(0)
    expect(node.reading_time).toBeGreaterThanOrEqual(1)
    expect(node.children.map(s => s.name)).toEqual(['Section One'])
    expect(node.content).toContain('Intro line')  // intro is text before first ##
  })

  test('test_build_page_strips_title_from_body', () => {
    /** The leading title h1 is not treated as a section or included in intro headings. */
    const node = build_page({ slug: 'p', title: 'My Page', url: '/p', content })
    expect(node.content.startsWith('# My Page')).toBe(false)
  })

  test('test_build_page_extracts_links', () => {
    /** Both markdown link hrefs and bare URLs are collected, deduped. */
    const node = build_page({ slug: 'p', title: 'P', url: '/p', content })
    expect(node.links).toEqual(expect.arrayContaining(['/other', 'https://example.com']))
  })
})


describe('content_hash (via build_page)', () => {
  test('test_hash_changes_with_content_and_matches_identical_content', () => {
    /** Change detection: same content hashes identically, different content differs. */
    const a = build_page({ slug: 'p', title: 'P', url: '/p', content: '# P\n\nbody one\n' })
    const b = build_page({ slug: 'p', title: 'P', url: '/p', content: '# P\n\nbody two\n' })
    const c = build_page({ slug: 'p', title: 'P', url: '/p', content: '# P\n\nbody one\n' })
    expect(a.hash).not.toBe(b.hash)
    expect(a.hash).toBe(c.hash)
  })
})


describe('extract_links', () => {
  test('test_extract_links_excludes_images', () => {
    /** Image refs (![...]) are not collected as links. */
    const links = extract_links('![alt](/img.png) and [text](/page)')
    expect(links).toContain('/page')
    expect(links).not.toContain('/img.png')
  })
})


describe('word_count', () => {
  test('test_word_count_ignores_code_and_syntax', () => {
    /** Code fences and markdown punctuation do not inflate the word count. */
    expect(word_count('one two three')).toBe(3)
    expect(word_count('word\n\n```\nlots of code here\n```\n')).toBe(1)
  })
})


describe('flatten_pages', () => {
  test('test_flatten_pages_collects_pages_in_order', () => {
    /** Page nodes are collected depth-first; folders and sections are not pages. */
    const page = (slug) => build_page({ slug, title: slug, url: `/${slug}`, content: `# ${slug}\n\nbody\n` })
    const graph = root_node({ name: 'Site', children: [
      page('a'),
      folder_node({ name: 'F', url: '/f', slug: 'f', children: [page('b')] }),
    ] })
    expect(flatten_pages(graph).map(p => p.slug)).toEqual(['a', 'b'])
  })
})
