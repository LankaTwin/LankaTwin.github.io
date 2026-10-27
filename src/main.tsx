import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 60 * 60_000,
      retry: 2,
      retryDelay: (n) => Math.min(30_000, 2000 * 2 ** n),
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
    },
  },
})

const root = document.getElementById('root')!
// The pre-rendered page inside #root is for crawlers and no-JS readers; the app takes over.
root.replaceChildren()
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Fade the splash out once the first frame of the app has painted.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const s = document.getElementById('lt-splash')
  if (!s) return
  s.classList.add('lt-done')
  setTimeout(() => s.remove(), 400)
}))
