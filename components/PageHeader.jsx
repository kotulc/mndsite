/**
 * Metadata line below the page title: publication date and reading time, in the order
 * given by `display.header`. Each item renders only when the page supplies its value.
 */
function fmt_date(date_str) {
  // Slice to YYYY-MM-DD — gray-matter may serialize date fields as ISO datetime strings
  const [year, month, day] = String(date_str).slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function PageHeader({ date, reading_time, order = ['date', 'reading_time'] }) {
  const items = order.map(key => {
    if (key === 'date' && date) return <span key="date" className="page-date">{fmt_date(date)}</span>
    if (key === 'reading_time' && reading_time) {
      return <span key="reading_time" className="page-reading-time">{reading_time} min read</span>
    }
    return null
  }).filter(Boolean)

  if (!items.length) return null
  return (
    <div className="page-header">
      {items.map((item, i) => (
        i === 0 ? item : [<span key={`sep-${i}`} className="page-header-sep">·</span>, item]
      ))}
    </div>
  )
}
