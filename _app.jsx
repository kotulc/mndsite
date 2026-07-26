/** Next.js custom App wrapper — imports global styles and any providers. */
import '../styles/global.css'
import { SectionProvider } from '../components/SectionContext'


export default function App({ Component, pageProps }) {
  return (
    <SectionProvider>
      <Component {...pageProps} />
    </SectionProvider>
  )
}
