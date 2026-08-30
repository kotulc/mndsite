/**
 * Shared page title chrome — the h1 Nextra pages use.
 * PageTitle (theme.config.jsx) and IndexListing both render through here so index
 * views line up with normal article pages.
 */
export function PageHeading({ children }) {
  return (
    <h1 className="nx-mt-2 nx-text-4xl nx-font-bold nx-tracking-tight nx-text-slate-900 dark:nx-text-slate-100">
      {children}
    </h1>
  )
}
