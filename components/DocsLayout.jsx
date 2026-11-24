import DocsTheme from 'nextra-theme-docs'
import { SectionProvider } from './SectionContext'

export default function DocsLayout(props) {
  return (
    <SectionProvider headings={props.pageOpts.headings}>
      <DocsTheme {...props} />
    </SectionProvider>
  )
}
