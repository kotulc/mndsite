import fs from 'node:fs'
import { compileMdx } from 'nextra/compile'
import readingCards from './reading-cards.js'

const files = JSON.parse(fs.readFileSync(0, 'utf8'))
const entries = []

for (const filePath of files) {
  let cards = []
  // Reuse Nextra's heading slugs and the renderer's grouping, skipping code highlighting.
  await compileMdx(fs.readFileSync(filePath, 'utf8'), {
    filePath,
    codeHighlight: false,
    mdxOptions: {
      outputFormat: 'program',
      rehypePlugins: [() => tree => {
        cards = readingCards.sectionIndex(tree)
      }],
    },
  })
  entries.push(cards)
}

process.stdout.write(JSON.stringify(entries))
