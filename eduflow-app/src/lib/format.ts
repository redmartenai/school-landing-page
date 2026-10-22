import { TODAY, DEMO_START_TIME } from '@/data/seed'

/* ───────── demo clock: the school day starts at 08:24 and runs in real time ───────── */

const loadedAt = Date.now()
const [h0, m0] = DEMO_START_TIME.split(':').map(Number)

/** Current demo time as local-ISO "YYYY-MM-DDTHH:MM:SS" */
export function demoNow(): string {
  const mins = h0 * 60 + m0 + Math.floor((Date.now() - loadedAt) / 60000)
  const h = Math.min(23, Math.floor(mins / 60))
  const m = mins % 60
  return `${TODAY}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

const toDate = (s: string) => new Date(s.length === 10 ? s + 'T00:00:00' : s)

export function hoursBetween(a: string, b: string) {
  return (toDate(b).getTime() - toDate(a).getTime()) / 3600e3
}

export function daysBetween(a: string, b: string) {
  return Math.round((toDate(b.slice(0, 10)).getTime() - toDate(a.slice(0, 10)).getTime()) / 864e5)
}

/* ───────── formatting ───────── */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const rupees = (n: number) => `₹${inr.format(Math.round(n))}`
/** ₹4.2L / ₹1.3Cr style for headline numbers */
export function rupeesShort(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k`
  return `₹${n}`
}
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`

export const time = (s: string) => s.slice(11, 16)

export function dateLabel(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return toDate(s).toLocaleDateString('en-IN', opts)
}
export const weekday = (s: string) => toDate(s).toLocaleDateString('en-IN', { weekday: 'long' })

/** "now", "12 min ago", "3 h ago", "Yesterday", "4 Oct" — relative to the demo clock */
export function ago(s: string, now = demoNow()) {
  const mins = Math.round(hoursBetween(s, now) * 60)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24 && s.slice(0, 10) === now.slice(0, 10)) return `${Math.round(mins / 60)} h ago`
  const d = daysBetween(s, now)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return dateLabel(s)
}

/** Friendly due-date: "Today", "Tomorrow", "Friday", "13 Oct", "2 days late" */
export function dueLabel(date: string, now = demoNow()) {
  const d = daysBetween(now, date)
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} late`
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d < 7) return weekday(date)
  return dateLabel(date)
}

export const initials = (name: string) =>
  name.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()

export const firstName = (name: string) => name.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ')[0]

export const greeting = (now = demoNow()) => {
  const h = Number(now.slice(11, 13))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const monthLabel = (ym: string) => toDate(ym + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
