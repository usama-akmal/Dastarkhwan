import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { initializeDatabase } from './data/db'
import { useSettings } from './hooks/useDatabase'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { Icon } from './components/ui/Icon'
import { UpdatePrompt } from './components/ui/UpdatePrompt'
import { useServiceWorkerUpdate } from './pwa/useServiceWorkerUpdate'

/**
 * Route code splitting.
 *
 * HomePage stays in the entry chunk because it is the first thing a returning user
 * sees. Everything else is fetched on navigation, which keeps the initial download
 * smaller on the mid-range mobile connections this app targets. The onboarding
 * wizard is split too: it is only ever shown once, to brand-new users.
 */
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const RecipesPage = lazy(() => import('./pages/RecipesPage').then((m) => ({ default: m.RecipesPage })))
const FamilyPage = lazy(() => import('./pages/FamilyPage').then((m) => ({ default: m.FamilyPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ShoppingPage = lazy(() => import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })))

/** Neutral placeholder while a split chunk loads; avoids a layout jump. */
const RouteFallback = () => (
  <div style={{ padding: '16px 0' }} aria-busy="true" aria-live="polite">
    <div className="skeleton" style={{ height: '32px', width: '45%', marginBottom: '20px', borderRadius: '8px' }} />
    <div className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-lg)' }} />
    <span className="sr-only">Loading…</span>
  </div>
)

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(null)
  const { settings, loading: settingsLoading } = useSettings()
  // Watching here means every screen benefits, and the prompt appears only once the
  // app has finished starting up rather than on top of the splash.
  const { updateReady, applyUpdate, dismissUpdate } = useServiceWorkerUpdate()
  const showUpdatePrompt = updateReady && !settingsLoading

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err)
        setDbError(err.message)
      })
  }, [])

  if (dbError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-4)', minHeight: '100dvh', padding: 'var(--space-8)',
        textAlign: 'center', background: 'var(--surface-base)',
      }}>
        <span style={{
          display: 'grid', placeItems: 'center', width: 56, height: 56,
          borderRadius: 'var(--radius-full)', background: 'var(--danger-soft)', color: 'var(--danger)',
        }}>
          <Icon name="warning" size={26} />
        </span>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)' }}>
          The database could not be opened
        </h1>
        <p style={{ margin: 0, maxWidth: '36ch', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {dbError}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          <Icon name="refresh" size={17} /> Try again
        </button>
      </div>
    )
  }

  if (!dbReady || settingsLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-3)', minHeight: '100dvh', background: 'var(--surface-base)',
        backgroundImage: 'var(--ambient-1), var(--ambient-2)',
      }}>
        <span
          className="animate-pulse"
          style={{
            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--weight-bold)', letterSpacing: '-0.035em',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}
        >
          Dastarkhwan
        </span>
        <span lang="ur" dir="rtl" style={{ fontFamily: 'var(--font-urdu)', fontSize: 'var(--text-xl)', color: 'var(--accent)', lineHeight: 1.6 }}>
          دسترخوان
        </span>
        <div className="skeleton" style={{ width: 180, height: 4, marginTop: 'var(--space-4)' }} />
      </div>
    )
  }

  // Show onboarding if not completed
  if (!settings?.onboardingComplete) {
    return (
      <Suspense fallback={<div className="skeleton" style={{ height: '100vh' }} />}>
        <OnboardingWizard />
      </Suspense>
    )
  }

  return (
    <AppShell>
      {showUpdatePrompt && (
        <UpdatePrompt onUpdate={applyUpdate} onDismiss={dismissUpdate} />
      )}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
