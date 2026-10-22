/* Shared helpers for the Principal web surface. Local to this folder on purpose. */
import { motion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx, ease, toneClass, type Tone } from '@/components/ui'
import { useSchool } from '@/store/school'
import { DEMO } from '@/store/hooks'
import type { AttendanceMark, Staff, StaffDay } from '@/data/types'
import type { StudentRisk } from '@/engine/monitoring'

export const BASE = '/principal'
export const ME = DEMO.principalId

/** id → display name across staff, parents and students. */
export function useNameOf() {
  const staff = useSchool(s => s.staff)
  const parents = useSchool(s => s.parents)
  const students = useSchool(s => s.students)
  return useMemo(() => {
    const m = new Map<string, string>()
    for (const x of staff) m.set(x.id, x.name)
    for (const x of parents) m.set(x.id, x.name)
    for (const x of students) m.set(x.id, x.name)
    return (id: string | null | undefined) => (id && m.get(id)) || 'Someone'
  }, [staff, parents, students])
}

/** Today's staff attendance row, if the person has one for the demo day. */
export function staffToday(s: Staff, today: string): StaffDay | null {
  const last = s.attendance[s.attendance.length - 1]
  return last && last.date === today ? last : null
}

export const staffStatusTone: Record<StaffDay['status'], Tone> = { present: 'forest', late: 'amber', absent: 'rust', leave: 'slate' }
export const staffStatusLabel: Record<StaffDay['status'], string> = { present: 'In', late: 'Late', absent: 'Absent', leave: 'On leave' }

export const riskTone: Record<StudentRisk['level'], Tone> = { 'at-risk': 'rust', watch: 'amber', ok: 'forest' }
export const riskLabel: Record<StudentRisk['level'], string> = { 'at-risk': 'At risk', watch: 'Watch', ok: 'On track' }

export const markColor: Record<AttendanceMark, string> = { P: 'bg-forest-l', L: 'bg-amber', A: 'bg-rust' }

/** Pure colour values for animating background/border (Framer can't tween Tailwind classes). */
export const HEX = {
  forest: '#2E5D4E', forestL: '#417A66', forestP: '#E4EDE9',
  copper: '#B4763A', copperP: '#F7EDE0',
  amber: '#E0A53F', amberP: '#FBF0D9',
  rust: '#A4483A', rustP: '#F5E3DF',
  slate: '#4E5A66', slateP: '#E7EBEE',
  stone: '#8B8377', stoneL: '#B6AFA3', stoneP: '#DCD6CB',
  line: '#E2DCD1', line2: '#EDE8DF', ivory2: '#FDFCF8', paper: '#F0EBE2', ink: '#241F1B',
}

/** 60-day attendance heat strip. Today (if marked) is outlined. */
export function AttendanceStrip({ marks, dates, todayIndex, size = 11 }: { marks: AttendanceMark[]; dates?: string[]; todayIndex?: number; size?: number }) {
  return (
    <div className="flex flex-wrap gap-[3px]">
      {marks.map((m, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(i, 60) * 0.008, duration: 0.25, ease: ease.out }}
          title={`${dates?.[i] ?? `Day ${i + 1}`} · ${m === 'P' ? 'Present' : m === 'L' ? 'Late' : 'Absent'}`}
          style={{ width: size, height: size }}
          className={cx('rounded-[3px]', markColor[m], i === todayIndex && 'ring-2 ring-ink/40 ring-offset-1 ring-offset-ivory-2')}
        />
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-stone">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-[3px]', i.className)} />{i.label}</span>
      ))}
    </div>
  )
}

/** Horizontal labelled bar — used for categories, subjects, classes. */
export function HBar({ label, value, max, tone = 'forest', right, sub }: { label: ReactNode; value: number; max: number; tone?: Tone; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate text-charcoal">{label}{sub && <span className="ml-1.5 text-stone">{sub}</span>}</span>
        <span className="shrink-0 tabular font-medium text-ink">{right ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line-2">
        <motion.div className={cx('h-full rounded-full', toneClass[tone].dot)} initial={{ width: 0 }} animate={{ width: `${max ? Math.min(1, value / max) * 100 : 0}%` }} transition={{ duration: 0.8, ease: ease.out }} />
      </div>
    </div>
  )
}

/** Small square icon badge in a tone. */
export function ToneIcon({ icon: Icon, tone = 'stone', size = 34 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center rounded-[10px]', toneClass[tone].bg, toneClass[tone].text)}>
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} />
    </span>
  )
}

/** Key/value metric row. */
export function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11.5px] text-stone">{label}</div>
      <div className={cx('tabular text-[14px] font-medium', tone ? toneClass[tone].text : 'text-ink')}>{value}</div>
    </div>
  )
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const pct0 = (n: number) => `${Math.round(n * 100)}%`
