/**
 * Semver helpers: major.minor.patch, optional leading v, shorter stamps padded with .0.
 * Shared by config, ingest, and the index runtime.
 */

function normalize_semver(value) {
  /** 'v0.4.1' → '0.4.1'; '0.4' → '0.4.0'. Null when the value is not dotted integers. */
  if (value == null) return null
  const s = String(value).trim().replace(/^v/i, '')
  if (!s) return null
  const parts = s.split('.')
  if (!parts.length || parts.some(p => !/^\d+$/.test(p))) return null
  while (parts.length < 3) parts.push('0')
  return parts.slice(0, 3).join('.')
}


function compare_semver(a, b) {
  /** Numeric major.minor.patch compare. Non-semver strings sort as 0.0.0. */
  const parts = s => {
    const n = normalize_semver(s)
    return (n || '0.0.0').split('.').map(p => parseInt(p, 10))
  }
  const [pa, pb] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}


function parse_semver_tag(tag) {
  /** A git tag that is exactly major.minor.patch, with or without a leading v. */
  const raw = String(tag || '').trim()
  if (!/^v?\d+\.\d+\.\d+$/.test(raw)) return null
  return { tag: raw, version: normalize_semver(raw) }
}


module.exports = { normalize_semver, compare_semver, parse_semver_tag }
