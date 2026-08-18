import { useMemo, useState } from 'react'
import { addDays, startOfDay, parseISO } from 'date-fns'
import type { FocusController } from '../hooks/useFocusSessions'
import { dailyTotals, firstSessionDate, inRange, rangeStats, counted } from '../lib/analytics'
import { fmtHm, fmtMinutes } from '../lib/format'
import { Card, Eyebrow, MetricCard, Toggle } from '../components/ui'
import { FocusChart } from '../components/FocusChart'
import { Heatmap } from '../components/Heatmap'
import { SessionTable } from '../components/SessionTable'

const RANGES: { days: number | null; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: null, label: 'All time' },
]

export function DashboardPage({
  controller,
  dark,
}: {
  controller: FocusController
  dark: boolean
}) {
  const { sessions, remove } = controller
  const [days, setDays] = useState<number | null>(7)

  const stats = useMemo(() => rangeStats(sessions, days), [sessions, days])
  const life = useMemo(() => rangeStats(sessions, null), [sessions])
  const first = useMemo(() => firstSessionDate(sessions), [sessions])

  const chartData = useMemo(() => {
    const today = startOfDay(new Date())
    let start = addDays(today, -(days ? days - 1 : 29))
    if (!days && first) {
      const earliest = startOfDay(parseISO(first))
      const capped = addDays(today, -179)
      start = earliest > capped ? earliest : capped
    }
    return dailyTotals(sessions, start, today)
  }, [sessions, days, first])

  const history = useMemo(
    () => inRange(counted(sessions), days).slice(0, 500),
    [sessions, days],
  )

  const exportCsv = () => {
    const rows = [
      ['id', 'session_date', 'started_at', 'ended_at', 'planned_minutes', 'actual_minutes', 'status', 'label'],
      ...sessions.map((s) => [
        s.id,
        s.session_date,
        s.started_at,
        s.ended_at ?? '',
        (s.planned_seconds / 60).toFixed(1),
        ((s.actual_seconds ?? 0) / 60).toFixed(1),
        s.status,
        (s.label ?? '').replace(/"/g, '""'),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `proof-sessions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="proof-text mr-3 text-base font-bold">The evidence</h2>
          {RANGES.map((range) => (
            <Toggle
              key={range.label}
              active={days === range.days}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </Toggle>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="proof-surface proof-text rounded-lg border px-3 py-2 text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard value={fmtHm(stats.total)} caption="Focus time" />
        <MetricCard value={String(stats.sessions)} caption="Sessions" />
        <MetricCard
          value={stats.sessions ? fmtMinutes(stats.average) : '—'}
          caption="Average session"
        />
        <MetricCard
          value={stats.sessions ? fmtMinutes(stats.longest) : '—'}
          caption="Longest session"
        />
      </div>

      <Card className="mt-4">
        <Eyebrow>Focus by day {days ? `— last ${days} days` : '— all time'}</Eyebrow>
        <div className="mt-3">
          <FocusChart data={chartData} dark={dark} />
        </div>
      </Card>

      <Card className="mt-4">
        <Eyebrow>Consistency — last 26 weeks</Eyebrow>
        <div className="mt-3">
          <Heatmap sessions={sessions} dark={dark} />
        </div>
      </Card>

      <Card className="mt-4">
        <Eyebrow>Session history</Eyebrow>
        <div className="mt-2">
          <SessionTable sessions={history} onDelete={(id) => void remove(id)} />
        </div>
      </Card>

      <p className="proof-muted mt-5 text-sm">
        {life.sessions > 0
          ? `Since you started${first ? ` on ${first}` : ''}: ${fmtHm(life.total)} focused — ${
              life.sessions
            } sessions — ${life.activeDays} active days`
          : 'Your evidence starts with the first session.'}
      </p>
    </div>
  )
}
