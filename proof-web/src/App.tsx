import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isCloudMode, supabase } from './lib/supabase'
import { CloudStore, LocalStore, type SessionStore } from './lib/store'
import { useFocusSessions } from './hooks/useFocusSessions'
import { FocusPage } from './pages/FocusPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { Toggle } from './components/ui'

type View = 'focus' | 'dashboard'

export default function App() {
  const [view, setView] = useState<View>('focus')
  const [dark, setDark] = useState(true)
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isCloudMode)

  useEffect(() => {
    const stored = window.localStorage.getItem('proof.theme')
    if (stored) setDark(stored === 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    window.localStorage.setItem('proof.theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setAuthSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setAuthSession(next)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = authSession?.user.id ?? null

  const store = useMemo<SessionStore>(
    () => (isCloudMode && userId ? new CloudStore(userId) : new LocalStore()),
    [userId],
  )

  const controller = useFocusSessions(store)

  if (!authReady) {
    return (
      <main className="proof-bg proof-muted flex min-h-screen items-center justify-center text-sm">
        Loading…
      </main>
    )
  }

  if (isCloudMode && !authSession) {
    return (
      <main className="proof-bg min-h-screen px-6">
        <LoginPage />
      </main>
    )
  }

  return (
    <main className="proof-bg min-h-screen">
      <header className="proof-border border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="proof-text text-sm font-bold tracking-tight">PROOF</span>
            <span className="proof-faint hidden text-xs sm:inline">
              Do the work. Keep the evidence.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Toggle active={view === 'focus'} onClick={() => setView('focus')}>
              Focus
            </Toggle>
            <Toggle active={view === 'dashboard'} onClick={() => setView('dashboard')}>
              Dashboard
            </Toggle>
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className="proof-muted hover:proof-text px-2 py-2 text-sm transition-colors"
            >
              {dark ? 'Light' : 'Dark'}
            </button>
            {isCloudMode && authSession && (
              <button
                type="button"
                onClick={() => void supabase?.auth.signOut()}
                className="proof-faint hover:proof-text px-2 py-2 text-sm transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {!isCloudMode && (
        <div className="proof-border border-b">
          <p className="proof-faint mx-auto max-w-5xl px-6 py-2 text-xs">
            Local mode — sessions are stored in this browser only. Add Supabase keys to sync across
            devices.
          </p>
        </div>
      )}

      {controller.error && (
        <div className="proof-border border-b">
          <p className="proof-text mx-auto max-w-5xl px-6 py-2 text-xs">{controller.error}</p>
        </div>
      )}

      <div className="px-6 py-8">
        {controller.loading ? (
          <p className="proof-muted text-center text-sm">Loading your evidence…</p>
        ) : view === 'focus' ? (
          <FocusPage controller={controller} />
        ) : (
          <DashboardPage controller={controller} dark={dark} />
        )}
      </div>
    </main>
  )
}
