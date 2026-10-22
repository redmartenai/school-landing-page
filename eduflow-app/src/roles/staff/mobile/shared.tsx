/* Shared helpers for Ms. Kavya Rao's phone: who she is, her day, and what needs her. */
import { motion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx, spring, toneClass, type Tone } from '@/components/ui'
import { DEMO, useData, useNow } from '@/store/hooks'
import type { SchoolData } from '@/store/school'
import type { Homework, Staff, Thread, TimetableSlot } from '@/data/types'
import { attendanceRate, attendanceSeries } from '@/engine/monitoring'
import { hoursBetween } from '@/lib/format'

export const ME = DEMO.staffId

/** The signed-in teacher (always present in the seed). */
export function useTeacher(): Staff {
  const d = useData()
  return d.staff.find(s => s.id === ME)!
}

/* ───────────────────────── dates ───────────────────────── */

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 0 = Mon … 4 = Fri; weekends fall back to Monday's timetable. */
export const weekdayIndex = (iso: string) => {
  const wd = new Date(iso.slice(0, 10) + 'T00:00:00Z').getUTCDay()
  return wd >= 1 && wd <= 5 ? wd - 1 : 0
}

/** Next date (strictly after `from`) that falls on the given JS weekday (0 = Sun). */
export const nextWeekday = (from: string, jsDay: number) => {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(from, i)
    if (new Date(d + 'T00:00:00Z').getUTCDay() === jsDay) return d
  }
  return addDays(from, 7)
}

/* ───────────────────────── her timetable ───────────────────────── */

export interface MyPeriod extends TimetableSlot { classId: string }

