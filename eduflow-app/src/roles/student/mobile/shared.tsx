/* Student app — shared data hooks, constants and small building blocks. */
import { motion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'
import { CircleQuestionMark, CirclePlay, FileText, type LucideIcon } from 'lucide-react'
import { cx } from '@/components/ui'
import { DEMO, useData } from '@/store/hooks'
import type { AttendanceMark, House, Lesson, Subject, TimetableSlot } from '@/data/types'

/* ───────── who she is ───────── */

/** The signed-in student, her class and the whole school (for derived, scoped reads). */
export function useStudent() {
  const d = useData()
  const s = d.students.find(x => x.id === DEMO.studentId)!
  const cls = d.classes.find(c => c.id === s.classId)!
  return { d, s, cls }
}

export const staffName = (d: ReturnType<typeof useData>, id: string | null) =>
  (id && d.staff.find(x => x.id === id)?.name) || '—'

/** "Ms. Kavya Rao" → "Ms. Rao" — how a student actually says it. */
export const teacherShort = (name: string) => {
  const m = name.match(/^(Mr|Ms|Mrs|Dr)\.\s+\S+\s+(.+)$/)
  return m ? `${m[1]}. ${m[2]}` : name
}

/* ───────── the next paper (not in the shared model yet) ───────── */

export const NEXT_EXAM = {
  name: 'Unit Test 3',
  subject: 'Mathematics' as Subject,
  at: '2026-10-12T09:00:00',
  syllabus: 'Ch 3 Polynomials · Ch 4 Quadratic Equations',
  room: '209',
}

/** Days / hours / minutes until an ISO datetime, measured on the demo clock. */
export function countdown(to: string, now: string) {
  const ms = Math.max(0, new Date(to).getTime() - new Date(now).getTime())
  const mins = Math.floor(ms / 60000)
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60, total: mins }
}

/* ───────── achievements ───────── */

export interface Achievement { id: string; title: string; detail: string; when: string; kind: 'certificate' | 'medal' | 'badge'; tone: 'forest' | 'copper' | 'slate' }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ac-1', title: 'Science Fair — 1st place', detail: 'Water filtration with coconut-shell charcoal. Judged by Dr. Iyer and two visiting scientists.', when: 'March 2026', kind: 'medal', tone: 'copper' },
  { id: 'ac-2', title: 'Perfect attendance', detail: 'Present every school day of Term 1. Signed by Ms. Rao.', when: 'Term 1 · 2026', kind: 'certificate', tone: 'forest' },
  { id: 'ac-3', title: 'Maths Olympiad — Regional qualifier', detail: 'Top 8% of 2,400 students in the Pune region.', when: 'January 2026', kind: 'certificate', tone: 'slate' },
  { id: 'ac-4', title: 'Willow House — 300 points', detail: 'Crossed 300 house points this term.', when: 'September 2026', kind: 'badge', tone: 'forest' },
]

/* ───────── visual identity: houses & subjects ───────── */

export const HOUSE_STYLE: Record<House, { fg: string; bg: string; ring: string }> = {
  Willow: { fg: '#417A66', bg: '#E4EDE9', ring: '#2E5D4E' },
  Banyan: { fg: '#96602D', bg: '#F7EDE0', ring: '#B4763A' },
  Cedar: { fg: '#4E5A66', bg: '#E7EBEE', ring: '#4E5A66' },
  Neem: { fg: '#7B5F42', bg: '#F1EADC', ring: '#7B5F42' },
}

/** Subject accents — palette tones only, and never the "status" colours amber/rust. */
export const SUBJECT_STYLE: Record<Subject, { fg: string; bg: string; short: string }> = {
  Mathematics: { fg: '#2E5D4E', bg: '#E4EDE9', short: 'Maths' },
  Science: { fg: '#96602D', bg: '#F7EDE0', short: 'Science' },
  English: { fg: '#4E5A66', bg: '#E7EBEE', short: 'English' },
  Hindi: { fg: '#7B5F42', bg: '#F1EADC', short: 'Hindi' },
  'Social Studies': { fg: '#6B5346', bg: '#EEDCC4', short: 'Social St.' },
  'Computer Science': { fg: '#3E4A54', bg: '#DCE3E6', short: 'Comp. Sci.' },
}

export const isSubject = (x: string): x is Subject => x in SUBJECT_STYLE

export function SubjectChip({ subject, className }: { subject: Subject | TimetableSlot['subject']; className?: string }) {
  const st = isSubject(subject) ? SUBJECT_STYLE[subject] : { fg: '#8B8377', bg: '#F0EBE2', short: subject }
  return (
    <span style={{ color: st.fg, backgroundColor: st.bg }} className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold', className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.fg }} />
      {st.short}
    </span>
  )
}

