import { useEffect, useMemo, useState } from 'react'
import { useSchool, DEMO } from './school'
import { computeAlerts, schoolPulse, studentRisk, teacherScorecard } from '@/engine/monitoring'
import { demoNow } from '@/lib/format'
import type { RoleId } from '@/data/types'

/** The whole school (re-renders on any change — fine at this scale). */
export const useData = () => useSchool()

export function useAlerts() {
  const d = useSchool()
  useNow() // re-evaluate time-based rules as the demo clock moves
  return useMemo(() => computeAlerts(d), [d])
}

export function usePulse() {
  const d = useSchool()
  return useMemo(() => schoolPulse(d), [d])
}

export function useStudentRisk(studentId: string) {
  const d = useSchool()
  return useMemo(() => {
    const s = d.students.find(x => x.id === studentId)
    return s ? studentRisk(d, s) : null
  }, [d, studentId])
}

export function useScorecard(staffId: string) {
  const d = useSchool()
  return useMemo(() => {
    const t = d.staff.find(x => x.id === staffId)
    return t ? teacherScorecard(d, t) : null
  }, [d, staffId])
}

/** Demo clock that ticks every 15s. */
export function useNow() {
  const [now, setNow] = useState(demoNow)
  useEffect(() => {
    const t = setInterval(() => setNow(demoNow()), 15000)
    return () => clearInterval(t)
  }, [])
  return now
}

/** The signed-in person for each demo role. */
export function useMe(role: RoleId) {
  const d = useSchool()
  return useMemo(() => {
    switch (role) {
      case 'principal': return { id: DEMO.principalId, name: d.staff.find(s => s.id === DEMO.principalId)!.name, title: 'Principal' }
      case 'admin': return { id: DEMO.adminId, name: d.staff.find(s => s.id === DEMO.adminId)!.name, title: 'School Administrator' }
      case 'staff': {
        const s = d.staff.find(x => x.id === DEMO.staffId)!
        return { id: s.id, name: s.name, title: s.designation }
      }
      case 'student': {
        const s = d.students.find(x => x.id === DEMO.studentId)!
        return { id: s.id, name: s.name, title: `Grade ${s.classId} · ${s.house} House` }
      }
      case 'parent': {
        const p = d.parents.find(x => x.id === DEMO.parentId)!
        return { id: p.id, name: p.name, title: `${p.relation} of ${p.childIds.length} children` }
      }
    }
  }, [d, role])
}

/** Notifications for a given user (role-wide + personal), newest first. */
export function useNotifications(role: RoleId, id?: string) {
  const d = useSchool()
  return useMemo(
    () => d.notifications.filter(n => n.audience.role === role && (!n.audience.id || n.audience.id === id)).sort((a, b) => b.at.localeCompare(a.at)),
    [d.notifications, role, id],
  )
}

export { DEMO }
