import { useState } from 'react'
import { PRESETS } from '../types'
import type { FocusController } from '../hooks/useFocusSessions'
import { fmtClock, fmtHm, fmtMinutes } from '../lib/format'
import { todaySummary } from '../lib/analytics'
import { Card, Eyebrow, Primary, Quiet, Toggle } from '../components/ui'

export function FocusPage({ controller }: { controller: FocusController }) {
  const { active, remaining, sessions, start, endEarly, cancel, justCompleted, dismissCompleted } =
    controller
  const [minutes, setMinutes] = useState(45)
  const [custom, setCustom] = useState('')
  const [label, setLabel] = useState('')

  const today = todaySummary(sessions)
  const display = active ? fmtClock(remaining) : fmtClock(minutes * 60)

  const applyCustom = () => {
    const value = Math.round(Number(custom))
    if (!Number.isFinite(value) || value < 1 || value > 480) return
    setMinutes(value)
    setCustom('')
  }

  const recent = sessions.filter((s) => s.status !== 'cancelled' && s.status !== 'active').slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-4xl">
      {justCompleted && (
        <div className="proof-surface mb-6 flex items-center justify-between rounded-xl border px-5 py-3">
          <p className="proof-text text-sm">
            Session complete. {fmtHm(justCompleted.planned_seconds)} logged.
            {justCompleted.label ? ` ${justCompleted.label}` : ''}
          </p>
          <Quiet onClick={dismissCompleted}>Dismiss</Quiet>
        </div>
      )}

      <div className="flex flex-col items-center py-6 sm:py-10">
        <p className="proof-text timer-numerals text-[19vw] leading-none sm:text-[7.5rem]">
          {display}
        </p>
        <p className="proof-muted mt-3 text-sm">
          {active
            ? `Session ${today.sessions + 1} today${active.label ? ` — ${active.label}` : ''}`
            : `${minutes} minute session`}
        </p>

        {active ? (
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3">
              <Primary onClick={() => void endEarly()}>END EARLY</Primary>
              <Quiet onClick={() => void cancel()}>Cancel</Quiet>
            </div>
            <p className="proof-faint mt-3 text-xs">
              Ending early logs the minutes you actually did.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex w-full flex-col items-center">
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((preset) => (
                <Toggle key={preset} active={minutes === preset} onClick={() => setMinutes(preset)}>
                  {preset}
                </Toggle>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <label className="proof-muted text-sm" htmlFor="custom">
                Custom
              </label>
              <input
                id="custom"
                type="number"
                min={1}
                max={480}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                className="proof-surface proof-text w-20 rounded-lg border px-3 py-2 text-center text-sm"
              />
              <span className="proof-muted text-sm">min</span>
              <Toggle active={false} onClick={applyCustom}>
                Set
              </Toggle>
            </div>

            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="proof-surface proof-text mt-4 w-full max-w-md rounded-lg border px-4 py-2.5 text-sm"
            />

            <Primary
              className="mt-6"
              onClick={() => void start(minutes * 60, label.trim() || null)}
            >
              START FOCUS
            </Primary>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <Eyebrow>Today</Eyebrow>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="proof-text timer-numerals text-3xl">{fmtHm(today.total)}</span>
            <span className="proof-muted text-sm">
              {today.sessions} session{today.sessions === 1 ? '' : 's'}
            </span>
          </div>
        </Card>

        <Card>
          <Eyebrow>Recent sessions</Eyebrow>
          <div className="mt-3 space-y-1.5">
            {recent.length === 0 && (
              <p className="proof-faint text-sm">No sessions yet. Start one above.</p>
            )}
            {recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <span className="proof-muted w-24 shrink-0">{s.session_date}</span>
                <span className="proof-muted w-12 shrink-0">
                  {new Date(s.started_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="proof-text w-14 shrink-0 font-medium">
                  {fmtMinutes(s.actual_seconds)}
                </span>
                <span className="proof-faint truncate">
                  {s.label ?? (s.status === 'ended_early' ? 'ended early' : '')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
