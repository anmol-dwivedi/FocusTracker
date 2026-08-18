import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FocusSession } from '../types'
import type { SessionStore } from '../lib/store'

export interface FocusController {
  sessions: FocusSession[]
  active: FocusSession | null
  remaining: number
  elapsed: number
  loading: boolean
  error: string | null
  justCompleted: FocusSession | null
  dismissCompleted: () => void
  start: (plannedSeconds: number, label: string | null) => Promise<void>
  endEarly: () => Promise<void>
  cancel: () => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * The countdown is never a decrementing counter. It is always
 * expected_end minus the wall clock, so a refresh, a sleeping laptop,
 * or a throttled background tab cannot corrupt it.
 */
export function useFocusSessions(store: SessionStore): FocusController {
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [justCompleted, setJustCompleted] = useState<FocusSession | null>(null)
  const completing = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const rows = await store.list()
      setSessions(rows)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your sessions.')
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const active = useMemo(
    () => sessions.find((s) => s.status === 'active') ?? null,
    [sessions],
  )

  const expectedEnd = useMemo(() => {
    if (!active) return null
    return new Date(active.started_at).getTime() + active.planned_seconds * 1000
  }, [active])

  // Only run the clock while something is actually running.
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])

  const remaining = expectedEnd ? Math.max(0, (expectedEnd - now) / 1000) : 0
  const elapsed = active ? Math.max(0, (now - new Date(active.started_at).getTime()) / 1000) : 0

  // Auto-complete, including a session whose time elapsed while the tab was closed.
  useEffect(() => {
    if (!active || !expectedEnd) return
    if (now < expectedEnd) return
    if (completing.current === active.id) return
    completing.current = active.id
    const finished = active
    void (async () => {
      try {
        await store.finish(
          active.id,
          'completed',
          active.planned_seconds,
          new Date(expectedEnd).toISOString(),
        )
        await refresh()
        setJustCompleted(finished)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that session.')
      }
    })()
  }, [active, expectedEnd, now, store, refresh])

  const start = useCallback(
    async (plannedSeconds: number, label: string | null) => {
      completing.current = null
      setJustCompleted(null)
      try {
        await store.start(plannedSeconds, label)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start that session.')
      }
    },
    [store, refresh],
  )

  const endEarly = useCallback(async () => {
    if (!active) return
    const actual = Math.min(Math.round(elapsed), active.planned_seconds)
    completing.current = active.id
    try {
      await store.finish(active.id, 'ended_early', actual)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that session.')
    }
  }, [active, elapsed, store, refresh])

  const cancel = useCallback(async () => {
    if (!active) return
    completing.current = active.id
    try {
      await store.finish(active.id, 'cancelled', 0)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard that session.')
    }
  }, [active, store, refresh])

  const remove = useCallback(
    async (id: string) => {
      try {
        await store.remove(id)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete that session.')
      }
    },
    [store, refresh],
  )

  return {
    sessions,
    active,
    remaining,
    elapsed,
    loading,
    error,
    justCompleted,
    dismissCompleted: () => setJustCompleted(null),
    start,
    endEarly,
    cancel,
    remove,
    refresh,
  }
}
