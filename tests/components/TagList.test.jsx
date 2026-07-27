import { render, screen } from '@testing-library/react'
import TagList from '../../components/TagList'


test('test_tag_list_renders_array_tags', () => {
  /** Renders chips from the flat { term, group } list. */
  render(<TagList tags={[
    { term: 'reviews', group: 'category' },
    { term: 'ai', group: 'topic' },
  ]} />)
  expect(screen.getByText('reviews')).toBeInTheDocument()
  expect(screen.getByText('ai')).toBeInTheDocument()
})

test('test_tag_list_known_groups_get_named_chip_class', () => {
  /** Fixed groups render with their own chip-<group> class. */
  render(<TagList tags={[
    { term: 'opinion', group: 'category' },
    { term: 'ai', group: 'topic' },
    { term: 'x', group: 'concept' },
    { term: 'acme', group: 'entity' },
    { term: 'mine', group: 'user' },
  ]} />)
  expect(screen.getByText('opinion')).toHaveClass('chip-category')
  expect(screen.getByText('ai')).toHaveClass('chip-topic')
  expect(screen.getByText('x')).toHaveClass('chip-concept')
  expect(screen.getByText('acme')).toHaveClass('chip-entity')
  expect(screen.getByText('mine')).toHaveClass('chip-user')
})

test('test_tag_list_custom_group_falls_back_to_chip_custom', () => {
  render(<TagList tags={[{ term: 'cozy', group: 'vibes' }]} />)
  expect(screen.getByText('cozy')).toHaveClass('chip-custom')
})

test('test_tag_list_returns_null_when_empty', () => {
  const { container } = render(<TagList tags={[]} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_tag_list_legacy_object_shape_still_works', () => {
  /** Legacy { group: [terms] } maps still render (plurals → singular classes). */
  render(<TagList tags={{ categories: ['reviews'], keywords: ['skip'] }} />)
  expect(screen.getByText('reviews')).toHaveClass('chip-category')
  expect(screen.queryByText('skip')).not.toBeInTheDocument()
})
