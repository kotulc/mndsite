/**
 * Git tag snapshots for version history.
 * Only exact vMAJOR.MINOR.PATCH (or MAJOR.MINOR.PATCH) tags are used.
 * Missing git, a shallow clone, or a content path outside the repo all yield [].
 */
const { execFileSync } = require('child_process')
const { parse_semver_tag } = require('./semver')


function git(cwd, args) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}


function list_semver_tags(cwd) {
  try {
    const out = git(cwd, ['tag', '-l'])
    return out.split(/\r?\n/).map(parse_semver_tag).filter(Boolean)
  } catch {
    return []
  }
}


function files_at_tag(cwd, tag, prefix) {
  /** Repo-relative paths under `prefix` (e.g. docs) at `tag`. */
  try {
    const args = ['ls-tree', '-r', '--name-only', tag]
    if (prefix) args.push('--', prefix)
    const out = git(cwd, args)
    return out ? out.split(/\r?\n/).filter(Boolean) : []
  } catch {
    return []
  }
}


function show_file(cwd, tag, file) {
  return git(cwd, ['show', `${tag}:${file}`])
}


module.exports = { list_semver_tags, files_at_tag, show_file }
