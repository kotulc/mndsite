import { render } from '@testing-library/react'
import { useRouter } from 'next/router'
import { SectionProvider, useSection, find_page, flatten_sections } from '../../components/SectionContext'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('../../public/site-meta.json', () => ({
  type: 'root', url: '/', name: 'Site', children: [
    {
      type: 'folder', url: '/features', name: 'Features', children: [
        {
          type: 'page', url: '/features/overview', name: 'Overview', children: [
            { type: 'section', name: 'Intro', level: 2, children: [
              { type: 'section', name: 'Nested', level: 3, children: [] },
            ] },
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


describe('flatten_sections', () => {
  test('test_flatten_sections_depth_first_document_order', () => {
    /** Nested sections appear in document order under their parent. */
    const page = find_page('/features/overview')
    expect(flatten_sections(page).map(s => s.name)).toEqual(['Intro', 'Nested', 'Details'])
  })
})


function Probe() {
  const { page, sections } = useSection()
  return (
    <div data-testid="probe">
      {page ? page.name : 'none'}:{sections.map(s => s.name).join(',')}
    </div>
  )
}


test('test_section_provider_exposes_page_and_sections_for_route', () => {
  /** Provider resolves the current route's page node and flattened section list. */
  useRouter.mockReturnValue({ route: '/features/overview' })
  const { getByTestId, rerender } = render(<SectionProvider><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('Overview:Intro,Nested,Details')

  useRouter.mockReturnValue({ route: '/about' })
  rerender(<SectionProvider><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('About:')
})
