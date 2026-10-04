import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FocusSession } from '../types'
import type { SessionStore } from '../lib/store'
import { playCompletionChime, unlockAudio } from '../lib/sound'

export interface FocusController {
  sessions: FocusSession[]
  active: FocusSession | null
  isPaused: boolean
  remaining: number
  elapsed: number
  loading: boolean
  error: string | null
  justCompleted: FocusSession | null
  dismissCompleted: () => void
  start: (plannedSeconds: number, label: string | null) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  endEarly: () => Promise<void>
  cancel: () => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

/** A completion older than this was missed while the tab was closed, so it stays silent. */
const CHIME_GRACE_MS = 5000

/**
 * The countdown is never a decrementing counter. It is always
 * expected_end minus the wall clock, so a refresh, a sleeping laptop,
 * or a throttled background tab cannot corrupt it.
 *
 * Pausing works by pushing expected_end forward for exactly as long as
 * the session stays paused. Because the paused time grows at the same
 * rate as the clock, the remaining time freezes on its own, with no
 * special case in the display, and a refresh mid-pause resumes paused.
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

  const isPaused = Boolean(active?.paused_at)

  /** Total seconds this session has spent paused, including the pause in progress. */
  const pausedSoFar = useMemo(() => {
    if (!active) return 0
    const banked = active.paused_seconds ?? 0
    if (!active.paused_at) return banked
    return banked + Math.max(0, (now - new Date(active.paused_at).getTime()) / 1000)
  }, [active, now])

  const expectedEnd = useMemo(() => {
    if (!active) return null
    return new Date(active.started_at).getTime() + (active.planned_seconds + pausedSoFar) * 1000
  }, [active, pausedSoFar])

  // Only run the clock while something is actually running.
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])

  const remaining = expectedEnd ? Math.max(0, (expectedEnd - now) / 1000) : 0

  /** Real focus time: wall-clock elapsed, minus everything spent paused. */
  const elapsed = active
    ? Math.max(0, (now - new Date(active.started_at).getTime()) / 1000 - pausedSoFar)
    : 0

  // Auto-complete, including a session whose time elapsed while the tab was closed.
  // A paused session can never reach this: expected_end moves with the clock.
  useEffect(() => {
    if (!active || !expectedEnd || isPaused) return
    if (now < expectedEnd) return
    if (completing.current === active.id) return
    completing.current = active.id
    const finished = active
    // Ring only for a session that just ran out in front of you, not one
    // that quietly expired while the laptop was shut.
    const shouldChime = Date.now() - expectedEnd < CHIME_GRACE_MS
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
        if (shouldChime) playCompletionChime()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that session.')
      }
    })()
  }, [active, expectedEnd, isPaused, now, store, refresh])

  const start = useCallback(
    async (plannedSeconds: number, label: string | null) => {
      // This call is inside the START FOCUS click, which is the only moment
      // the browser will let us open an audio context. Without it, the chime
      // at the end of the session is silently blocked.
      unlockAudio()
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

  const pause = useCallback(async () => {
    if (!active || active.paused_at) return
    try {
      await store.pause(active.id, new Date().toISOString())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pause that session.')
    }
  }, [active, store, refresh])

  const resume = useCallback(async () => {
    if (!active || !active.paused_at) return
    // Resuming is also a click, so take the chance to keep the context awake.
    unlockAudio()
    const banked = (active.paused_seconds ?? 0)
      + Math.max(0, (Date.now() - new Date(active.paused_at).getTime()) / 1000)
    try {
      await store.resume(active.id, banked)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resume that session.')
    }
  }, [active, store, refresh])

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
    isPaused,
    remaining,
    elapsed,
    loading,
    error,
    justCompleted,
    dismissCompleted: () => setJustCompleted(null),
    start,
    pause,
    resume,
    endEarly,
    cancel,
    remove,
    refresh,
  }
}
