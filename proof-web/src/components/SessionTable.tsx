import type { FocusSession } from '../types'
import { fmtMinutes, statusLabel } from '../lib/format'

interface Props {
  sessions: FocusSession[]
  onDelete: (id: string) => void
}

export function SessionTable({ sessions, onDelete }: Props) {
  if (!sessions.length) {
    return (
      <p className="proof-faint py-8 text-center text-sm">
        No sessions in this range. Start one on the Focus tab.
      </p>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="proof-muted sticky top-0 proof-surface text-[10px] font-bold tracking-[0.14em] uppercase">
          <tr>
            <th className="py-2 pr-4 font-bold">Date</th>
            <th className="py-2 pr-4 font-bold">Start</th>
            <th className="py-2 pr-4 font-bold">Planned</th>
            <th className="py-2 pr-4 font-bold">Actual</th>
            <th className="py-2 pr-4 font-bold">Status</th>
            <th className="py-2 pr-4 font-bold">Label</th>
            <th className="py-2 font-bold" />
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="proof-border border-t">
              <td className="proof-muted py-2 pr-4 whitespace-nowrap">{s.session_date}</td>
              <td className="proof-muted py-2 pr-4 whitespace-nowrap">
                {new Date(s.started_at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="proof-muted py-2 pr-4">{fmtMinutes(s.planned_seconds)}</td>
              <td className="proof-text py-2 pr-4 font-medium">{fmtMinutes(s.actual_seconds)}</td>
              <td className="proof-muted py-2 pr-4 whitespace-nowrap">{statusLabel(s.status)}</td>
              <td className="proof-muted py-2 pr-4">{s.label ?? ''}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="proof-faint hover:proof-text text-xs transition-colors"
                  aria-label="Delete this session"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
