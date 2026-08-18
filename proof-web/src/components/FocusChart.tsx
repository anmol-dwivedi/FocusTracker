import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { DailyPoint } from '../lib/analytics'
import { fmtMinutes } from '../lib/format'

interface Props {
  data: DailyPoint[]
  dark: boolean
}

export function FocusChart({ data, dark }: Props) {
  const bar = dark ? '#d7dae0' : '#2b2f36'
  const empty = dark ? '#1b1d21' : '#eff0f2'
  const axis = dark ? '#868c96' : '#6b7178'

  if (!data.length) {
    return <p className="proof-faint py-12 text-center text-sm">No focus logged in this range</p>
  }

  const tickInterval = data.length <= 8 ? 0 : Math.max(0, Math.floor(data.length / 6) - 1)

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            interval={tickInterval}
            tickLine={false}
            axisLine={false}
            tick={{ fill: axis, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              background: dark ? '#131417' : '#ffffff',
              border: `1px solid ${dark ? '#25282e' : '#e4e6ea'}`,
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: axis }}
            itemStyle={{ color: dark ? '#f2f3f5' : '#0e0f12' }}
            formatter={(value) => [fmtMinutes(Number(value) * 60), 'Focus']}
          />
          <Bar dataKey="minutes" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((point) => (
              <Cell key={point.date} fill={point.minutes > 0 ? bar : empty} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
