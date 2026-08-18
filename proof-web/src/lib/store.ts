import { supabase } from './supabase'
import type { FocusSession, SessionStatus } from '../types'
import { localDateKey } from './format'

export interface SessionStore {
  list(): Promise<FocusSession[]>
  start(plannedSeconds: number, label: string | null): Promise<FocusSession>
  finish(id: string, status: SessionStatus, actualSeconds: number, endedAt?: string): Promise<void>
  remove(id: string): Promise<void>
}

function newRow(plannedSeconds: number, label: string | null): FocusSession {
  const now = new Date()
  const stamp = now.toISOString()
  return {
    id: crypto.randomUUID(),
    session_date: localDateKey(now),
    started_at: stamp,
    ended_at: null,
    planned_seconds: plannedSeconds,
    actual_seconds: null,
    status: 'active',
    label: label?.trim() || null,
    notes: null,
    created_at: stamp,
    updated_at: stamp,
  }
}

const LOCAL_KEY = 'proof.sessions.v1'

/** Browser-only store. No account, no network. */
export class LocalStore implements SessionStore {
  private read(): FocusSession[] {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as FocusSession[]) : []
    } catch {
      return []
    }
  }

  private write(rows: FocusSession[]): void {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
    } catch {
      /* storage full or blocked - the in-memory state still works this session */
    }
  }

  async list(): Promise<FocusSession[]> {
    return this.read().sort((a, b) => b.started_at.localeCompare(a.started_at))
  }

  async start(plannedSeconds: number, label: string | null): Promise<FocusSession> {
    const rows = this.read()
    // Close out anything left active by an earlier tab.
    const stamp = new Date().toISOString()
    for (const row of rows) {
      if (row.status === 'active') {
        row.status = 'cancelled'
        row.actual_seconds = 0
        row.ended_at = stamp
        row.updated_at = stamp
      }
    }
    const row = newRow(plannedSeconds, label)
    rows.push(row)
    this.write(rows)
    return row
  }

  async finish(id: string, status: SessionStatus, actualSeconds: number, endedAt?: string): Promise<void> {
    const rows = this.read()
    const stamp = endedAt ?? new Date().toISOString()
    const row = rows.find((r) => r.id === id)
    if (!row) return
    row.status = status
    row.actual_seconds = Math.max(0, Math.round(actualSeconds))
    row.ended_at = stamp
    row.updated_at = stamp
    this.write(rows)
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((r) => r.id !== id))
  }
}

/** Supabase-backed store. Row Level Security scopes every query to the signed-in user. */
export class CloudStore implements SessionStore {
  constructor(private userId: string) {}

  async list(): Promise<FocusSession[]> {
    const { data, error } = await supabase!
      .from('focus_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(2000)
    if (error) throw error
    return (data ?? []) as FocusSession[]
  }

  async start(plannedSeconds: number, label: string | null): Promise<FocusSession> {
    const stamp = new Date().toISOString()
    await supabase!
      .from('focus_sessions')
      .update({ status: 'cancelled', actual_seconds: 0, ended_at: stamp, updated_at: stamp })
      .eq('status', 'active')

    const row = newRow(plannedSeconds, label)
    const { data, error } = await supabase!
      .from('focus_sessions')
      .insert({ ...row, user_id: this.userId })
      .select()
      .single()
    if (error) throw error
    return data as FocusSession
  }

  async finish(id: string, status: SessionStatus, actualSeconds: number, endedAt?: string): Promise<void> {
    const stamp = endedAt ?? new Date().toISOString()
    const { error } = await supabase!
      .from('focus_sessions')
      .update({
        status,
        actual_seconds: Math.max(0, Math.round(actualSeconds)),
        ended_at: stamp,
        updated_at: stamp,
      })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase!.from('focus_sessions').delete().eq('id', id)
    if (error) throw error
  }
}
