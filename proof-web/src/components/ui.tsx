import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`proof-surface rounded-xl border p-5 ${className}`}>{children}</div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="proof-muted text-[10px] font-bold tracking-[0.14em] uppercase">{children}</p>
  )
}

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
        active ? 'proof-invert border-transparent' : 'proof-surface proof-text border'
      }`}
    >
      {children}
    </button>
  )
}

export function Primary({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`proof-invert rounded-xl px-10 py-3.5 text-sm font-bold tracking-[0.1em] transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function Quiet({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="proof-muted hover:proof-text rounded-lg px-3 py-2 text-sm transition-colors"
    >
      {children}
    </button>
  )
}

export function MetricCard({ value, caption }: { value: string; caption: string }) {
  return (
    <Card>
      <p className="proof-text timer-numerals text-3xl">{value}</p>
      <p className="proof-muted mt-1.5 text-[10px] font-bold tracking-[0.14em] uppercase">
        {caption}
      </p>
    </Card>
  )
}
