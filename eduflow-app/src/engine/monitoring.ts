/**
 * EduFlow Monitoring Intelligence Layer
 * ─────────────────────────────────────
 * Most ERPs answer "what happened?". This module answers "what needs attention right now?".
 * Every rule reads across modules (attendance × marks × fees × messages × approvals × transport)
 * and produces an Alert with an owner, a reason, an escalation path and a suggested action.
 * Rules are pure functions of SchoolData, so the same engine powers the principal's Monitoring
 * Center, the teacher's "needs you" list, the parent's child summary and the Ask box.
 */
import type { SchoolData } from '@/store/school'
import type { AttendanceMark, Staff, Student, Subject } from '@/data/types'
import { demoNow, hoursBetween, rupees } from '@/lib/format'
import { toMin, uncoveredToday } from './campus'

export type Severity = 'critical' | 'high' | 'watch'
export type Domain = 'students' | 'staff' | 'operations' | 'finance'

export interface AlertItem {
  id: string // entity id (student / staff / class / bus / approval)
  label: string
  sub: string
  value: string // the number that tripped the rule
  staffId?: string // who to nudge about this item
}

export interface Alert {
  id: string
  rule: string
  severity: Severity
  domain: Domain
  headline: string
  why: string
  owner: string
  escalatesTo: string
  items: AlertItem[]
  action: { label: string; kind: 'nudge' | 'open'; to?: string }
  acknowledgedAt?: string
}

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, watch: 2 }

/* ───────────────────────── thresholds (school-configurable later) ───────────────────────── */

export const RULES = {
  attendanceRisk: 0.75,
  slipDrop: 0.2,
  marksDrop: 12,
  behaviour: 3,
  feeOverdue: 10000,
  replyHours: 24,
  unreviewed: 25,
  lateArrivals: 5,
  approvalHours: 24,
  busDelay: 10,
  registerBy: '08:15',
}

/* ───────────────────────── student-level metrics ───────────────────────── */

export function todayMark(d: SchoolData, s: Student): AttendanceMark | null {
  return d.registers.find(r => r.classId === s.classId)?.marks[s.id] ?? null
}

/** Full attendance series including today when the register has been taken. */
export function attendanceSeries(d: SchoolData, s: Student): AttendanceMark[] {
  const t = todayMark(d, s)
  return t ? [...s.attendance, t] : s.attendance
}

export const attendanceRate = (marks: AttendanceMark[]) =>
  marks.length ? marks.filter(m => m !== 'A').length / marks.length : 1

export function streak(d: SchoolData, s: Student) {
  const series = attendanceSeries(d, s)
  let n = 0
  for (let i = series.length - 1; i >= 0 && series[i] !== 'A'; i--) n++
  return n
}

export function marksTrend(s: Student) {
  const subjects = Object.keys(s.marks) as Subject[]
  const before = subjects.map(k => (s.marks[k].unitTest1 + s.marks[k].term1) / 2)
  const nowMarks = subjects.map(k => s.marks[k].unitTest2).filter((x): x is number => x !== null)
  const avgBefore = before.reduce((a, b) => a + b, 0) / before.length
  const avgNow = nowMarks.length ? nowMarks.reduce((a, b) => a + b, 0) / nowMarks.length : avgBefore
  return { before: avgBefore, now: avgNow, delta: avgNow - avgBefore }
}

