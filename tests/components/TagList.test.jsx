import { render, screen } from '@testing-library/react'
import TagList from '../../components/TagList'


test('test_tag_list_renders_facet_chips', () => {
  /** Renders chips from the flat { term, group } list, group = facet name. */
  render(<TagList tags={[
    { term: 'reviews', group: 'categories' },
    { term: 'ai', group: 'tags' },
  ]} />)
  expect(screen.getByText('reviews')).toBeInTheDocument()
  expect(screen.getByText('ai')).toBeInTheDocument()
})

test('test_tag_list_declared_facet_gets_named_chip_class', () => {
  /** Declared facets render with their own chip-<facet> class for generated colors. */
  render(<TagList tags={[
    { term: 'guide', group: 'categories' },
    { term: 'cli', group: 'tags' },
  ]} />)
  expect(screen.getByText('guide')).toHaveClass('chip-categories')
  expect(screen.getByText('cli')).toHaveClass('chip-tags')
})

test('test_tag_list_tooltip_uses_facet_label', () => {
  render(<TagList tags={[{ term: 'guide', group: 'categories' }]} />)
  expect(screen.getByText('guide')).toHaveAttribute('data-tooltip', 'Category: guide')
})

test('test_tag_list_tooltip_does_not_set_native_title', () => {
  /** Native title would duplicate the CSS tooltip. */
  render(<TagList tags={[{ term: 'guide', group: 'categories' }]} />)
  expect(screen.getByText('guide')).not.toHaveAttribute('title')
})

test('test_tag_list_undeclared_facet_falls_back_to_chip_custom', () => {
  render(<TagList tags={[{ term: 'cozy', group: 'vibes' }]} />)
  expect(screen.getByText('cozy')).toHaveClass('chip-custom')
})

test('test_tag_list_returns_null_when_empty', () => {
  const { container } = render(<TagList tags={[]} />)
  expect(container).toBeEmptyDOMElement()
})
