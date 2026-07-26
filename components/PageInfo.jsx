/**
 * "Info" affordance for the page header. PageInfoToggle renders a small intelligence
 * icon beside the page title; clicking it expands PageInfoPanel below the header, which
 * shows the page description and a per-section tag breakdown. Keywords and metrics are
 * intentionally omitted for now. Each section shows at most `page_tags` chips (same
 * limit as the curated chips below the title). Sections pack into a content-sized mosaic
 * (rows of weight-flexed tiles) so busy pages never clip chips the way a fixed-height
 * absolute treemap did. Data comes from SectionContext. Both pieces share open state
 * owned by the caller (theme.config.jsx's PageTitle).
 */
import { useSection } from './SectionContext'
import TagList from './TagList'
import siteConfig from '../site.config'

const GROUP_ORDER = ['categories', 'topics', 'concepts', 'entities']

function section_has_tags(node) {
  return !!node.tags && Object.entries(node.tags).some(([group, terms]) => group !== 'keywords' && terms && terms.length)
}

export function limit_tags(tags, n) {
  /** Keep the first n non-keyword terms across groups (standard groups first, then any
   *  custom extract_concepts groups), preserving each term's original group for chip
   *  coloring. Used to mirror extract.page_tags for section chips in PageInfo. */
  if (!tags || n <= 0) return {}
  const groups = [
    ...GROUP_ORDER.filter(g => tags[g] && tags[g].length),
    ...Object.keys(tags).filter(g => g !== 'keywords' && !GROUP_ORDER.includes(g) && tags[g] && tags[g].length),
  ]
  const out = {}
  let left = n
  for (const group of groups) {
    if (left <= 0) break
    const take = tags[group].slice(0, left)
    if (!take.length) continue
    out[group] = take
    left -= take.length
  }
  return out
}

function tag_count(tags) {
  return Object.entries(tags || {}).reduce(
    (n, [group, terms]) => group === 'keywords' ? n : n + ((terms && terms.length) || 0),
    0,
  )
}

export function layout_section_rows(sections) {
  /** Pack sections into mosaic rows (~sqrt(n) tiles per row). Within a row, flex-grow is
   *  proportional to tag weight; row height is content-driven so chips never clip. */
  if (!sections.length) return []
  const cols = Math.max(2, Math.ceil(Math.sqrt(sections.length)))
  const nodes = sections.map(section => ({
    section,
    weight: Math.max(tag_count(section.tags), 1),
  }))
  const rows = []
  for (let i = 0; i < nodes.length; i += cols) rows.push(nodes.slice(i, i + cols))
  return rows
}

export function section_anchor(name) {
  /** Fragment id matching Nextra's heading anchors (GitHub-style slug of the section name). */
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

function use_page_info() {
  const { page, sections } = useSection()
  const desc = (page && page.desc) || ''
  const max_tags = siteConfig.page_tags ?? 5
  const tagged_sections = (sections || [])
    .filter(section_has_tags)
    .map(section => ({ ...section, tags: limit_tags(section.tags, max_tags) }))
    .filter(section => section_has_tags(section))
  return { desc, tagged_sections, has_info: !!(desc || tagged_sections.length) }
}

function IntelligenceIcon() {
  // Sparkle glyph — reads as "AI/intelligence" rather than a plain info "i"
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
      <path d="M18.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" opacity="0.7" />
    </svg>
  )
}

export function PageInfoToggle({ open, on_toggle }) {
  const { has_info } = use_page_info()
  if (!has_info) return null
  return (
    <button
      type="button"
      className="page-info-toggle"
      aria-expanded={open}
      aria-label={open ? 'Hide page info' : 'Show page info'}
      onClick={on_toggle}
    >
      <IntelligenceIcon />
      <span>Info</span>
    </button>
  )
}

export function PageInfoPanel() {
  const { desc, tagged_sections, has_info } = use_page_info()
  if (!has_info) return null
  const rows = layout_section_rows(tagged_sections)
  return (
    <section className="page-info-panel" aria-labelledby="page-info-title">
      <h2 id="page-info-title" className="page-info-title">
        <IntelligenceIcon />
        Page intelligence
      </h2>
      {desc && (
        <p className="page-info-summary">
          <span className="page-info-label">Summary</span>
          <span className="page-info-desc">{desc}</span>
        </p>
      )}
      {!!rows.length && (
        <div className="page-info-section-map">
          <h3 className="page-info-label">Sections</h3>
          <div className="page-info-sections">
            {rows.map((row, ri) => (
              <div key={ri} className="page-info-row">
                {row.map(({ section, weight }, i) => (
                  <div
                    key={`${section.name}-${ri}-${i}`}
                    className="page-info-section"
                    style={{ flexGrow: weight }}
                  >
                    <a href={`#${section_anchor(section.name)}`} className="page-info-section-name">
                      {section.name}
                    </a>
                    <TagList tags={section.tags} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