export function SubjectGlyph({ subject, size = 36 }: { subject: Subject; size?: number }) {
  const st = SUBJECT_STYLE[subject]
  return (
    <span style={{ color: st.fg, backgroundColor: st.bg, width: size, height: size, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-[11px] font-display">
      {subject === 'Hindi' ? 'हि' : subject === 'Computer Science' ? 'CS' : subject === 'Social Studies' ? 'SS' : subject.slice(0, 2)}
    </span>
  )
}

export const KIND_META: Record<Lesson['kind'], { icon: LucideIcon; label: string; verb: string }> = {
  video: { icon: CirclePlay, label: 'Video', verb: 'Watch' },
  notes: { icon: FileText, label: 'Notes', verb: 'Read' },
  quiz: { icon: CircleQuestionMark, label: 'Quiz', verb: 'Take quiz' },
}

/* ───────── timetable: now / next ───────── */

/** Weekday index 0=Mon..4=Fri for an ISO date, or null at weekends. */
export function weekdayIndex(isoDate: string) {
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00').getDay()
  return d >= 1 && d <= 5 ? d - 1 : null
}

export function useNowNext(now: string) {
  const { d, s } = useStudent()
  return useMemo(() => {
    const wd = weekdayIndex(now)
    const slots = wd === null ? [] : d.timetable[s.classId]?.[wd] ?? []
    const hm = now.slice(11, 16)
    const current = slots.find(x => x.start <= hm && hm < x.end) ?? null
    const next = slots.find(x => x.start > hm) ?? null
    return { slots, current, next, hm }
  }, [d.timetable, s.classId, now])
}

/** Minutes between two "HH:MM" strings. */
export const minutesBetween = (a: string, b: string) => {
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number)
  return h2 * 60 + m2 - (h1 * 60 + m1)
}

/* ───────── small pieces ───────── */

/** A card-like surface used across the student app. */
export function Panel({ children, className, onClick, tone }: { children: ReactNode; className?: string; onClick?: () => void; tone?: 'plain' | 'paper' }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={cx('block w-full rounded-[18px] border border-line text-left shadow-1', tone === 'paper' ? 'bg-paper/60' : 'bg-ivory-2', className)}
    >
      {children}
    </Comp>
  )
}

/** Thin progress ring for lesson rows (value 0..100). */
export function MiniRing({ pct, size = 30 }: { pct: number; size?: number }) {
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const done = pct >= 100
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EDE8DF" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={done ? '#2E5D4E' : pct > 0 ? '#B4763A' : '#EDE8DF'} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <span className={cx('absolute text-[9px] font-semibold tabular', done ? 'text-forest' : 'text-stone')}>
        {done ? (
          <svg width="11" height="11" viewBox="0 0 12 12" aria-label="Complete"><path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : pct > 0 ? pct : ''}
      </span>
    </span>
  )
}

/** CBSE-style grade from a percentage. */
export function grade(p: number) {
  return p >= 91 ? 'A1' : p >= 81 ? 'A2' : p >= 71 ? 'B1' : p >= 61 ? 'B2' : p >= 51 ? 'C1' : p >= 41 ? 'C2' : p >= 33 ? 'D' : 'E'
}

/* ───────── attendance calendar ───────── */

export type DayCell = { date: string; mark: AttendanceMark | 'today' | 'future' }

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Weekdays (Mon–Fri) for the last `weeks` weeks including this one, each with her mark. */
export function useAttendanceWeeks(weeks: number) {
  const { d, s } = useStudent()
  return useMemo(() => {
    const today = d.school.today
    const dow = new Date(today + 'T00:00:00Z').getUTCDay() || 7 // 1=Mon..7=Sun
    const monday = addDaysIso(today, 1 - dow - (weeks - 1) * 7)
    const byDate = new Map(d.school.schoolDays.map((x, i) => [x, s.attendance[i]]))
    const tMark = d.registers.find(r => r.classId === s.classId)?.marks[s.id] ?? null
    const out: DayCell[][] = []
    for (let w = 0; w < weeks; w++) {
      const row: DayCell[] = []
      for (let i = 0; i < 5; i++) {
        const date = addDaysIso(monday, w * 7 + i)
        const mark: DayCell['mark'] = date === today ? (tMark ?? 'today') : date > today ? 'future' : byDate.get(date) ?? 'future'
        row.push({ date, mark })
      }
      out.push(row)
    }
    return out
  }, [d.school, d.registers, s, weeks])
}

export const MARK_STYLE: Record<DayCell['mark'], string> = {
  P: 'bg-forest-p text-forest',
  L: 'bg-amber-p text-[#8a5f14]',
  A: 'bg-rust-p text-rust',
  today: 'border border-dashed border-copper bg-ivory-2 text-copper-d',
  future: 'bg-line-2/50 text-stone-l',
}
