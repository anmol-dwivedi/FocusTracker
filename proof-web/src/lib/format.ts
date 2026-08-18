/** 3h 45m / 45m / 0m - the headline evidence format. */
export function fmtHm(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours && minutes) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

/** Compact duration for dense lists. */
export function fmtMinutes(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  if (total < 3600) return `${Math.floor(total / 60)}m`
  return fmtHm(total)
}

/** Countdown display. 90:00 rather than 1:30:00 - one unbroken number. */
export function fmtClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed'
    case 'ended_early': return 'Ended early'
    case 'cancelled': return 'Cancelled'
    case 'active': return 'Running'
    default: return status
  }
}

/** Local calendar date as YYYY-MM-DD. Never use toISOString here - it is UTC. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
