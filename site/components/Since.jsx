/**
 * Inline badge marking the config contract version a key first appeared in.
 * Demonstrates the `components` extension point: files here are mirrored into
 * components/custom/ each build and imported from MDX.
 *
 * Usage:  <Since v="0.2" />
 */
export default function Since({ v }) {
  return <span className="chip chip-version">since {v}</span>
}
