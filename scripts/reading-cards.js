const markerName = 'MndReadingArticle'

function cardSummaries(frontmatter) {
  const summaries = frontmatter.reading_cards
  return summaries && typeof summaries === 'object' && !Array.isArray(summaries) && Object.keys(summaries).length
    ? summaries
    : null
}

function readingMarkup(body, summaries, importPath) {
  if (!summaries) return body
  return `\nimport ${markerName} from ${JSON.stringify(importPath)}\n\n<${markerName} summaries={${JSON.stringify(summaries)}} />\n\n${body}`
}

const indexedHeading = /^ {0,3}##[ \t]+(.+?)[ \t]+\[#([a-z0-9-]+)\][ \t]*(?:#+[ \t]*)?$/

function indexSections(markdown, summaries, toText) {
  if (!summaries) return []
  const cards = []
  let lines
  let fence
  for (const line of markdown.split(/\r?\n/)) {
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (delimiter && delimiter[1][0] === fence[0] &&
        delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = null
    } else if (delimiter) {
      fence = delimiter[1]
    } else if (/^ {0,3}##[ \t]+/.test(line)) {
      const match = line.match(indexedHeading)
      lines = match && Object.hasOwn(summaries, match[2]) ? [] : null
      if (lines) cards.push({ id: match[2], title: toText(match[1]), lines })
    }
    lines?.push(line)
  }
  return cards.map(({ id, title, lines }) => ({ id, title, text: toText(lines.join('\n')) }))
}

function textContent(node) {
  return node.type === 'text' ? node.value : (node.children || []).map(textContent).join('')
}

function isHeading(node) {
  return node.type === 'element' && node.tagName === 'h2'
}

// Pass original HAST nodes through Nextra's Markdown/MDX rendering, including heading IDs.
function readingCards() {
  return tree => {
    const marker = tree.children.find(node => node.type === 'mdxJsxFlowElement' && node.name === markerName)
    if (!marker) return

    const intro = []
    let card
    for (const node of tree.children) {
      if (node === marker) continue
      if (node.type === 'mdxjsEsm') {
        intro.push(node)
      } else if (isHeading(node) && node.properties.id) {
        // The visible card header owns the fragment even while its body is collapsed.
        const { id, ...properties } = node.properties
        card = {
          type: 'element',
          tagName: 'div',
          properties: { dataReadingId: id, dataReadingTitle: textContent(node) },
          children: [{ ...node, properties }],
        }
        marker.children.push(card)
      } else {
        (card ? card.children : intro).push(node)
      }
    }
    tree.children = marker.children.length ? [...intro, marker] : intro
  }
}

module.exports = readingCards
module.exports.cardSummaries = cardSummaries
module.exports.readingMarkup = readingMarkup
module.exports.indexSections = indexSections
