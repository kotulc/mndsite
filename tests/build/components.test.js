/**
 * Tests for the consumer components extension point: mndsite.yaml `components:` dir
 * is mirrored into components/custom/ each build so content MDX can import from it.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { sync_components, set_target_root } = require('../../scripts/ingest')


// A temp root keeps the suite off the real components/custom, which the dev build owns.
let src_dir
let root_dir
const custom = () => path.join(root_dir, 'components', 'custom')

beforeEach(() => {
  src_dir  = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-components-'))
  root_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-root-'))
  set_target_root(root_dir)
})

afterEach(() => {
  set_target_root(null)
  fs.rmSync(src_dir, { recursive: true, force: true })
  fs.rmSync(root_dir, { recursive: true, force: true })
})


test('test_sync_copies_component_files_only', () => {
  /** Only js/jsx/ts/tsx files are mirrored into components/custom/. */
  fs.writeFileSync(path.join(src_dir, 'Widget.jsx'), 'export default () => null')
  fs.writeFileSync(path.join(src_dir, 'util.js'), 'module.exports = {}')
  fs.writeFileSync(path.join(src_dir, 'notes.txt'), 'not a component')

  const copied = sync_components(src_dir)
  expect(copied.sort()).toEqual(['Widget.jsx', 'util.js'])
  expect(fs.existsSync(path.join(custom(), 'Widget.jsx'))).toBe(true)
  expect(fs.existsSync(path.join(custom(), 'notes.txt'))).toBe(false)
})

test('test_sync_cleans_stale_components', () => {
  /** Files from a previous build are removed when no longer in the source dir. */
  fs.writeFileSync(path.join(src_dir, 'Old.jsx'), 'export default () => null')
  sync_components(src_dir)

  fs.rmSync(path.join(src_dir, 'Old.jsx'))
  fs.writeFileSync(path.join(src_dir, 'New.jsx'), 'export default () => null')
  sync_components(src_dir)

  expect(fs.existsSync(path.join(custom(), 'Old.jsx'))).toBe(false)
  expect(fs.existsSync(path.join(custom(), 'New.jsx'))).toBe(true)
})

test('test_sync_unset_config_yields_empty_dir', () => {
  /** No components config leaves an empty custom/ dir and copies nothing. */
  expect(sync_components('')).toEqual([])
  expect(fs.readdirSync(custom())).toEqual([])
})
