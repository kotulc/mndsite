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

test('published documentation links to the exported Updates page and current repository', () => {
  const read = file => new DOMParser().parseFromString(
    fs.readFileSync(path.join(OUT, file), 'utf8'), 'text/html'
  )
  const home = read('index.html')
  const updates = read('updates/index.html')
  const base = JSON.parse(home.getElementById('__NEXT_DATA__').textContent).assetPrefix || ''
  expect(home.querySelector('a[aria-label="Feed"]').getAttribute('href')).toBe(base + '/updates/')
  expect(updates.querySelector('.published-feed')).not.toBeNull()
  expect(updates.querySelector('a[aria-label="GitHub repository"]').getAttribute('href'))
    .toBe('https://github.com/kotulc/mndsite')
  const specification = read('specifications/specification/index.html')
  for (const link of specification.querySelectorAll('a[href]')) {
    expect(link.getAttribute('href')).not.toMatch(/(?:nlp-mn?dsite|\/\.\.\.(?:\/|$))/i)
  }
})
