import { render, screen, waitFor } from '@testing-library/react'
import Browse from '../../components/Browse'

let mockText
jest.mock('../../components/SiteSearch', () => ({
  useSiteSearch: () => ({ basePath: '', query: {}, text: mockText }),
}))
jest.mock('../../public/site-meta.json', () => ({
  browse: '/browse',
  pages: [{
    name: 'Deployment notes',
    desc: 'A short overview.',
    url: '/guides/release',
    facets: { tags: ['stable'] },
  }],
}))
jest.mock('../../site.config', () => ({
  frontmatter: { facets: { tags: { key: ['tags'], label: 'Tags' } } },
}))

const originalFetch = global.fetch
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      '/guides/release': 'Unrelated introduction. '.repeat(12) +
        'Build the C++ tools before publishing the release. ' + 'Further reading. '.repeat(12),
    }),
  })
})
afterEach(() => { global.fetch = originalFetch })

test('shows a short body excerpt and marks a literal, case-insensitive match', async () => {
  mockText = 'c++ tools'
  render(<Browse />)

  const result = await screen.findByRole('listitem')
  expect(result.querySelector('p')).toHaveTextContent('Build the C++ tools before publishing')
  expect(result.querySelector('p')).not.toHaveTextContent('A short overview.')
  expect(result.querySelector('p').textContent.length).toBeLessThan(200)
  expect([...result.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['C++', 'tools'])
})

test.each([
  ['deployment', 'a[href*="/guides/release"] mark', 'Deployment'],
  ['guides/release', 'p mark', 'guides/release'],
  ['stable', '.tag-list mark', 'stable'],
])('marks the visible source of a %s match', async (term, selector, expected) => {
  mockText = term
  render(<Browse />)

  const result = await screen.findByRole('listitem')
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 page'))
  expect(result.querySelector(selector)).toHaveTextContent(expected)
})
