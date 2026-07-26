import { useEffect } from 'react'
import { render, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { SectionProvider, useSection, find_page } from '../../components/SectionContext'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('../../public/site-meta.json', () => ({
  type: 'root', url: '/', name: 'Site', children: [
    {
      type: 'folder', url: '/features', name: 'Features', children: [
        {
          type: 'page', url: '/features/overview', name: 'Overview', children: [
            { type: 'section', name: 'Intro', level: 2, children: [] },
            { type: 'section', name: 'Details', level: 2, children: [] },
          ],
        },
      ],
    },
    { type: 'page', url: '/about', name: 'About', children: [] },
  ],
}))


describe('find_page', () => {
  test('test_find_page_resolves_ignoring_trailing_slash_and_fragment', () => {
    /** Trailing slashes and #fragments don't prevent a match. */
    expect(find_page('/features/overview/')).toMatchObject({ name: 'Overview' })
    expect(find_page('/features/overview#details')).toMatchObject({ name: 'Overview' })
  })

  test('test_find_page_resolves_folder_links', () => {
    /** A link to a folder url (e.g. a section index) resolves to the folder node. */
    expect(find_page('/features')).toMatchObject({ type: 'folder', name: 'Features' })
  })

  test('test_find_page_returns_undefined_for_bare_fragment', () => {
    /** A same-page #anchor with no path has no page to resolve to. */
    expect(find_page('#details')).toBeUndefined()
  })

  test('test_find_page_returns_undefined_for_external_url', () => {
    /** External URLs aren't in the site graph. */
    expect(find_page('https://example.com')).toBeUndefined()
  })
})


function Probe({ testid = 'probe' }) {
  const { page, active } = useSection()
  return <div data-testid={testid}>{page ? page.name : 'none'}:{active}</div>
}

function Setter({ to }) {
  const { set_active } = useSection()
  useEffect(() => { set_active(to) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}


test('test_section_provider_resets_active_synchronously_on_page_change', () => {
  /** A stale active index from the previous page never pairs with the new page's
   *  sections — regression test for the "current is undefined" crash. */
  useRouter.mockReturnValue({ route: '/features/overview' })
  const { rerender, getByTestId } = render(
    <SectionProvider><Setter to={1} /><Probe /></SectionProvider>
  )
  expect(getByTestId('probe').textContent).toBe('Overview:1')

  useRouter.mockReturnValue({ route: '/about' })
  rerender(<SectionProvider><Setter to={1} /><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('About:-1')
})

test('test_section_provider_activates_last_section_at_page_bottom', () => {
  /** The last section's own marker often can't cross the near-top scrollspy band —
   *  reaching the bottom of the page forces it active directly. */
  useRouter.mockReturnValue({ route: '/features/overview' })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

  const { getByTestId } = render(<SectionProvider><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('Overview:-1')

  act(() => {
    window.scrollY = 1200
    window.dispatchEvent(new Event('scroll'))
  })
  expect(getByTestId('probe').textContent).toBe('Overview:1')
})
