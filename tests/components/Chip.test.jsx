import { render, screen } from '@testing-library/react'
import Chip from '../../components/Chip'


test('test_chip_default_variant_class', () => {
  /** Defaults to the tag variant when none is given. */
  render(<Chip label="gear" />)
  expect(screen.getByText('gear')).toHaveClass('chip-tag')
})

test('test_chip_custom_variant_class', () => {
  /** Renders the requested variant's class. */
  render(<Chip label="oops" variant="danger" />)
  expect(screen.getByText('oops')).toHaveClass('chip-danger')
})
