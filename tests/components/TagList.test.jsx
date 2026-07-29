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

test('test_tag_list_shows_group_and_score_tooltip', () => {
  render(<TagList tags={[{ term: 'yaml', group: 'user', score: 0.914 }]} />)
  expect(screen.getByText('yaml')).toHaveAttribute('data-tooltip', 'User tag: relevance 0.91')
})

test('test_tag_list_tooltip_without_score_omits_score', () => {
  render(<TagList tags={[{ term: 'reviews', group: 'category' }]} />)
  expect(screen.getByText('reviews')).toHaveAttribute('data-tooltip', 'Category tag')
})

test('test_tag_list_tooltip_rounds_score_to_hundredth', () => {
  render(<TagList tags={[{ term: 'ai', group: 'topic', score: 0.866 }]} />)
  expect(screen.getByText('ai')).toHaveAttribute('data-tooltip', 'Topic tag: relevance 0.87')
})

test('test_tag_list_tooltip_does_not_set_native_title', () => {
  /** Native title would duplicate the CSS tooltip. */
  render(<TagList tags={[{ term: 'yaml', group: 'user', score: 0.9 }]} />)
  expect(screen.getByText('yaml')).not.toHaveAttribute('title')
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
