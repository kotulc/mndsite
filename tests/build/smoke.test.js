const fs   = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../../dist')


test('test_build_out_dir_exists', () => {
  expect(fs.existsSync(OUT)).toBe(true)
})

test('test_build_index_page_exists', () => {
  expect(fs.existsSync(path.join(OUT, 'index.html'))).toBe(true)
})

test('test_build_images_copied', () => {
  expect(fs.existsSync(path.join(OUT, 'images'))).toBe(true)
})
