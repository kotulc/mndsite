const markerName = 'MndReadingArticle'

function readingDepth(frontmatter, config = {}) {
  if (config.reading_cards === false || frontmatter.reading_cards === false) return 0
  const depth = frontmatter.reading_cards_depth ?? config.reading_cards?.max_depth
  if (depth != null) {
    if (depth !== 2 && depth !== 3) throw new Error('reading_cards_depth must be 2 or 3')
    return depth
  }
  const previews = frontmatter.reading_cards
  return previews && typeof previews === 'object' && !Array.isArray(previews) && Object.keys(previews).length ? 2 : 0
}

function readingMarkup(body, depth, summaries, importPath) {
  if (!depth) return body
  const previews = summaries && typeof summaries === 'object' && !Array.isArray(summaries) ? summaries : {}
  return `\nimport ${markerName} from ${JSON.stringify(importPath)}\n\n<${markerName} depth="${depth}" summaries={${JSON.stringify(previews)}} />\n\n${body}`
}

function textContent(node) {
  return node.type === 'text' ? node.value : (node.children || []).map(textContent).join('')
}

function sectionsFor(tree) {
  const marker = tree.children.find(node => node.type === 'mdxJsxFlowElement' && node.name === markerName)
  if (!marker) return null
  const maxDepth = Number(marker.attributes.find(attribute => attribute.name === 'depth')?.value)
  const intro = []
  const roots = []
  const stack = []

  for (const node of tree.children) {
    if (node === marker) continue
    if (node.type === 'mdxjsEsm') {
      intro.push(node)
      continue
    }
    const level = node.type === 'element' ? Number(/^h([1-6])$/.exec(node.tagName)?.[1]) : NaN
    while (level >= 2 && stack.length && stack.at(-1).level >= level) stack.pop()
    if (node.properties?.id && level >= 2 && level <= maxDepth && (level === 2 || stack.length)) {
      const section = { id: node.properties.id, title: textContent(node), level, heading: node, body: [] }
      ;(stack.length ? stack.at(-1).body : roots).push(section)
      stack.push(section)
    } else {
      ;(stack.length ? stack.at(-1).body : intro).push(node)
    }
  }
  return { marker, intro, roots }
}

function cardNode({ id, title, heading, body }) {
  // The visible disclosure header owns the original fragment, even when closed.
  const properties = { ...heading.properties }
  delete properties.id
  return {
    type: 'element',
    tagName: 'div',
    properties: { dataReadingId: id, dataReadingTitle: title },
    children: [{ ...heading, properties }, ...body.map(node => node.heading ? cardNode(node) : node)],
  }
}

function readingCards() {
  return tree => {
    const sections = sectionsFor(tree)
    if (!sections) return
    const { marker, intro, roots } = sections
    marker.children = roots.map(cardNode)
    tree.children = roots.length ? [...intro, marker] : intro
  }
}

function sectionIndex(tree) {
  const sections = sectionsFor(tree)
  const cards = []

  function index({ id, title, level, body }, parents) {
    const text = [title, ...body.filter(node => !node.heading).map(textContent)].join(' ').replace(/\s+/g, ' ').trim()
    cards.push({ id, title, level, parents, text })
    for (const child of body.filter(node => node.heading)) index(child, [...parents, title])
  }

  for (const section of sections?.roots || []) index(section, [])
  return cards
}

module.exports = readingCards
module.exports.readingDepth = readingDepth
module.exports.readingMarkup = readingMarkup
module.exports.sectionIndex = sectionIndex
