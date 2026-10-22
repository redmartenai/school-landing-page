/**
 * Campus engine — where is every class, who is teaching it, and who is missing, at any minute of the day.
 * Pure functions over SchoolData; the 3D campus, the time scrubber and the monitoring alerts all read from here.
 */
import type { SchoolData } from '@/store/school'
import type { Staff, StaffDay, TimetableSlot } from '@/data/types'

export type RoomStatus =
  | 'teaching'      // own teacher present
  | 'substitute'    // covered by another teacher
  | 'uncovered'     // teacher absent, nobody assigned
  | 'teacher-late'  // teacher hasn't checked in yet
  | 'playground'    // Games — class is out on the field
  | 'library'       // Library period
  | 'lab'           // Computer Science in the lab
  | 'break'         // Break / Lunch
  | 'before'        // before first bell
  | 'after'         // school day over

export interface ClassNow {
  classId: string
  slot: TimetableSlot | null
  status: RoomStatus
  /** where the children physically are */
  location: 'classroom' | 'field' | 'library' | 'lab' | 'science' | 'cafeteria' | 'home' | 'arriving'
  scheduledTeacherId: string | null
  /** teacher actually with the class right now (own or substitute) */
  teacherId: string | null
  substituteId: string | null
  teacherState: StaffDay['status'] | null
  registerMarked: boolean
  presentIds: string[]
  absentIds: string[]
  lateIds: string[]
}

export const DAY_START = 7 * 60 + 30
export const DAY_END = 14 * 60 + 30
export const FIRST_BELL = 8 * 60
export const LAST_BELL = 14 * 60 + 10

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
export const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`

/** Today's weekday index into the timetable (0 = Monday). */
export function weekdayIndex(d: SchoolData) {
  const wd = new Date(d.school.today + 'T00:00:00').getDay()
  return Math.min(4, Math.max(0, wd - 1))
}

export function staffToday(d: SchoolData, s: Staff): StaffDay | null {
  const last = s.attendance[s.attendance.length - 1]
  return last?.date === d.school.today ? last : null
}

/** Is this teacher physically available at `minute`? */
export function isAvailable(d: SchoolData, staffId: string, minute: number) {
  const s = d.staff.find(x => x.id === staffId)
  if (!s) return false
  const t = staffToday(d, s)
  if (!t || t.status === 'absent' || t.status === 'leave') return false
  if (t.checkIn && toMin(t.checkIn) > minute) return false
  return true
}

export function slotAt(d: SchoolData, classId: string, minute: number): TimetableSlot | null {
  const day = d.timetable[classId]?.[weekdayIndex(d)] ?? []
  return day.find(s => toMin(s.start) <= minute && minute < toMin(s.end)) ?? null
}

export function classNow(d: SchoolData, classId: string, minute: number): ClassNow {
  const cls = d.classes.find(c => c.id === classId)!
  const reg = d.registers.find(r => r.classId === classId)
  const marks = reg?.marks ?? {}
  const registerMarked = !!reg?.markedAt
  const absentIds = registerMarked ? cls.studentIds.filter(id => marks[id] === 'A') : []
  const lateIds = registerMarked ? cls.studentIds.filter(id => marks[id] === 'L') : []
  const presentIds = cls.studentIds.filter(id => !absentIds.includes(id))
  const slot = slotAt(d, classId, minute)
  const base = { classId, slot, registerMarked, presentIds, absentIds, lateIds, substituteId: null as string | null }

  if (minute < FIRST_BELL) return { ...base, status: 'before', location: 'arriving', scheduledTeacherId: null, teacherId: null, teacherState: null }
  if (minute >= LAST_BELL || !slot) return { ...base, status: 'after', location: 'home', scheduledTeacherId: null, teacherId: null, teacherState: null }
  if (slot.subject === 'Break' || slot.subject === 'Lunch') return { ...base, status: 'break', location: 'cafeteria', scheduledTeacherId: null, teacherId: null, teacherState: null }

  const scheduled = slot.teacherId
  const sched = scheduled ? d.staff.find(s => s.id === scheduled) : undefined
  const teacherState = sched ? staffToday(d, sched)?.status ?? null : null
  const location: ClassNow['location'] = slot.subject === 'Games' ? 'field' : slot.subject === 'Library' ? 'library' : slot.subject === 'Computer Science' ? 'lab' : slot.subject === 'Science' ? 'science' : 'classroom'
  const placeStatus: RoomStatus | null = location === 'field' ? 'playground' : location === 'library' ? 'library' : location === 'lab' || location === 'science' ? 'lab' : null

  if (scheduled && isAvailable(d, scheduled, minute)) {
    return { ...base, status: placeStatus ?? 'teaching', location, scheduledTeacherId: scheduled, teacherId: scheduled, teacherState }
  }
  const sub = d.substitutions[`${classId}:${slot.period}`] ?? null
  if (sub && isAvailable(d, sub, minute)) {
    return { ...base, status: 'substitute', location, scheduledTeacherId: scheduled, teacherId: sub, substituteId: sub, teacherState }
  }
  const lateArriving = teacherState === 'late' || teacherState === 'present'
  return { ...base, status: lateArriving ? 'teacher-late' : 'uncovered', location, scheduledTeacherId: scheduled, teacherId: null, substituteId: sub, teacherState }
}

export function campusAt(d: SchoolData, minute: number) {
  return d.classes.map(c => classNow(d, c.id, minute))
}

/** Teachers who are in school and not teaching at `minute` — the substitution pool (and who's in the staff room). */
export function freeTeachers(d: SchoolData, minute: number, period?: number) {
  const day = weekdayIndex(d)
  const busy = new Set<string>()
  for (const days of Object.values(d.timetable)) {
    const s = days[day]?.find(x => (period ? x.period === period : toMin(x.start) <= minute && minute < toMin(x.end)))
    if (s?.teacherId) busy.add(s.teacherId)
  }
  const p = period ?? d.timetable[d.classes[0].id][day].find(x => toMin(x.start) <= minute && minute < toMin(x.end))?.period
  if (p) for (const [k, v] of Object.entries(d.substitutions)) if (k.endsWith(`:${p}`)) busy.add(v)
  return d.staff.filter(s => s.role === 'teacher' && s.subjects.length > 0 && !busy.has(s.id) && isAvailable(d, s.id, minute))
}

/** Every period today (from `fromMinute` on) where a class has no teacher. */
export function uncoveredToday(d: SchoolData, fromMinute = 0) {
  const day = weekdayIndex(d)
  const out: { classId: string; slot: TimetableSlot; teacherId: string; reason: 'absent' | 'leave' }[] = []
  for (const c of d.classes) {
    for (const slot of d.timetable[c.id][day]) {
      if (!slot.teacherId || toMin(slot.end) <= fromMinute) continue
      const t = d.staff.find(s => s.id === slot.teacherId)
      const st = t ? staffToday(d, t)?.status : null
      if (st !== 'absent' && st !== 'leave') continue
      const sub = d.substitutions[`${c.id}:${slot.period}`]
      if (sub && isAvailable(d, sub, toMin(slot.start))) continue
      out.push({ classId: c.id, slot, teacherId: slot.teacherId, reason: st })
    }
  }
  return out.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
}
