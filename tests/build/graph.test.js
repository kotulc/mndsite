/**
 * Unit tests for markdown text helpers and flat page meta construction.
 */
const { section_tree, word_count, extract_links } = require('../../scripts/text')
const { build_page, parse_user_tags, parse_desc, parse_reading_time, parse_related } = require('../../scripts/meta')


describe('section_tree', () => {
  test('test_section_tree_nests_by_level', () => {
    const { sections } = section_tree('## Alpha\n\nA text\n\n### Sub\n\nsub text\n\n## Beta\n\nB text\n')
    expect(sections.map(s => s.name)).toEqual(['Alpha', 'Beta'])
    expect(sections[0].children.map(s => s.name)).toEqual(['Sub'])
    expect(sections[0].content).toBe('A text')
    expect(sections[0].children[0].content).toBe('sub text')
  })

  test('test_section_tree_intro_before_first_heading', () => {
    const { intro, sections } = section_tree('lead text\n\n## One\n\nbody\n')
    expect(intro).toBe('lead text')
    expect(sections).toHaveLength(1)
  })

  test('test_section_tree_folds_deep_headings', () => {
    const { sections } = section_tree('## Top\n\n#### Deep\n\ntext\n')
    expect(sections).toHaveLength(1)
    expect(sections[0].children).toHaveLength(0)
    expect(sections[0].content).toContain('#### Deep')
  })

  test('test_section_tree_ignores_fenced_headings', () => {
    const { sections } = section_tree('## Real\n\n```\n## fake\n```\ntail\n')
    expect(sections.map(s => s.name)).toEqual(['Real'])
  })
})


describe('build_page', () => {
  const content = '# My Page\n\nIntro line with a [link](/other) and [example](https://example.com) here.\n\n' +
                  '## Section One\n\nSome words in the first section.\n'

  test('test_build_page_flat_fields', () => {
    const node = build_page({
      slug: 'my-page', title: 'My Page', url: '/my-page', content,
      published: '2026-01-15', created: '2026-07-20',
      fm: { tags: ['yaml'], reading_time: 4 },
    })
    expect(node).toMatchObject({
      name: 'My Page', url: '/my-page', slug: 'my-page',
      published: '2026-01-15', created: '2026-07-20',
    })
    expect(node.metrics.word_count).toBeGreaterThan(0)
    expect(node.metrics.reading_time).toBe(4)
    expect(node.links).toEqual(expect.arrayContaining(['/other', 'https://example.com']))
    expect(node.sections.map(s => s.name)).toEqual(['Section One'])
    expect(node.tags[0]).toMatchObject({ term: 'yaml', group: 'user' })
    expect(node.tags[0].score).toBeUndefined()
  })

  test('test_build_page_no_reading_time_when_absent', () => {
    const node = build_page({
      slug: 'p', title: 'P', url: '/p', content: '# P\n\nbody\n', fm: {},
    })
    expect(node.metrics.reading_time).toBeUndefined()
  })

  test('test_build_page_optional_desc', () => {
    const node = build_page({
      slug: 'p', title: 'P', url: '/p', content: '# P\n\nbody\n', fm: { desc: 'Hello' },
    })
    expect(node.desc).toBe('Hello')
  })
})


describe('parse helpers', () => {
  test('test_parse_user_tags_dedupes', () => {
    expect(parse_user_tags({ tags: ['a', 'B', 'a'] })).toEqual([
      { term: 'a', group: 'user' },
      { term: 'B', group: 'user' },
    ])
  })

  test('test_parse_desc_null_when_absent', () => {
    expect(parse_desc({})).toBeNull()
    expect(parse_desc({ description: '  ' })).toBeNull()
  })

  test('test_parse_reading_time_from_frontmatter', () => {
    expect(parse_reading_time({ reading_time: 3 })).toBe(3)
    expect(parse_reading_time({})).toBeNull()
  })

  test('test_parse_related_from_frontmatter', () => {
    expect(parse_related({ related: [{ url: '/a', title: 'A' }] }))
      .toEqual([{ url: '/a', name: 'A' }])
  })
})


describe('word_count / links', () => {
  test('test_word_count_ignores_code_fences', () => {
    expect(word_count('one two\n```\ncode here\n```\nthree')).toBe(3)
  })

  test('test_extract_links_skips_images', () => {
    expect(extract_links('![x](/img.png) [y](/page)')).toEqual(['/page'])
  })

  test('test_extract_links_skips_code_fences_and_fragments', () => {
    const md = [
      'See [Theme](#theme) and [Meta](/specifications/metadata).',
      '```yaml',
      'repo_url: https://github.com/myuser/my-repo',
      '```',
      'Also [GitHub](https://github.com/kotulc/mndsite).',
    ].join('\n')
    expect(extract_links(md)).toEqual([
      '/specifications/metadata',
      'https://github.com/kotulc/mndsite',
    ])
  })

  test('test_extract_links_ignores_bare_urls', () => {
    expect(extract_links('Visit https://example.com for more.')).toEqual([])
  })

  test('test_extract_links_strips_hash_on_internal_paths', () => {
    expect(extract_links('[Fields](/configuration#fields)')).toEqual(['/configuration'])
  })
})
