import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import { Skeleton } from './components/ui'
import RouteError from './components/RouteError'
import { useTitle } from './hooks/useApp'
import { useT } from './i18n/useT'

const StationPage = lazy(() => import('./pages/StationPage'))
const StationsPage = lazy(() => import('./pages/StationsPage'))
const RiversPage = lazy(() => import('./pages/RiversPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const EmbedPage = lazy(() => import('./pages/EmbedPage'))
const FloodsPage = lazy(() => import('./pages/FloodsPage'))
const AirPage = lazy(() => import('./pages/AirPage'))

const wrap = (el: React.ReactNode) => <Suspense fallback={<div className="mx-auto max-w-6xl p-6"><Skeleton className="h-64" /></div>}>{el}</Suspense>

function NotFound() {
  const { t } = useT()
  useTitle(t('notFound.title'))
  return <div className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">{t('notFound.title')}</h1><p className="mt-2 text-muted">{t('notFound.body')}</p></div>
}

// Hash routing: GitHub Pages has no server-side rewrites, so deep links must live after the '#'.
const router = createHashRouter([
  {
    path: 'embed/:id',
    element: <Suspense fallback={null}><EmbedPage /></Suspense>,
    errorElement: <RouteError />,
  },
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      {
        // Errors inside a screen render here, under the header, so navigation still works.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'station/:id', element: wrap(<StationPage />) },
          { path: 'stations', element: wrap(<StationsPage />) },
          { path: 'rivers', element: wrap(<RiversPage />) },
          { path: 'rivers/:id', element: wrap(<RiversPage />) },
          { path: 'floods', element: wrap(<FloodsPage />) },
          { path: 'air', element: wrap(<AirPage />) },
          { path: 'compare', element: wrap(<ComparePage />) },
          { path: 'alerts', element: wrap(<AlertsPage />) },
          { path: 'sources', element: wrap(<SourcesPage />) },
          { path: 'about', element: wrap(<AboutPage />) },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
