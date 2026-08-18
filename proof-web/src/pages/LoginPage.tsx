import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!supabase) return
    setBusy(true)
    setMessage(null)
    const credentials = { email: email.trim(), password }
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)
    if (error) setMessage(error.message)
    else if (mode === 'signup') setMessage('Account created. Check your email if confirmation is on, then sign in.')
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center">
      <h1 className="proof-text text-lg font-bold tracking-tight">PROOF</h1>
      <p className="proof-muted mt-1 text-sm">Do the work. Keep the evidence.</p>

      <div className="mt-8 space-y-3">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="proof-surface proof-text w-full rounded-lg border px-4 py-2.5 text-sm"
        />
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="Password"
          className="proof-surface proof-text w-full rounded-lg border px-4 py-2.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="proof-invert w-full rounded-xl px-6 py-3 text-sm font-bold tracking-[0.1em] disabled:opacity-50"
        >
          {busy ? 'WORKING…' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </button>
      </div>

      {message && <p className="proof-muted mt-4 text-sm">{message}</p>}

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="proof-faint hover:proof-text mt-6 text-sm transition-colors"
      >
        {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