export function myPeriods(d: SchoolData, staffId: string, date: string): MyPeriod[] {
  const wd = weekdayIndex(date)
  const out: MyPeriod[] = []
  for (const [classId, days] of Object.entries(d.timetable)) {
    for (const slot of days[wd] ?? []) if (slot.teacherId === staffId) out.push({ ...slot, classId })
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}

/* ───────────────────────── homework & threads ───────────────────────── */

export const awaitingReview = (h: Homework) => Object.values(h.submissions).filter(v => v === 'submitted' || v === 'late').length
export const handedIn = (h: Homework) => Object.values(h.submissions).filter(v => v !== 'pending').length

export const lastMessage = (t: Thread) => t.messages[t.messages.length - 1]
/** A thread is waiting on her when the last word was somebody else's. */
export const isWaiting = (t: Thread) => !!lastMessage(t) && lastMessage(t).from !== t.staffId

export function waitingLabel(t: Thread, now: string) {
  const h = hoursBetween(lastMessage(t).at, now)
  if (h < 1) return `Waiting ${Math.max(1, Math.round(h * 60))} min`
  return `Waiting ${Math.round(h)}h`
}

/** Who is on the other side of a thread. */
export function counterpart(d: SchoolData, t: Thread) {
  const parent = t.parentId ? d.parents.find(p => p.id === t.parentId) : undefined
  const student = d.students.find(s => s.id === t.studentId)
  return { name: parent?.name ?? student?.name ?? 'Family', relation: parent?.relation, student }
}

export function myThreads(d: SchoolData, staffId: string) {
  return d.threads
    .filter(t => t.staffId === staffId && t.messages.length)
    .sort((a, b) => Number(isWaiting(b)) - Number(isWaiting(a)) || lastMessage(b).at.localeCompare(lastMessage(a).at))
}

/* ───────────────────────── students ───────────────────────── */

export const attendancePct = (d: SchoolData, studentId: string) => {
  const s = d.students.find(x => x.id === studentId)
  return s ? attendanceRate(attendanceSeries(d, s)) : 1
}

/** Small signal used on the register: below 75% → rust, slipping in last 3 weeks → amber. */
export function attendanceFlag(d: SchoolData, studentId: string): 'risk' | 'slipping' | null {
  const s = d.students.find(x => x.id === studentId)
  if (!s) return null
  if (attendanceRate(attendanceSeries(d, s)) < 0.75) return 'risk'
  if (attendanceRate(s.attendance.slice(0, -15)) - attendanceRate(s.attendance.slice(-15)) >= 0.2) return 'slipping'
  return null
}

/* ───────────────────────── "needs you" ───────────────────────── */

export type NeedKind = 'homework' | 'message' | 'announcement' | 'marks' | 'attendance'
export interface Need {
  id: string
  kind: NeedKind
  tone: Tone
  title: string
  sub: string
  /** ids the UI needs to act */
  ref: string
}

export function useNeedsYou(): Need[] {
  const d = useData()
  const now = useNow()
  return useMemo(() => {
    const me = d.staff.find(s => s.id === ME)!
    const needs: Need[] = []

    // 1. Announcements not yet acknowledged — pinned first
    d.announcements
      .filter(a => a.audience.includes('staff') && !a.acknowledgedBy.includes(ME))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at))
      .forEach(a => needs.push({ id: `an-${a.id}`, kind: 'announcement', tone: a.pinned ? 'copper' : 'slate', title: a.title, sub: `${a.pinned ? 'Pinned · ' : ''}From ${d.staff.find(s => s.id === a.fromId)?.name ?? 'the office'}`, ref: a.id }))

    // 2. Parents waiting on a reply
    myThreads(d, ME).filter(isWaiting).forEach(t => {
      const c = counterpart(d, t)
      needs.push({ id: `th-${t.id}`, kind: 'message', tone: 'copper', title: `${c.name} is waiting`, sub: `${waitingLabel(t, now)} · about ${c.student?.name.split(' ')[0] ?? 'their child'}`, ref: t.id })
    })

    // 3. Homework submissions awaiting review
    d.homework
      .filter(h => h.teacherId === ME && awaitingReview(h) > 0)
      .sort((a, b) => awaitingReview(b) - awaitingReview(a))
      .forEach(h => {
        const n = awaitingReview(h)
        needs.push({ id: `hw-${h.id}`, kind: 'homework', tone: h.dueDate < now.slice(0, 10) ? 'copper' : 'amber', title: `${n} submission${n === 1 ? '' : 's'} to review · ${h.classId}`, sub: h.title, ref: h.id })
      })

    // 4. Unit Test 2 marks — pending is hers to do; submitted is waiting on the principal
    d.exams.filter(e => e.teacherId === ME && e.status !== 'published').forEach(e => {
      needs.push(e.status === 'pending'
        ? { id: `ex-${e.id}`, kind: 'marks', tone: 'rust', title: `${e.classId} ${e.name} marks are due`, sub: `${e.subject} · deadline was 3 October`, ref: e.id }
        : { id: `ex-${e.id}`, kind: 'marks', tone: 'amber', title: `${e.classId} maths ${e.name} — submitted`, sub: `Awaiting ${d.staff.find(s => s.id === DEMO.principalId)?.name ?? 'the principal'} to publish`, ref: e.id })
    })

    // 5. Her own class: children below the 75% line
    if (me.classTeacherOf) {
      const cls = d.classes.find(c => c.id === me.classTeacherOf)
      const risk = (cls?.studentIds ?? []).filter(id => attendanceFlag(d, id) === 'risk')
      if (risk.length) needs.push({ id: `att-${me.classTeacherOf}`, kind: 'attendance', tone: 'rust', title: `${risk.length} children in ${me.classTeacherOf} are below 75%`, sub: 'A call home this week keeps them exam-eligible', ref: me.classTeacherOf })
    }
    return needs
  }, [d, now])
}

/* ───────────────────────── small UI pieces ───────────────────────── */

export function IconTile({ icon: Icon, tone = 'stone', size = 38 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center rounded-[11px]', toneClass[tone].bg, toneClass[tone].text)}>
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} />
    </span>
  )
}

/** Thumb-sized choice chips with a shared sliding highlight. */
export function ChoiceChips<T extends string>({ options, value, onChange, group, className }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; group: string; className?: string
}) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {options.map(o => {
        const on = o.id === value
        return (
          <motion.button key={o.id} type="button" whileTap={{ scale: 0.95 }} onClick={() => onChange(o.id)}
            className={cx('relative min-h-[44px] rounded-full border px-4 text-[14px] font-medium transition-colors', on ? 'border-forest text-ivory' : 'border-line bg-ivory-2 text-charcoal-2')}>
            {on && <motion.span layoutId={`chip-${group}`} transition={spring} className="absolute inset-0 rounded-full bg-forest" />}
            <span className="relative">{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/** A card-shaped block that participates in MobileScreen's stagger. */
export function MCard({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? motion.button : motion.div
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
      className={cx('block w-full rounded-[18px] border border-line bg-ivory-2 p-4 text-left shadow-1', className)}>
      {children}
    </C>
  )
}

export const textareaClass = 'w-full resize-none rounded-[12px] border border-line bg-ivory-2 px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-stone-l focus:border-forest-l focus:ring-4 focus:ring-forest/10'
