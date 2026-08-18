export type SessionStatus = 'active' | 'completed' | 'ended_early' | 'cancelled'

/** Counted as real focus. Cancelled sessions never enter the evidence. */
export const COUNTED: SessionStatus[] = ['completed', 'ended_early']

export interface FocusSession {
  id: string
  session_date: string
  started_at: string
  ended_at: string | null
  planned_seconds: number
  actual_seconds: number | null
  status: SessionStatus
  label: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const PRESETS = [25, 45, 60, 90] as const
