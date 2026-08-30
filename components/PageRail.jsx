/**
 * Breadcrumbs and page actions (Contents) in the content column above the title.
 */
export default function PageRail({ trail, actions }) {
  const has_trail = !!trail
  const has_actions = !!actions

  if (!has_trail && !has_actions) return null

  return (
    <div className="page-rail">
      {trail}
      {has_actions ? <div className="page-rail-actions">{actions}</div> : null}
    </div>
  )
}
