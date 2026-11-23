/** Rebuild generated pages when content, assets, or site configuration change. */
const fs = require('fs')
const path = require('path')
const { load_config, write_site_config } = require('./config')
const { run } = require('./ingest')

const ROOT = path.join(__dirname, '..')
const args = process.argv.slice(2)
const flag = args.indexOf('--config')
const config_path = flag >= 0 && args[flag + 1] ? path.resolve(args[flag + 1]) : path.join(ROOT, 'mndsite.yaml')
const override = flag < 0 && args[0] ? path.resolve(args[0]) : undefined
let watchers = []
let running = false
let pending = false
let timer
let watched_paths = ''

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(rebuild, 180)
}

async function rebuild() {
  if (running) {
    pending = true
    return
  }
  running = true
  try {
    const config = load_config(config_path)
    if (override) config.content = override
    const directories = [...new Set([config.content, config.assets, config.components].filter(Boolean))]
    if (JSON.stringify(directories) !== watched_paths) {
      for (const watcher of watchers) watcher.close()
      const config_watch = fs.watch(path.dirname(config_path), (_, filename) => {
        if (!filename || filename === path.basename(config_path)) schedule()
      })
      watchers = [config_watch]
      for (const directory of directories) {
        if (fs.existsSync(directory)) watchers.push(fs.watch(directory, { recursive: true }, schedule))
      }
      watched_paths = JSON.stringify(directories)
    }
    write_site_config(config)
    await run(config)
  } catch (error) {
    console.error(`[watch] ${error.message}`)
  } finally {
    running = false
    if (pending) {
      pending = false
      schedule()
    }
  }
}

console.log('[watch] Run npm run dev in a second terminal.')
void rebuild()
