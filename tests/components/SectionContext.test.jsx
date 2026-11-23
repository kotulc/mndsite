import { render } from '@testing-library/react'
import { useRouter } from 'next/router'
import { SectionProvider, useSection, find_page } from '../../components/SectionContext'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('../../public/site-meta.json', () => ({
  pages: [
    {
      url: '/features/overview',
      name: 'Overview',
      sections: [
        { name: 'Intro', level: 2, tags: [], sections: [
          { name: 'Nested', level: 3, tags: [], sections: [] },
        ] },
        { name: 'Details', level: 2, tags: [], sections: [] },
      ],
    },
    { url: '/about', name: 'About', sections: [] },
  ],
}))


describe('find_page', () => {
  test('test_find_page_resolves_ignoring_trailing_slash_and_fragment', () => {
    expect(find_page('/features/overview/')).toMatchObject({ name: 'Overview' })
    expect(find_page('/features/overview#details')).toMatchObject({ name: 'Overview' })
  })

  test('test_find_page_returns_undefined_for_bare_fragment', () => {
    expect(find_page('#details')).toBeUndefined()
  })

  test('test_find_page_returns_undefined_for_external_url', () => {
    expect(find_page('https://example.com')).toBeUndefined()
  })
})


function Probe() {
  const { page, sections } = useSection()
  return (
    <div data-testid="probe">
      {page ? page.name : 'none'}:{sections.map(s => s.id).join(',')}
    </div>
  )
}


test('test_section_provider_exposes_page_and_sections_for_route', () => {
  useRouter.mockReturnValue({ route: '/features/overview' })
  const { getByTestId, rerender } = render(<SectionProvider headings={[
    { id: 'intro', value: 'Intro', depth: 2 },
    { id: 'intro-1', value: 'Intro', depth: 3 },
    { id: 'detail', value: 'Detail', depth: 4 },
  ]}><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('Overview:intro,intro-1')

  useRouter.mockReturnValue({ route: '/about' })
  rerender(<SectionProvider headings={[]}><Probe /></SectionProvider>)
  expect(getByTestId('probe').textContent).toBe('About:')
})