export function averageMark(s: Student) {
  const vals = (Object.keys(s.marks) as Subject[]).flatMap(k => [s.marks[k].unitTest1, s.marks[k].term1, s.marks[k].unitTest2]).filter((x): x is number => x !== null)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function feeStatus(s: Student) {
  const expected = Math.round((s.feeTotal * 2) / 3) // two of three instalments due by 15 Sep
  const overdue = Math.max(0, expected - s.feePaid)
  return { expected, overdue, balance: s.feeTotal - s.feePaid, paidPct: s.feePaid / s.feeTotal }
}

export interface StudentRisk {
  score: number // 0 (fine) – 100 (urgent)
  level: 'ok' | 'watch' | 'at-risk'
  factors: { key: 'attendance' | 'marks' | 'fees' | 'behaviour' | 'homework'; label: string; weight: number }[]
}

/** Cross-module risk score. A single number the principal can sort a school of 300+ by. */
export function studentRisk(d: SchoolData, s: Student): StudentRisk {
  const factors: StudentRisk['factors'] = []
  const att = attendanceRate(attendanceSeries(d, s))
  if (att < RULES.attendanceRisk) factors.push({ key: 'attendance', label: `Attendance ${Math.round(att * 100)}%`, weight: 40 })
  else if (att < 0.85) factors.push({ key: 'attendance', label: `Attendance ${Math.round(att * 100)}%`, weight: 15 })
  const recent = attendanceRate(s.attendance.slice(-15))
  const prior = attendanceRate(s.attendance.slice(0, -15))
  if (prior - recent >= RULES.slipDrop) factors.push({ key: 'attendance', label: `Slipping: ${Math.round(recent * 100)}% in last 3 weeks`, weight: 20 })
  const t = marksTrend(s)
  if (t.delta <= -RULES.marksDrop) factors.push({ key: 'marks', label: `Marks down ${Math.round(-t.delta)} pts`, weight: 30 })
  else if (t.now < 45) factors.push({ key: 'marks', label: `Average ${Math.round(t.now)}%`, weight: 20 })
  const f = feeStatus(s)
  if (f.overdue > RULES.feeOverdue) factors.push({ key: 'fees', label: `${rupees(f.overdue)} overdue`, weight: 15 })
  if (s.behaviourIncidents >= RULES.behaviour) factors.push({ key: 'behaviour', label: `${s.behaviourIncidents} behaviour notes`, weight: 15 })
  const missed = d.homework.filter(h => h.classId === s.classId && h.dueDate < demoNow().slice(0, 10) && h.submissions[s.id] === 'pending').length
  if (missed >= 2) factors.push({ key: 'homework', label: `${missed} homework missed`, weight: 10 })
  const score = Math.min(100, factors.reduce((a, b) => a + b.weight, 0))
  return { score, level: score >= 40 ? 'at-risk' : score >= 15 ? 'watch' : 'ok', factors }
}

/* ───────────────────────── staff-level metrics ───────────────────────── */

export interface Scorecard {
  staffId: string
  score: number // 0–100
  grade: 'Excellent' | 'Good' | 'Needs support'
  punctuality: number // 0..1 on-time days
  marksOnTime: number // 0..1 exams submitted before deadline
  reviewRate: number // 0..1 homework submissions reviewed
  replyHours: number // avg parent reply time
  classAvgDelta: number // UT2 vs earlier, across classes taught
  pendingMarks: number
  unreviewed: number
  unanswered: number
}

export function unansweredThreads(d: SchoolData, staffId?: string) {
  const now = demoNow()
  return d.threads.filter(t => {
    if (staffId && t.staffId !== staffId) return false
    const last = t.messages[t.messages.length - 1]
    return last && last.from !== t.staffId && hoursBetween(last.at, now) >= RULES.replyHours
  })
}

export function teacherScorecard(d: SchoolData, t: Staff): Scorecard {
  const days = t.attendance.filter(a => a.status === 'present' || a.status === 'late')
  const punctuality = days.length ? days.filter(a => a.status === 'present').length / days.length : 1
  const myExams = d.exams.filter(e => e.teacherId === t.id)
  const pendingMarks = myExams.filter(e => e.status === 'pending').length
  const marksOnTime = myExams.length ? 1 - pendingMarks / myExams.length : 1
  const today = demoNow().slice(0, 10)
  let submitted = 0, reviewed = 0
  for (const h of d.homework.filter(h => h.teacherId === t.id && h.dueDate < today)) {
    for (const v of Object.values(h.submissions)) {
      if (v === 'submitted' || v === 'late') submitted++
      if (v === 'reviewed') { reviewed++; submitted++ }
    }
  }
  const reviewRate = submitted ? reviewed / submitted : 1
  const unanswered = unansweredThreads(d, t.id).length
  const subj = t.subjects[0]
  let deltaSum = 0, deltaN = 0
  if (subj) for (const s of d.students) {
    if (!t.classIds.includes(s.classId)) continue
    const m = s.marks[subj]
    if (m.unitTest2 === null) continue
    deltaSum += m.unitTest2 - (m.unitTest1 + m.term1) / 2
    deltaN++
  }
  const classAvgDelta = deltaN ? deltaSum / deltaN : 0
  const replyScore = Math.max(0, 1 - t.avgParentReplyHours / 36)
  const resultScore = Math.max(0, Math.min(1, 0.6 + classAvgDelta / 20))
  const score = Math.round(100 * (0.2 * punctuality + 0.25 * marksOnTime + 0.25 * reviewRate + 0.15 * replyScore + 0.15 * resultScore))
  return {
    staffId: t.id, score, grade: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : 'Needs support',
    punctuality, marksOnTime, reviewRate, replyHours: t.avgParentReplyHours, classAvgDelta,
    pendingMarks, unreviewed: submitted - reviewed, unanswered,
  }
}

/* ───────────────────────── the rule set ───────────────────────── */

export function computeAlerts(d: SchoolData): Alert[] {
  const now = demoNow()
  const today = now.slice(0, 10)
  const alerts: Alert[] = []
  const className = (id: string) => id
  const staffName = (id: string) => d.staff.find(s => s.id === id)?.name ?? id
  const teachers = d.staff.filter(s => s.role === 'teacher' && s.subjects.length)

  /* Students ------------------------------------------------------------- */

  const attRisk = d.students
    .map(s => ({ s, r: attendanceRate(attendanceSeries(d, s)) }))
    .filter(x => x.r < RULES.attendanceRisk)
    .sort((a, b) => a.r - b.r)
  if (attRisk.length) alerts.push({
    id: 'students-attendance', rule: 'Attendance below 75%', severity: 'critical', domain: 'students',
    headline: `${attRisk.length} students are at attendance risk`,
    why: `Attendance across the last 60 school days is below ${RULES.attendanceRisk * 100}% — the board eligibility line for exams.`,
    owner: 'Class teachers', escalatesTo: 'Principal after 7 days without improvement',
    items: attRisk.map(({ s, r }) => ({ id: s.id, label: s.name, sub: `${className(s.classId)} · Roll ${s.rollNo}`, value: `${Math.round(r * 100)}%`, staffId: d.classes.find(c => c.id === s.classId)?.classTeacherId })),
    action: { label: 'Nudge class teachers', kind: 'nudge' },
  })

  const slipping = d.students
    .map(s => ({ s, recent: attendanceRate(s.attendance.slice(-15)), prior: attendanceRate(s.attendance.slice(0, -15)) }))
    .filter(x => x.prior - x.recent >= RULES.slipDrop && attendanceRate(attendanceSeries(d, x.s)) >= RULES.attendanceRisk)
  if (slipping.length) alerts.push({
    id: 'students-slipping', rule: 'Attendance slipping', severity: 'high', domain: 'students',
    headline: `${slipping.length} students have started missing school`,
    why: 'Still above 75% overall, but attendance in the last three weeks dropped sharply. This is the early signal — before they cross the line.',
    owner: 'Class teachers', escalatesTo: 'Principal if a parent call is not logged in 3 days',
    items: slipping.map(({ s, recent, prior }) => ({ id: s.id, label: s.name, sub: `${s.classId} · was ${Math.round(prior * 100)}%`, value: `${Math.round(recent * 100)}%`, staffId: d.classes.find(c => c.id === s.classId)?.classTeacherId })),
    action: { label: 'Ask teachers to call home', kind: 'nudge' },
  })

  const falling = d.students.map(s => ({ s, t: marksTrend(s) })).filter(x => x.t.delta <= -RULES.marksDrop).sort((a, b) => a.t.delta - b.t.delta)
  if (falling.length) alerts.push({
    id: 'students-marks', rule: 'Falling marks', severity: 'high', domain: 'students',
    headline: `${falling.length} students' marks fell sharply in Unit Test 2`,
    why: `Average dropped by ${RULES.marksDrop}+ points versus Unit Test 1 and Term 1 combined.`,
    owner: 'Subject teachers', escalatesTo: 'Academic coordinator → Principal',
    items: falling.map(({ s, t }) => ({ id: s.id, label: s.name, sub: `${s.classId} · ${Math.round(t.before)} → ${Math.round(t.now)}`, value: `−${Math.round(-t.delta)}`, staffId: d.classes.find(c => c.id === s.classId)?.classTeacherId })),
    action: { label: 'Plan remedial support', kind: 'nudge' },
  })

  const absentToday = d.students.filter(s => {
    if (todayMark(d, s) !== 'A') return false
    return s.attendance.slice(-2).every(m => m === 'A')
  })
  if (absentToday.length) alerts.push({
    id: 'students-absent-streak', rule: '3 days absent in a row', severity: 'high', domain: 'students',
    headline: `${absentToday.length} student${absentToday.length > 1 ? 's' : ''} absent for the third day running`,
    why: 'Three consecutive absences without a leave note. A call home today is the school’s duty of care.',
    owner: 'Class teachers', escalatesTo: 'Principal by 11:00',
    items: absentToday.map(s => ({ id: s.id, label: s.name, sub: s.classId, value: '3 days', staffId: d.classes.find(c => c.id === s.classId)?.classTeacherId })),
    action: { label: 'Ask for a call home', kind: 'nudge' },
  })

  const behaviour = d.students.filter(s => s.behaviourIncidents >= RULES.behaviour)
  if (behaviour.length) alerts.push({
    id: 'students-behaviour', rule: 'Repeated behaviour notes', severity: 'watch', domain: 'students',
    headline: `${behaviour.length} students have repeated behaviour notes`,
    why: `${RULES.behaviour}+ incidents recorded this term.`,
    owner: 'Class teachers & counsellor', escalatesTo: 'Principal',
    items: behaviour.map(s => ({ id: s.id, label: s.name, sub: s.classId, value: `${s.behaviourIncidents} notes`, staffId: d.classes.find(c => c.id === s.classId)?.classTeacherId })),
    action: { label: 'Refer to counsellor', kind: 'nudge' },
  })

  /* Staff ---------------------------------------------------------------- */

  const unmarked = d.registers.filter(r => !r.markedAt)
  if (unmarked.length && now.slice(11, 16) >= RULES.registerBy) alerts.push({
    id: 'staff-registers', rule: `Register not marked by ${RULES.registerBy}`, severity: 'critical', domain: 'staff',
    headline: `${unmarked.length} classroom${unmarked.length > 1 ? 's have' : ' has'} not taken the register`,
    why: `Registers should be in by ${RULES.registerBy}. Until then, parents of these children haven’t been told their child is safe.`,
    owner: 'Class teachers', escalatesTo: 'Principal (live)',
    items: unmarked.map(r => {
      const c = d.classes.find(x => x.id === r.classId)!
      return { id: c.id, label: `Class ${c.id}`, sub: staffName(c.classTeacherId), value: `${c.studentIds.length} kids`, staffId: c.classTeacherId }
    }),
    action: { label: 'Remind teachers now', kind: 'nudge' },
  })

  const uncovered = uncoveredToday(d, toMin(now.slice(11, 16)))
  if (uncovered.length) alerts.push({
    id: 'staff-cover', rule: 'Class without a teacher', severity: 'critical', domain: 'staff',
    headline: `${uncovered.length} period${uncovered.length > 1 ? 's' : ''} today ha${uncovered.length > 1 ? 've' : 's'} no teacher`,
    why: 'The scheduled teacher is away and nobody has been assigned to cover. Children would be sitting unsupervised.',
    owner: 'Principal', escalatesTo: '—',
    items: uncovered.map(u => ({ id: `${u.classId}:${u.slot.period}`, label: `${u.classId} · Period ${u.slot.period} · ${u.slot.start}`, sub: `${u.slot.subject} · ${staffName(u.teacherId)} ${u.reason === 'leave' ? 'on leave' : 'absent'}`, value: 'No cover' })),
    action: { label: 'Assign cover in Campus 3D', kind: 'open', to: 'campus' },
  })

  const pendingByTeacher = new Map<string, string[]>()
  for (const e of d.exams) if (e.status === 'pending' && e.deadline < today) pendingByTeacher.set(e.teacherId, [...(pendingByTeacher.get(e.teacherId) ?? []), e.classId])
  if (pendingByTeacher.size) alerts.push({
    id: 'staff-marks', rule: 'Marks overdue', severity: 'critical', domain: 'staff',
    headline: `${pendingByTeacher.size} teacher${pendingByTeacher.size > 1 ? 's haven’t' : ' hasn’t'} submitted Unit Test 2 marks`,
    why: 'The 3 October deadline has passed. Report cards for these classes are blocked before the PTM.',
    owner: 'Subject teachers', escalatesTo: 'Principal',
    items: [...pendingByTeacher.entries()].map(([tid, cls]) => {
      const st = d.staff.find(s => s.id === tid)!
      return { id: tid, label: st.name, sub: `${st.subjects[0]} · ${cls.join(', ')}`, value: `${cls.length} class${cls.length > 1 ? 'es' : ''}`, staffId: tid }
    }),
    action: { label: 'Send a reminder', kind: 'nudge' },
  })

  const unreviewed = teachers.map(t => ({ t, sc: teacherScorecard(d, t) })).filter(x => x.sc.unreviewed >= RULES.unreviewed).sort((a, b) => b.sc.unreviewed - a.sc.unreviewed)
  if (unreviewed.length) alerts.push({
    id: 'staff-homework', rule: 'Homework not reviewed', severity: 'high', domain: 'staff',
    headline: `${unreviewed.length} teachers have ${unreviewed.reduce((a, b) => a + b.sc.unreviewed, 0)} homework submissions unreviewed`,
    why: 'Students submitted work that is past its due date and still has no feedback. Parents notice this first.',
    owner: 'Subject teachers', escalatesTo: 'Principal after 5 days',
    items: unreviewed.map(({ t, sc }) => ({ id: t.id, label: t.name, sub: t.subjects[0], value: `${sc.unreviewed} waiting`, staffId: t.id })),
    action: { label: 'Nudge to review', kind: 'nudge' },
  })

  const replies = unansweredThreads(d)
  if (replies.length) {
    const byStaff = new Map<string, number>()
    for (const t of replies) byStaff.set(t.staffId, (byStaff.get(t.staffId) ?? 0) + 1)
    alerts.push({
      id: 'staff-replies', rule: 'Parent waiting 24h+', severity: 'high', domain: 'staff',
      headline: `${replies.length} parent messages have waited more than a day`,
      why: 'A parent who waits more than 24 hours usually calls the office next. Response time is part of each teacher’s scorecard.',
      owner: 'Teachers', escalatesTo: 'Principal after 48h',
      items: [...byStaff.entries()].sort((a, b) => b[1] - a[1]).map(([sid, n]) => ({ id: sid, label: staffName(sid), sub: `avg reply ${d.staff.find(s => s.id === sid)?.avgParentReplyHours ?? '?'}h`, value: `${n} waiting`, staffId: sid })),
      action: { label: 'Nudge to reply', kind: 'nudge' },
    })
  }

  const absentStaff = d.staff.filter(s => s.attendance[s.attendance.length - 1]?.date === today && s.attendance[s.attendance.length - 1].status === 'absent')
  if (absentStaff.length) alerts.push({
    id: 'staff-absent', rule: 'Absent without leave', severity: 'high', domain: 'staff',
    headline: `${absentStaff.length} staff member${absentStaff.length > 1 ? 's are' : ' is'} absent without approved leave`,
    why: 'No check-in and no leave request. Their periods need substitution.',
    owner: 'HR / Principal', escalatesTo: 'Principal',
    items: absentStaff.map(s => ({ id: s.id, label: s.name, sub: s.designation, value: 'No check-in', staffId: s.id })),
    action: { label: 'Arrange substitution', kind: 'open', to: 'staff' },
  })

  const lateStaff = d.staff.map(s => ({ s, n: s.attendance.filter(a => a.status === 'late').length })).filter(x => x.n >= RULES.lateArrivals).sort((a, b) => b.n - a.n)
  if (lateStaff.length) alerts.push({
    id: 'staff-late', rule: 'Frequent late arrivals', severity: 'watch', domain: 'staff',
    headline: `${lateStaff.length} staff arrived late ${RULES.lateArrivals}+ times this month`,
    why: 'Checked in after 08:00 on several days in the last 30 working days.',
    owner: 'Principal', escalatesTo: 'School owner (monthly review)',
    items: lateStaff.map(({ s, n }) => ({ id: s.id, label: s.name, sub: s.designation, value: `${n} late`, staffId: s.id })),
    action: { label: 'Have a word', kind: 'nudge' },
  })

  /* Operations ----------------------------------------------------------- */

  const delayed = d.buses.filter(b => b.delayMin >= RULES.busDelay && b.status !== 'arrived')
  if (delayed.length) alerts.push({
    id: 'ops-bus', rule: 'Bus delayed', severity: 'critical', domain: 'operations',
    headline: delayed.map(b => `Bus ${b.id} is ${b.delayMin} min late`).join(' · '),
    why: 'Parents have been notified automatically. Students on this bus will be marked late, not absent.',
    owner: 'Transport manager', escalatesTo: 'Principal (live)',
    items: delayed.map(b => ({ id: b.id, label: `Bus ${b.id} · ${b.route}`, sub: `${b.driverName} · ${b.studentIds.length} students`, value: `+${b.delayMin} min` })),
    action: { label: 'Open live tracking', kind: 'open', to: 'transport' },
  })

  const staleApprovals = d.approvals.filter(a => a.status === 'pending' && hoursBetween(a.at, now) >= RULES.approvalHours)
  if (staleApprovals.length) alerts.push({
    id: 'ops-approvals', rule: 'Approvals waiting 24h+', severity: 'high', domain: 'operations',
    headline: `${staleApprovals.length} approvals have been waiting more than a day`,
    why: 'Leave, corrections and refunds waiting on a decision. Each one is somebody blocked.',
    owner: 'Principal', escalatesTo: '—',
    items: staleApprovals.map(a => ({ id: a.id, label: a.title, sub: staffName(a.requestedBy), value: `${Math.round(hoursBetween(a.at, now))}h` })),
    action: { label: 'Open approvals', kind: 'open', to: 'approvals' },
  })

  const openNegative = d.complaints.filter(c => c.status !== 'resolved' && c.sentiment === 'negative')
  if (openNegative.length) {
    const byCat = new Map<string, number>()
    for (const c of openNegative) byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1)
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    alerts.push({
      id: 'ops-complaints', rule: 'Open parent complaints', severity: top[1] >= 2 ? 'high' : 'watch', domain: 'operations',
      headline: `${openNegative.length} open parent complaints — ${top[1]} about ${top[0].toLowerCase()}`,
      why: 'Negative-sentiment feedback not yet resolved. Repeated themes point to a process problem, not a person.',
      owner: 'Admin office', escalatesTo: 'Principal',
      items: openNegative.map(c => ({ id: c.id, label: c.category, sub: c.text, value: c.status })),
      action: { label: 'Review complaints', kind: 'open', to: 'communication' },
    })
  }

  /* Finance -------------------------------------------------------------- */

  const defaulters = d.students.map(s => ({ s, f: feeStatus(s) })).filter(x => x.f.overdue > RULES.feeOverdue).sort((a, b) => b.f.overdue - a.f.overdue)
  if (defaulters.length) alerts.push({
    id: 'finance-defaulters', rule: `Overdue above ${rupees(RULES.feeOverdue)}`, severity: 'critical', domain: 'finance',
    headline: `${defaulters.length} families owe more than ${rupees(RULES.feeOverdue)}`,
    why: `The Term 2 instalment was due on 15 September. Total overdue in this group: ${rupees(defaulters.reduce((a, b) => a + b.f.overdue, 0))}.`,
    owner: 'Accounts', escalatesTo: 'Principal → School owner',
    items: defaulters.map(({ s, f }) => ({ id: s.id, label: s.name, sub: `${s.classId} · paid ${Math.round(f.paidPct * 100)}%`, value: rupees(f.overdue) })),
    action: { label: 'Send reminders', kind: 'open', to: 'fees' },
  })

  return alerts
    .map(a => ({ ...a, acknowledgedAt: d.acknowledgedAlerts[a.id] }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.items.length - a.items.length)
}

/* ───────────────────────── school pulse (headline KPIs) ───────────────────────── */

export function schoolPulse(d: SchoolData) {
  const today = demoNow().slice(0, 10)
  const marked = d.registers.filter(r => r.markedAt)
  const marks = marked.flatMap(r => Object.values(r.marks))
  const present = marks.filter(m => m !== 'A').length
  const staffToday = d.staff.map(s => s.attendance[s.attendance.length - 1]).filter(a => a?.date === today)
  const staffIn = staffToday.filter(a => a.status === 'present' || a.status === 'late').length
  const totalFee = d.students.reduce((a, s) => a + s.feeTotal, 0)
  const collected = d.students.reduce((a, s) => a + s.feePaid, 0)
  const overdue = d.students.reduce((a, s) => a + feeStatus(s).overdue, 0)
  const month = today.slice(0, 7)
  const collectedThisMonth = d.feePayments.filter(p => p.at.startsWith(month)).reduce((a, p) => a + p.amount, 0)
  // 60-day school attendance trend (one point per day)
  const trend = d.school.schoolDays.map((_, i) => d.students.reduce((a, s) => a + (s.attendance[i] !== 'A' ? 1 : 0), 0) / d.students.length)
  return {
    students: d.students.length,
    registersMarked: marked.length,
    registersTotal: d.registers.length,
    presentToday: present,
    markedToday: marks.length,
    attendanceToday: marks.length ? present / marks.length : null,
    staffIn,
    staffTotal: staffToday.length,
    busesArrived: d.buses.filter(b => b.status === 'arrived').length,
    busesTotal: d.buses.length,
    pendingApprovals: d.approvals.filter(a => a.status === 'pending').length,
    feeCollected: collected,
    feeTotal: totalFee,
    feeOverdue: overdue,
    collectedThisMonth,
    attendanceTrend: trend,
  }
}

/** Short, human sentence for the top of the principal's day. */
export function morningBrief(d: SchoolData, alerts = computeAlerts(d)) {
  const p = schoolPulse(d)
  const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledgedAt)
  const parts = [`${p.registersMarked} of ${p.registersTotal} classrooms have taken the register`]
  if (p.attendanceToday !== null) parts.push(`${Math.round(p.attendanceToday * 100)}% of children are in`)
  parts.push(`${p.staffIn} of ${p.staffTotal} staff checked in`)
  return {
    line: parts.join(', ') + '.',
    focus: critical.length ? `${critical.length} thing${critical.length > 1 ? 's' : ''} need${critical.length > 1 ? '' : 's'} you before assembly ends.` : 'Nothing urgent. A calm morning.',
  }
}
