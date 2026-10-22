import type { SchoolData, SchoolState } from '@/store/school'
import type { AttendanceMark, SchoolClass, Staff } from '@/data/types'
import { RULES, type Alert } from '@/engine/monitoring'
import { firstName, time } from '@/lib/format'

/* ───────────────────────── alerts ───────────────────────── */

/** Tabs an "open" alert action can jump to on the principal phone. */
export const OPEN_TAB: Record<string, string> = { approvals: 'approvals', staff: 'people', transport: 'wall' }

/** Who would be reminded by this alert's nudge — unique staff, in order. */
export function alertRecipients(d: SchoolData, a: Alert): Staff[] {
  const ids = [...new Set(a.items.map(i => i.staffId).filter((x): x is string => !!x))]
  return ids.map(id => d.staff.find(s => s.id === id)).filter((s): s is Staff => !!s)
}

export function recipientsNoun(people: Staff[]) {
  const n = people.length
  if (n === 1) return firstNameWithTitle(people[0])
  const allTeachers = people.every(p => p.role === 'teacher')
  return `${n} ${allTeachers ? 'teachers' : 'colleagues'}`
}

/** "Ms. Rao" — the way staff are addressed in the corridor. */
export function firstNameWithTitle(s: Staff) {
  const m = s.name.match(/^(Mr|Ms|Mrs|Dr)\.\s+\S+\s+(.+)$/)
  return m ? `${m[1]}. ${m[2]}` : firstName(s.name)
}

/** Send each recipient one reminder naming only the items that are theirs. Returns who was reminded. */
export function nudgeForAlert(d: SchoolState, a: Alert, byId: string): Staff[] {
  const people = alertRecipients(d, a)
  for (const p of people) {
    const mine = a.items.filter(i => i.staffId === p.id).map(i => i.label)
    const list = mine.length > 3 ? `${mine.slice(0, 3).join(', ')} and ${mine.length - 3} more` : mine.join(', ')
    d.nudge(p.id, a.rule, `${list ? `Yours: ${list}. ` : ''}Could you look at this today? — Dr. Iyer`, byId)
  }
  return people
}

/* ───────────────────────── the wall ───────────────────────── */

export type TileState = 'marked' | 'awaiting' | 'needs'

export interface ClassTile {
  cls: SchoolClass
  state: TileState
  teacher: Staff | undefined
  teacherAway: 'absent' | 'leave' | null
  teacherCheckIn: string | null
  markedAt: string | null
  markedBy: Staff | undefined
  total: number
  present: number
  absentIds: string[]
  lateIds: string[]
}

export function classTiles(d: SchoolData, now: string): ClassTile[] {
  const today = now.slice(0, 10)
  return d.classes.map(cls => {
    const reg = d.registers.find(r => r.classId === cls.id)
    const teacher = d.staff.find(s => s.id === cls.classTeacherId)
    const day = teacher?.attendance[teacher.attendance.length - 1]
    const teacherAway = day && day.date === today && (day.status === 'absent' || day.status === 'leave') ? day.status : null
    const marks: [string, AttendanceMark][] = Object.entries(reg?.marks ?? {})
    const markedAt = reg?.markedAt ?? null
    const state: TileState = markedAt ? 'marked' : time(now) >= RULES.registerBy || teacherAway ? 'needs' : 'awaiting'
    return {
      cls, state, teacher, teacherAway,
      teacherCheckIn: day && day.date === today ? day.checkIn : null,
      markedAt,
      markedBy: reg?.markedBy ? d.staff.find(s => s.id === reg.markedBy) : undefined,
      total: cls.studentIds.length,
      present: marks.filter(([, m]) => m !== 'A').length,
      absentIds: marks.filter(([, m]) => m === 'A').map(([id]) => id),
      lateIds: marks.filter(([, m]) => m === 'L').map(([id]) => id),
    }
  })
}

export const TILE_ORDER: Record<TileState, number> = { needs: 0, awaiting: 1, marked: 2 }
