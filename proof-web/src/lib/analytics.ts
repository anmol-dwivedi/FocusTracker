import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { COUNTED, type FocusSession } from '../types'
import { localDateKey } from './format'

export interface Stats {
  sessions: number
  total: number
  average: number
  longest: number
  activeDays: number
}

export function counted(sessions: FocusSession[]): FocusSession[] {
  return sessions.filter((s) => COUNTED.includes(s.status))
}

/** days = null means all time. */
export function rangeStats(sessions: FocusSession[], days: number | null): Stats {
  const rows = inRange(counted(sessions), days)
  const total = rows.reduce((sum, r) => sum + (r.actual_seconds ?? 0), 0)
  const longest = rows.reduce((max, r) => Math.max(max, r.actual_seconds ?? 0), 0)
  const activeDays = new Set(rows.map((r) => r.session_date)).size
  return {
    sessions: rows.length,
    total,
    average: rows.length ? Math.round(total / rows.length) : 0,
    longest,
    activeDays,
  }
}

export function inRange(sessions: FocusSession[], days: number | null): FocusSession[] {
  if (!days) return sessions
  const cutoff = localDateKey(addDays(startOfDay(new Date()), -(days - 1)))
  return sessions.filter((s) => s.session_date >= cutoff)
}

export interface DailyPoint {
  date: string
  label: string
  seconds: number
  minutes: number
}

/** Every day in the span, gaps filled with zero, so the chart never lies by omission. */
export function dailyTotals(sessions: FocusSession[], start: Date, end: Date): DailyPoint[] {
  const totals = new Map<string, number>()
  for (const s of counted(sessions)) {
    totals.set(s.session_date, (totals.get(s.session_date) ?? 0) + (s.actual_seconds ?? 0))
  }
  const span = Math.max(0, differenceInCalendarDays(end, start))
  const points: DailyPoint[] = []
  for (let i = 0; i <= span; i++) {
    const day = addDays(startOfDay(start), i)
    const key = localDateKey(day)
    const seconds = totals.get(key) ?? 0
    points.push({
      date: key,
      label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      seconds,
      minutes: Math.round(seconds / 60),
    })
  }
  return points
}

export function firstSessionDate(sessions: FocusSession[]): string | null {
  const rows = counted(sessions)
  if (!rows.length) return null
  return rows.reduce((min, r) => (r.session_date < min ? r.session_date : min), rows[0].session_date)
}

export function todaySummary(sessions: FocusSession[]): { sessions: number; total: number } {
  const key = localDateKey(new Date())
  const rows = counted(sessions).filter((s) => s.session_date === key)
  return {
    sessions: rows.length,
    total: rows.reduce((sum, r) => sum + (r.actual_seconds ?? 0), 0),
  }
}
