const { normalize_semver, compare_semver, parse_semver_tag } = require('../../scripts/semver')


describe('normalize_semver', () => {
  test('test_strips_v_and_pads', () => {
    expect(normalize_semver('v0.4')).toBe('0.4.0')
    expect(normalize_semver('0.4.1')).toBe('0.4.1')
    expect(normalize_semver('0.2')).toBe('0.2.0')
  })

  test('test_rejects_non_numeric', () => {
    expect(normalize_semver('latest')).toBeNull()
    expect(normalize_semver('stable')).toBeNull()
  })
})


describe('compare_semver', () => {
  test('test_orders_major_minor_patch', () => {
    expect(compare_semver('0.2.0', '0.2.1')).toBeLessThan(0)
    expect(compare_semver('0.4.1', '0.4')).toBeGreaterThan(0)
    expect(compare_semver('v0.2', '0.2.0')).toBe(0)
  })
})


describe('parse_semver_tag', () => {
  test('test_accepts_exact_three_part_tags', () => {
    expect(parse_semver_tag('v0.4.1')).toEqual({ tag: 'v0.4.1', version: '0.4.1' })
    expect(parse_semver_tag('0.4.1')).toEqual({ tag: '0.4.1', version: '0.4.1' })
  })

  test('test_rejects_two_part_and_other_tags', () => {
    expect(parse_semver_tag('v0.4')).toBeNull()
    expect(parse_semver_tag('latest')).toBeNull()
  })
})
