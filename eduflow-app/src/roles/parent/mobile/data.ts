/**
 * Parent data scope. Every selector here is keyed on the signed-in parent's childIds,
 * so nothing outside Sunita's own children can ever reach a parent screen.
 */
import { useMemo } from 'react'
import { useData, useNotifications, DEMO } from '@/store/hooks'
import type { SchoolData } from '@/store/school'
import type { Notification, Parent, Student, Subject, Thread, TimetableSlot } from '@/data/types'
import { feeStatus } from '@/engine/monitoring'
import { firstName } from '@/lib/format'

export const PARENT_ID = DEMO.parentId

export function useParentScope() {
  const d = useData()
  const parent = d.parents.find(p => p.id === PARENT_ID) as Parent
  const childIds = parent.childIds
  const children = useMemo(
    () => childIds.map(id => d.students.find(s => s.id === id)).filter((s): s is Student => !!s),
    [d.students, childIds],
  )
  return { d, parent, children, childIds }
}

/** Notifications for this parent, restricted to her own children (or school-wide notes with no child). */
export function useParentNotifications() {
  const { childIds } = useParentScope()
  const all = useNotifications('parent', PARENT_ID)
  return useMemo(() => all.filter(n => !n.studentId || childIds.includes(n.studentId)), [all, childIds])
}

/** A notification belongs to a child if it names them, or is a bus note that mentions them. */
export function isForChild(n: Notification, s: Student) {
  if (n.studentId === s.id) return true
  if (n.kind === 'bus' && n.body.includes(firstName(s.name))) return true
  return !n.studentId && n.kind === 'announcement'
}

/** Threads between this parent and teachers, only for her children. */
export function myThreads(d: SchoolData, childIds: string[]): Thread[] {
  return d.threads.filter(t => t.parentId === PARENT_ID && childIds.includes(t.studentId))
}

export const lastMessage = (t: Thread) => t.messages[t.messages.length - 1]

/** Teachers a parent may write to for a child: class teacher first, then subject teachers. */
export function teachersFor(d: SchoolData, s: Student) {
  const cls = d.classes.find(c => c.id === s.classId)
  const out: { staffId: string; role: 'class-teacher' | 'subject'; subject?: Subject }[] = []
  if (cls) out.push({ staffId: cls.classTeacherId, role: 'class-teacher' })
  const seen = new Set(out.map(o => o.staffId))
  const subjectTeachers = new Map<string, Subject>()
  for (const e of d.exams) if (e.classId === s.classId) subjectTeachers.set(e.teacherId, e.subject)
  for (const day of d.timetable[s.classId] ?? []) for (const slot of day) {
    if (slot.teacherId && isSubject(slot.subject) && !subjectTeachers.has(slot.teacherId)) subjectTeachers.set(slot.teacherId, slot.subject)
  }
  for (const [staffId, subject] of subjectTeachers) {
    if (seen.has(staffId)) {
      const ct = out.find(o => o.staffId === staffId)
      if (ct) ct.subject = subject
      continue
    }
    seen.add(staffId)
    out.push({ staffId, role: 'subject', subject })
  }
  return out
}

const SUBJECTS: Subject[] = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science']
export const isSubject = (x: TimetableSlot['subject']): x is Subject => (SUBJECTS as string[]).includes(x)
export const subjectList = SUBJECTS

export function teacherOf(d: SchoolData, classId: string, subject: Subject) {
  return d.exams.find(e => e.classId === classId && e.subject === subject)?.teacherId
    ?? d.timetable[classId]?.flat().find(sl => sl.subject === subject)?.teacherId
    ?? null
}

export const staffName = (d: SchoolData, id: string | null | undefined) => (id ? d.staff.find(s => s.id === id)?.name ?? 'A teacher' : 'A teacher')

/** Three equal instalments: April, 15 September (Term 2), 15 December (Term 3). */
export function instalments(s: Student) {
  const per = Math.round(s.feeTotal / 3)
  const dues = [
    { label: 'Term 1', due: '2026-04-15' },
    { label: 'Term 2', due: '2026-09-15' },
    { label: 'Term 3', due: '2026-12-15' },
  ]
  let paid = s.feePaid
  return dues.map((x, i) => {
    const amount = i === 2 ? s.feeTotal - per * 2 : per
    const covered = Math.max(0, Math.min(amount, paid))
    paid -= covered
    return { ...x, amount, covered, state: covered >= amount ? 'paid' as const : x.due < '2026-10-07' ? 'overdue' as const : 'upcoming' as const }
  })
}

export function feeSummary(s: Student) {
  const f = feeStatus(s)
  const inst = instalments(s)
  const overdueInst = inst.find(i => i.state === 'overdue')
  return { ...f, inst, overdueLabel: overdueInst?.label ?? null }
}

export const SUBJECT_SHORT: Record<Subject, string> = {
  Mathematics: 'Maths', Science: 'Science', English: 'English', Hindi: 'Hindi', 'Social Studies': 'Social Studies', 'Computer Science': 'Computers',
}

/** "07:42" → minutes */
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const fromMin = (m: number) => {
  const r = Math.round(m)
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`
}

/** Timezone-safe ISO date arithmetic. */
export const addDays = (isoDate: string, n: number) => new Date(Date.parse(isoDate + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
