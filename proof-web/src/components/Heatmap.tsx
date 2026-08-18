import { addDays, startOfWeek } from 'date-fns'
import type { FocusSession } from '../types'
import { counted } from '../lib/analytics'
import { fmtMinutes, localDateKey } from '../lib/format'

const WEEKS = 26

const RAMP_DARK = ['#16181c', '#2e3238', '#4c525b', '#7a828d', '#b9c0c9', '#f2f3f5']
const RAMP_LIGHT = ['#f0f1f3', '#d3d6db', '#a9aeb6', '#767c85', '#464b53', '#0e0f12']

export function Heatmap({ sessions, dark }: { sessions: FocusSession[]; dark: boolean }) {
  const ramp = dark ? RAMP_DARK : RAMP_LIGHT
  const totals = new Map<string, number>()
  for (const s of counted(sessions)) {
    totals.set(s.session_date, (totals.get(s.session_date) ?? 0) + (s.actual_seconds ?? 0))
  }
  const peak = Math.max(0, ...totals.values())

  const today = new Date()
  const gridStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), -7 * (WEEKS - 1))

  const columns = Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, dow) => addDays(gridStart, week * 7 + dow)),
  )

  const shade = (seconds: number): string => {
    if (seconds <= 0 || peak <= 0) return ramp[0]
    const level = Math.ceil((seconds / peak) * (ramp.length - 1))
    return ramp[Math.min(ramp.length - 1, Math.max(1, level))]
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const key = localDateKey(day)
              const seconds = totals.get(key) ?? 0
              const future = day > today
              return (
                <div
                  key={key}
                  title={future ? '' : `${key} - ${fmtMinutes(seconds)}`}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ background: future ? 'transparent' : shade(seconds) }}
                />
              )
            })}
          </div>
        ))}
        <div className="ml-4 flex items-start gap-[3px] self-start">
          <span className="proof-faint mr-1 text-[10px] leading-3">less</span>
          {ramp.map((colour) => (
            <div key={colour} className="h-3 w-3 rounded-[2px]" style={{ background: colour }} />
          ))}
          <span className="proof-faint ml-1 text-[10px] leading-3">more</span>
        </div>
      </div>
    </div>
  )
}
