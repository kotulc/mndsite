const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// `next dev` keeps its own build dir. Sharing the export dir lets the two wipe each
// other: a build clears the running dev server's working files, and dev's incremental
// artifacts overwrite the exported HTML.
const distDir = process.env.NODE_ENV === 'development'
  ? '.next'
  : process.env.MNDSITE_OUTPUT
    ? require('path').relative(__dirname, process.env.MNDSITE_OUTPUT)
    : 'dist'

module.exports = withNextra({
  output: 'export',
  distDir,
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
})
