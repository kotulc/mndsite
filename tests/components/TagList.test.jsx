import { render, screen } from '@testing-library/react'
import TagList from '../../components/TagList'


test('test_tag_list_renders_all_groups_except_keywords', () => {
  /** Renders chips for every tag group except keywords. */
  render(<TagList tags={{ categories: ['reviews'], topics: ['ai'], keywords: ['wheels'] }} />)
  expect(screen.getByText('reviews')).toBeInTheDocument()
  expect(screen.getByText('ai')).toBeInTheDocument()
  expect(screen.queryByText('wheels')).not.toBeInTheDocument()
})

test('test_tag_list_known_groups_get_named_chip_class', () => {
  /** Standard groups render with their own chip-<group> class. */
  render(<TagList tags={{ categories: ['opinion'], topics: ['ai'], concepts: ['x'], entities: ['acme'] }} />)
  expect(screen.getByText('opinion')).toHaveClass('chip-categories')
  expect(screen.getByText('ai')).toHaveClass('chip-topics')
  expect(screen.getByText('x')).toHaveClass('chip-concepts')
  expect(screen.getByText('acme')).toHaveClass('chip-entities')
})

test('test_tag_list_custom_group_falls_back_to_chip_custom', () => {
  /** A configured extract_concepts group outside the standard four gets chip-custom. */
  render(<TagList tags={{ vibes: ['cozy'] }} />)
  expect(screen.getByText('cozy')).toHaveClass('chip-custom')
})

test('test_tag_list_returns_null_when_empty', () => {
  /** Returns nothing when tags is empty or undefined. */
  const { container } = render(<TagList tags={{}} />)
  expect(container).toBeEmptyDOMElement()
})

test('test_tag_list_returns_null_when_only_keywords', () => {
  /** Returns nothing when the only populated group is keywords. */
  const { container } = render(<TagList tags={{ keywords: ['a', 'b'] }} />)
  expect(container).toBeEmptyDOMElement()
})
