import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { initializeDatabase } from './data/db'
import { useSettings } from './hooks/useDatabase'
import { AppShell } from './components/layout/AppShell'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import { HomePage } from './pages/HomePage'
import { CalendarPage } from './pages/CalendarPage'
import { RecipesPage } from './pages/RecipesPage'
import { FamilyPage } from './pages/FamilyPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(null)
  const { settings, loading: settingsLoading } = useSettings()

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-error)',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'var(--font-body)'
      }}>
        <h2>⚠️ Database Error</h2>
        <p>{dbError}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!dbReady || settingsLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-primary)',
        fontFamily: 'var(--font-heading)'
      }}>
        <div className="animate-pulse" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
          Dastarkhwan
        </div>
        <div style={{ 
          fontFamily: "'Noto Nastaliq Urdu', serif", 
          fontSize: '1.5rem', 
          marginTop: '0.5rem',
          color: 'var(--color-text-secondary)'
        }}>
          دسترخوان
        </div>
        <div className="skeleton" style={{ 
          width: '200px', 
          height: '4px', 
          marginTop: '2rem',
          borderRadius: '2px'
        }} />
      </div>
    )
  }

  // Show onboarding if not completed
  if (!settings?.onboardingComplete) {
    return <OnboardingWizard />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/family" element={<FamilyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
