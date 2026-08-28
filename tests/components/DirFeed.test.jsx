import { render, screen, waitFor } from '@testing-library/react'
import DirFeed from '../../components/DirFeed'


jest.mock('next/router', () => ({ useRouter: () => ({ basePath: '' }) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }) => <a href={href}>{children}</a> }))
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children, components }) => {
    const Img = components?.img
    return <div>{children}{Img && <Img src="/images/test.svg" alt="test" />}</div>
  },
}))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }))
jest.mock('../../site.config', () => ({
  display: { header: ['date', 'reading_time', 'facets'] },
  facets: { categories: { field: 'categories', label: 'Category', ui: 'chips' } },
}))

const ENTRIES = [{
  url:          '/updates/welcome',
  title:        'Welcome',
  date:         '2024-01-01',
  facets:       { categories: ['announcement'] },
  reading_time: 1,
  content:      '## Hello\n\nSome **bold** text.\n\n- item one\n- item two',
}]

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(ENTRIES) }))
})

afterEach(() => { jest.restoreAllMocks() })


test('test_dir_feed_renders_entry_title', async () => {
  /** Each entry's title is rendered as a linked heading. */
  render(<DirFeed dir="updates" />)
  await waitFor(() => expect(screen.getByText('Welcome')).toBeInTheDocument())
})

test('test_dir_feed_content_wrapped_in_prose_class', async () => {
  /** ReactMarkdown output is wrapped in feed-section-content for Nextra-matching typography. */
  const { container } = render(<DirFeed dir="updates" />)
  await waitFor(() => screen.getByText('Welcome'))
  expect(container.querySelector('.feed-section-content')).not.toBeNull()
})

test('test_dir_feed_renders_content_inside_prose_wrapper', async () => {
  /** Entry content is rendered inside the feed-section-content wrapper. */
  const { container } = render(<DirFeed dir="updates" />)
  await waitFor(() => screen.getByText('Welcome'))
  const prose = container.querySelector('.feed-section-content')
  expect(prose).not.toBeNull()
  expect(prose.textContent.length).toBeGreaterThan(0)
})

test('test_dir_feed_images_prepend_basepath', async () => {
  /** Images in feed content get basePath prepended so they resolve under a subpath deployment. */
  jest.spyOn(require('next/router'), 'useRouter').mockReturnValue({ basePath: '/base' })
  const { container } = render(<DirFeed dir="updates" />)
  await waitFor(() => screen.getByText('Welcome'))
  const img = container.querySelector('img')
  expect(img).not.toBeNull()
  expect(img.getAttribute('src')).toBe('/base/images/test.svg')
})

test('test_dir_feed_shows_loading_state', () => {
  /** Loading placeholder is shown before fetch resolves. */
  global.fetch = jest.fn(() => new Promise(() => {}))
  render(<DirFeed dir="updates" />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
})
