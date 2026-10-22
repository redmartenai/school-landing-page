/**
 * Ask EduFlow — natural-language questions over the monitoring engine.
 * Deterministic intent matching today; the same Answer shape can be produced by an LLM tool-call later.
 */
import type { SchoolData } from '@/store/school'
import type { Subject } from '@/data/types'
import {
  attendanceRate, attendanceSeries, averageMark, computeAlerts, feeStatus, marksTrend, schoolPulse,
  studentRisk, teacherScorecard, todayMark, unansweredThreads,
} from './monitoring'
import { rupees } from '@/lib/format'

export interface Answer {
  summary: string
  columns: string[]
  rows: { id: string; cells: string[]; tone?: 'bad' | 'warn' | 'good' }[]
  followUps: string[]
}

export const SUGGESTIONS = [
  'Show students below 75% attendance',
  'Who is absent today?',
  'Show unpaid fees above ₹20,000',
  'Which teachers have pending marks?',
  'Students whose marks are falling in 9B',
  'Show staff with pending approvals',
  'Teacher scorecards',
  'Parents waiting for a reply',
  'Top performers in 10A',
  'Where are the buses?',
]

const num = (q: string) => {
  const m = q.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|l|lakh|%)?/i)
  if (!m) return null
  let n = parseFloat(m[1])
  const u = m[2]?.toLowerCase()
  if (u === 'k') n *= 1000
  if (u === 'l' || u === 'lakh') n *= 100000
  return n
}
const classIn = (q: string) => q.toUpperCase().match(/\b(6|7|8|9|10)\s?([AB])\b/)?.slice(1, 3).join('') ?? null
const SUBJECT_WORDS: [RegExp, Subject][] = [[/math/i, 'Mathematics'], [/science/i, 'Science'], [/english/i, 'English'], [/hindi/i, 'Hindi'], [/social|history|geography/i, 'Social Studies'], [/computer|cs\b/i, 'Computer Science']]

