/**
 * Tests for the consumer assets extension point: mndsite.yaml `assets:` dir is
 * mirrored into public/assets/ each build so pages can fetch static data files.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { sync_assets, set_target_root } = require('../../scripts/ingest')


// A temp root keeps the suite off the real public/assets, which the dev build owns.
let src_dir
let root_dir
const assets = () => path.join(root_dir, 'public', 'assets')

beforeEach(() => {
  src_dir  = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-assets-'))
  root_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mndsite-root-'))
  set_target_root(root_dir)
})

afterEach(() => {
  set_target_root(null)
  fs.rmSync(src_dir, { recursive: true, force: true })
  fs.rmSync(root_dir, { recursive: true, force: true })
})


test('test_sync_copies_assets_recursively', () => {
  /** Any file type is mirrored into public/assets/, subdirectories included. */
  fs.writeFileSync(path.join(src_dir, 'graph.json'), '{}')
  fs.mkdirSync(path.join(src_dir, 'data'))
  fs.writeFileSync(path.join(src_dir, 'data', 'extra.csv'), 'a,b')

  const copied = sync_assets(src_dir)
  expect(copied.sort()).toEqual(['data', 'graph.json'])
  expect(fs.existsSync(path.join(assets(), 'graph.json'))).toBe(true)
  expect(fs.existsSync(path.join(assets(), 'data', 'extra.csv'))).toBe(true)
})

test('test_sync_cleans_stale_assets', () => {
  /** Files from a previous build are removed when no longer in the source dir. */
  fs.writeFileSync(path.join(src_dir, 'old.json'), '{}')
  sync_assets(src_dir)

  fs.rmSync(path.join(src_dir, 'old.json'))
  fs.writeFileSync(path.join(src_dir, 'new.json'), '{}')
  sync_assets(src_dir)

  expect(fs.existsSync(path.join(assets(), 'old.json'))).toBe(false)
  expect(fs.existsSync(path.join(assets(), 'new.json'))).toBe(true)
})

test('test_sync_unset_config_removes_dir', () => {
  /** No assets config copies nothing and leaves no public/assets/ dir. */
  expect(sync_assets('')).toEqual([])
  expect(fs.existsSync(assets())).toBe(false)
})
