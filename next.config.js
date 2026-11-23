const withNextra = require('nextra')({
  theme: './components/DocsLayout.jsx',
  themeConfig: './theme.config.jsx',
})

const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// Next stages static exports in .next even when distDir names another destination.
// Keep development chunks separate so a production build can run alongside the server.
const distDir = process.env.NODE_ENV === 'development'
  ? '.next-dev'
  : process.env.MNDSITE_OUTPUT
    ? require('path').relative(__dirname, process.env.MNDSITE_OUTPUT)
    : 'dist'

module.exports = withNextra({
  output: 'export',
  distDir,
  onDemandEntries: { maxInactiveAge: 5 * 60 * 1000, pagesBufferLength: 12 },
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
})