export function ask(d: SchoolData, raw: string): Answer {
  const q = raw.trim().toLowerCase()
  const cls = classIn(raw)
  const inClass = <T extends { classId: string }>(xs: T[]) => (cls ? xs.filter(x => x.classId === cls) : xs)
  const where = cls ? ` in ${cls}` : ''

  // attendance below N%
  if (/attendance/.test(q) && /(below|under|less|<|risk)/.test(q)) {
    const n = num(q)
    const th = n && n <= 100 ? n / 100 : 0.75
    const rows = inClass(d.students).map(s => ({ s, r: attendanceRate(attendanceSeries(d, s)) })).filter(x => x.r < th).sort((a, b) => a.r - b.r)
    return {
      summary: `${rows.length} student${rows.length === 1 ? '' : 's'}${where} below ${Math.round(th * 100)}% attendance.`,
      columns: ['Student', 'Class', 'Attendance', 'Risk'],
      rows: rows.map(({ s, r }) => ({ id: s.id, cells: [s.name, s.classId, `${Math.round(r * 100)}%`, `${studentRisk(d, s).score}`], tone: r < 0.7 ? 'bad' : 'warn' })),
      followUps: ['Who is absent today?', 'Students whose marks are falling'],
    }
  }

  // absent today
  if (/absent|not in|missing/.test(q) && /today|now/.test(q) && !/staff|teacher/.test(q)) {
    const rows = inClass(d.students).filter(s => todayMark(d, s) === 'A')
    const unmarked = d.registers.filter(r => !r.markedAt).map(r => r.classId)
    return {
      summary: `${rows.length} student${rows.length === 1 ? '' : 's'}${where} marked absent so far.${unmarked.length ? ` Registers still open: ${unmarked.join(', ')}.` : ''}`,
      columns: ['Student', 'Class', 'Absences (60d)', 'Bus'],
      rows: rows.map(s => ({ id: s.id, cells: [s.name, s.classId, `${s.attendance.filter(m => m === 'A').length}`, s.busId ? `Bus ${s.busId}` : '—'], tone: 'warn' })),
      followUps: ['Show students below 75% attendance', 'Where are the buses?'],
    }
  }

  // staff absent / late
  if (/(staff|teacher)/.test(q) && /(absent|late|leave|not in)/.test(q)) {
    const today = d.staff.map(s => ({ s, a: s.attendance[s.attendance.length - 1] })).filter(x => x.a.status !== 'present')
    return {
      summary: `${today.length} staff are not fully in today.`,
      columns: ['Name', 'Role', 'Status', 'Check-in'],
      rows: today.map(({ s, a }) => ({ id: s.id, cells: [s.name, s.designation, a.status, a.checkIn ?? '—'], tone: a.status === 'absent' ? 'bad' : 'warn' })),
      followUps: ['Teacher scorecards', 'Show staff with pending approvals'],
    }
  }

  // fees
  if (/fee|unpaid|due|owe|defaulter|overdue|outstanding/.test(q)) {
    const n = num(q) ?? 0
    const rows = inClass(d.students).map(s => ({ s, f: feeStatus(s) })).filter(x => x.f.overdue > 0 && x.f.overdue >= n).sort((a, b) => b.f.overdue - a.f.overdue)
    const total = rows.reduce((a, b) => a + b.f.overdue, 0)
    return {
      summary: `${rows.length} families${where} with overdue fees${n ? ` above ${rupees(n)}` : ''} — ${rupees(total)} in total.`,
      columns: ['Student', 'Class', 'Overdue', 'Paid'],
      rows: rows.map(({ s, f }) => ({ id: s.id, cells: [s.name, s.classId, rupees(f.overdue), `${Math.round(f.paidPct * 100)}%`], tone: f.overdue > 20000 ? 'bad' : 'warn' })),
      followUps: ['Show unpaid fees above ₹50,000', 'Students at risk'],
    }
  }

  // pending marks
  if (/marks?/.test(q) && /(pending|not submitted|overdue|late)/.test(q)) {
    const rows = d.exams.filter(e => e.status === 'pending')
    return {
      summary: `${new Set(rows.map(r => r.teacherId)).size} teachers have ${rows.length} mark sheets pending for Unit Test 2.`,
      columns: ['Teacher', 'Class', 'Subject', 'Deadline'],
      rows: rows.map(e => ({ id: e.id, cells: [d.staff.find(s => s.id === e.teacherId)?.name ?? '', e.classId, e.subject, e.deadline], tone: 'bad' })),
      followUps: ['Teacher scorecards'],
    }
  }

  // falling marks
  if (/(falling|dropp|declin|worse)/.test(q)) {
    const subj = SUBJECT_WORDS.find(([re]) => re.test(q))?.[1]
    const rows = inClass(d.students).map(s => {
      if (subj) {
        const m = s.marks[subj]
        return { s, before: (m.unitTest1 + m.term1) / 2, now: m.unitTest2 ?? (m.unitTest1 + m.term1) / 2 }
      }
      const t = marksTrend(s)
      return { s, before: t.before, now: t.now }
    }).filter(x => x.now - x.before <= -10).sort((a, b) => a.now - a.before - (b.now - b.before))
    return {
      summary: `${rows.length} student${rows.length === 1 ? '' : 's'}${where} dropped 10+ points${subj ? ` in ${subj}` : ''} in Unit Test 2.`,
      columns: ['Student', 'Class', 'Before', 'Now'],
      rows: rows.map(({ s, before, now }) => ({ id: s.id, cells: [s.name, s.classId, `${Math.round(before)}`, `${Math.round(now)}`], tone: 'bad' })),
      followUps: ['Students at risk', 'Teacher scorecards'],
    }
  }

  // top performers
  if (/(top|best|highest)/.test(q)) {
    const rows = inClass(d.students).map(s => ({ s, avg: averageMark(s) })).sort((a, b) => b.avg - a.avg).slice(0, 10)
    return {
      summary: `Top ${rows.length} students${where} by average across all assessments.`,
      columns: ['Student', 'Class', 'Average', 'Attendance'],
      rows: rows.map(({ s, avg }) => ({ id: s.id, cells: [s.name, s.classId, `${Math.round(avg)}%`, `${Math.round(attendanceRate(attendanceSeries(d, s)) * 100)}%`], tone: 'good' })),
      followUps: ['Students whose marks are falling'],
    }
  }

  // approvals
  if (/approval|pending request|leave request/.test(q)) {
    const rows = d.approvals.filter(a => a.status === 'pending')
    return {
      summary: `${rows.length} approvals waiting for a decision.`,
      columns: ['Request', 'From', 'Type', 'Raised'],
      rows: rows.map(a => ({ id: a.id, cells: [a.title, d.staff.find(s => s.id === a.requestedBy)?.name ?? '', a.kind, a.at.slice(0, 10)] })),
      followUps: ['Teacher scorecards'],
    }
  }

  // scorecards
  if (/scorecard|performance|teacher.*(rank|score)|which teacher/.test(q)) {
    const rows = d.staff.filter(s => s.role === 'teacher' && s.subjects.length).map(t => ({ t, sc: teacherScorecard(d, t) })).sort((a, b) => a.sc.score - b.sc.score)
    return {
      summary: `Teacher scorecards, lowest first. ${rows.filter(r => r.sc.grade === 'Needs support').length} need support.`,
      columns: ['Teacher', 'Score', 'Marks on time', 'Reviewed', 'Reply'],
      rows: rows.map(({ t, sc }) => ({ id: t.id, cells: [t.name, `${sc.score}`, `${Math.round(sc.marksOnTime * 100)}%`, `${Math.round(sc.reviewRate * 100)}%`, `${sc.replyHours}h`], tone: sc.grade === 'Needs support' ? 'bad' : sc.grade === 'Good' ? 'warn' : 'good' })),
      followUps: ['Which teachers have pending marks?', 'Parents waiting for a reply'],
    }
  }

  // parent replies
  if (/parent|message|reply|waiting/.test(q)) {
    const rows = unansweredThreads(d)
    return {
      summary: `${rows.length} parent messages are waiting more than 24 hours.`,
      columns: ['Parent', 'Student', 'Teacher', 'Message'],
      rows: rows.map(t => ({ id: t.id, cells: [d.parents.find(p => p.id === t.parentId)?.name ?? '', d.students.find(s => s.id === t.studentId)?.name ?? '', d.staff.find(s => s.id === t.staffId)?.name ?? '', t.messages[t.messages.length - 1].text], tone: 'warn' })),
      followUps: ['Teacher scorecards'],
    }
  }

  // buses
  if (/bus|transport|route/.test(q)) {
    return {
      summary: `${d.buses.filter(b => b.status === 'arrived').length} of ${d.buses.length} buses have arrived.`,
      columns: ['Bus', 'Route', 'Status', 'Students'],
      rows: d.buses.map(b => ({ id: b.id, cells: [`Bus ${b.id}`, b.route, b.status === 'delayed' ? `Delayed +${b.delayMin}m` : b.status, `${b.studentIds.length}`], tone: b.status === 'delayed' ? 'bad' : 'good' })),
      followUps: ['Who is absent today?'],
    }
  }

  // risk (general)
  if (/risk|attention|worry|concern|struggl/.test(q)) {
    const rows = inClass(d.students).map(s => ({ s, r: studentRisk(d, s) })).filter(x => x.r.level === 'at-risk').sort((a, b) => b.r.score - a.r.score)
    return {
      summary: `${rows.length} students${where} are at risk across attendance, marks, fees and behaviour.`,
      columns: ['Student', 'Class', 'Score', 'Why'],
      rows: rows.map(({ s, r }) => ({ id: s.id, cells: [s.name, s.classId, `${r.score}`, r.factors.map(f => f.label).join(' · ')], tone: 'bad' })),
      followUps: ['Show students below 75% attendance', 'Students whose marks are falling'],
    }
  }

  // fallback: summarise the alerts
  const alerts = computeAlerts(d)
  const p = schoolPulse(d)
  return {
    summary: `I didn’t catch that exactly — here is what needs attention right now. ${p.registersMarked}/${p.registersTotal} registers are in.`,
    columns: ['Signal', 'Owner', 'Severity'],
    rows: alerts.map(a => ({ id: a.id, cells: [a.headline, a.owner, a.severity], tone: a.severity === 'critical' ? 'bad' : a.severity === 'high' ? 'warn' : undefined })),
    followUps: SUGGESTIONS.slice(0, 4),
  }
}
