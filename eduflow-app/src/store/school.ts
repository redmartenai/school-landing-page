import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as seed from '@/data/seed'
import type {
  Admission, AdmissionStage, Announcement, Approval, AttendanceMark, AuditEntry, Complaint, Exam,
  FeePayment, Homework, Lesson, ModuleId, Notification, PermAction, RoleId, Subject, Thread,
} from '@/data/types'
import { demoNow, rupees } from '@/lib/format'

/** A line in the school's live activity stream (principal wall, live demo). */
export interface ActivityEvent {
  id: string
  at: string
  actorId: string
  kind: 'attendance' | 'approval' | 'fees' | 'message' | 'homework' | 'marks' | 'announcement' | 'admission' | 'payroll' | 'lms' | 'nudge' | 'permission'
  text: string
}

function initialData() {
  // structuredClone so the module-level seed stays pristine for reset()
  return structuredClone({
    school: seed.school,
    classes: seed.classes,
    students: seed.students,
    parents: seed.parents,
    staff: seed.staff,
    timetable: seed.timetable,
    exams: seed.exams,
    homework: seed.homework,
    threads: seed.threads,
    announcements: seed.announcements,
    approvals: seed.approvals,
    buses: seed.buses,
    feePayments: seed.feePayments,
    admissions: seed.admissions,
    payrollRuns: seed.payrollRuns,
    remarks: seed.remarks,
    lessons: seed.lessons,
    quizzes: seed.quizzes,
    complaints: seed.complaints,
    registers: seed.registers,
    notifications: seed.notifications,
    audit: seed.audit,
    permissions: seed.permissions,
    substitutions: seed.substitutions,
    events: [] as ActivityEvent[],
    /** alert ids the owner has acknowledged ("I'm on it") → acknowledged at */
    acknowledgedAlerts: {} as Record<string, string>,
  })
}

export type SchoolData = ReturnType<typeof initialData>

interface Actions {
  markRegister: (classId: string, marks: Record<string, AttendanceMark>, byId: string) => void
  decideApproval: (id: string, status: 'approved' | 'rejected', byId: string) => void
  requestLeave: (staffId: string, from: string, to: string, reason: string) => void
  recordPayment: (studentId: string, amount: number, mode: FeePayment['mode'], byId: string) => void
  remindFees: (studentIds: string[], byId: string) => void
  sendMessage: (threadId: string, fromId: string, text: string) => void
  startThread: (t: Omit<Thread, 'id' | 'messages'>, fromId: string, text: string) => string
  createAnnouncement: (a: Pick<Announcement, 'title' | 'body' | 'audience'>, fromId: string) => void
  respondAnnouncement: (id: string, staffId: string, text: string) => void
  acknowledgeAnnouncement: (id: string, staffId: string) => void
  createHomework: (h: Pick<Homework, 'classId' | 'subject' | 'title' | 'description' | 'dueDate'>, teacherId: string) => void
  submitHomework: (homeworkId: string, studentId: string) => void
  reviewHomework: (homeworkId: string, byId: string) => void
  submitMarks: (examId: string, marks: Record<string, number>, byId: string) => void
  publishMarks: (examId: string, byId: string) => void
  addRemark: (studentId: string, staffId: string, subject: Subject | 'General', text: string, tone: 'praise' | 'concern' | 'note') => void
  moveAdmission: (id: string, stage: AdmissionStage, byId: string) => void
  addAdmission: (a: Pick<Admission, 'childName' | 'grade' | 'parentName' | 'phone' | 'source' | 'notes'>, byId: string) => void
  processPayroll: (runId: string, byId: string) => void
  markPayrollPaid: (runId: string, byId: string) => void
  togglePermission: (role: string, module: ModuleId, action: PermAction, byId: string) => void
  setLessonProgress: (lessonId: string, studentId: string, pct: number) => void
  recordQuiz: (quizId: string, studentId: string, score: number) => void
  publishLesson: (l: Pick<Lesson, 'classId' | 'subject' | 'title' | 'kind' | 'minutes' | 'chapter'>, teacherId: string) => void
  readNotifications: (role: RoleId, id?: string) => void
  updateComplaint: (id: string, status: Complaint['status']) => void
  nudge: (toStaffId: string, title: string, body: string, byId: string) => void
  assignSubstitute: (classId: string, period: number, staffId: string, byId: string) => void
  acknowledgeAlert: (alertId: string) => void
  reset: () => void
}

export type SchoolState = SchoolData & Actions

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`

export const useSchool = create<SchoolState>()(
  persist(
    (set, get) => {
      const nameOf = (id: string) =>
        get().staff.find(s => s.id === id)?.name ?? get().parents.find(p => p.id === id)?.name ?? get().students.find(s => s.id === id)?.name ?? 'Someone'

      const roleOf = (id: string): RoleId =>
        id === seed.DEMO.principalId ? 'principal' : id.startsWith('st-admin') || id === 'st-acct' ? 'admin' : id.startsWith('st-') ? 'staff' : id.startsWith('par-') ? 'parent' : 'student'

      /** Every write goes through here: activity stream + audit trail + notifications in one place. */
      const log = (
        s: SchoolData,
        e: Omit<ActivityEvent, 'id' | 'at'>,
        audit?: { action: string; target: string; sensitive?: boolean },
        notes: Omit<Notification, 'id' | 'at' | 'read'>[] = [],
      ) => {
        const at = demoNow()
        s.events = [{ id: uid('ev'), at, ...e }, ...s.events].slice(0, 200)
        if (audit) s.audit = [{ id: uid('au'), at, actorId: e.actorId, actorRole: roleOf(e.actorId), action: audit.action, target: audit.target, sensitive: audit.sensitive ?? false } as AuditEntry, ...s.audit]
        if (notes.length) s.notifications = [...notes.map(n => ({ ...n, id: uid('n'), at, read: false })), ...s.notifications]
      }

      /** Immutable-ish update helper: clone the slices we touch, run the mutation, commit. */
      const mutate = (fn: (s: SchoolData) => void) =>
        set(state => {
          const draft = { ...state } as SchoolData
          fn(draft)
          return draft
        })

      return {
        ...initialData(),

        markRegister: (classId, marks, byId) => mutate(s => {
          const at = demoNow()
          s.registers = s.registers.map(r => (r.classId === classId ? { ...r, marks, markedAt: at, markedBy: byId } : r))
          const absent = Object.entries(marks).filter(([, m]) => m === 'A').map(([id]) => id)
          const late = Object.entries(marks).filter(([, m]) => m === 'L').map(([id]) => id)
          const notes: Omit<Notification, 'id' | 'at' | 'read'>[] = []
          for (const [sid, m] of Object.entries(marks)) {
            const st = s.students.find(x => x.id === sid)
            if (!st) continue
            const first = st.name.split(' ')[0]
            notes.push({
              audience: { role: 'parent', id: st.parentId }, studentId: sid, kind: 'attendance',
              title: m === 'P' ? `${first} marked present · ${classId}` : m === 'L' ? `${first} marked late · ${classId}` : `${first} is absent today · ${classId}`,
              body: m === 'A' ? 'If this is unexpected, please message the class teacher.' : `Register taken by ${nameOf(byId)} at ${at.slice(11, 16)}.`,
            })
            notes.push({ audience: { role: 'student', id: sid }, kind: 'attendance', title: m === 'A' ? 'Marked absent today' : m === 'L' ? 'Marked late today' : 'Marked present', body: `${classId} · ${at.slice(11, 16)}` })
          }
          log(s, { actorId: byId, kind: 'attendance', text: `${classId} register marked — ${Object.keys(marks).length - absent.length - late.length} present, ${absent.length} absent${late.length ? `, ${late.length} late` : ''}` }, { action: 'Marked register', target: `${classId} · ${at.slice(0, 10)}` }, notes)
        }),

        decideApproval: (id, status, byId) => mutate(s => {
          const ap = s.approvals.find(a => a.id === id)
          if (!ap) return
          s.approvals = s.approvals.map(a => (a.id === id ? { ...a, status, decidedBy: byId, decidedAt: demoNow() } : a))
          if (ap.kind === 'refund' && status === 'approved' && ap.subjectId && ap.amount) {
            s.students = s.students.map(st => (st.id === ap.subjectId ? { ...st, feePaid: st.feePaid - ap.amount! } : st))
          }
          if (ap.kind === 'marks-correction' && status === 'approved' && ap.subjectId) {
            s.students = s.students.map(st => (st.id === ap.subjectId ? { ...st, marks: { ...st.marks, Mathematics: { ...st.marks.Mathematics, term1: 66 } } } : st))
          }
          log(s, { actorId: byId, kind: 'approval', text: `${status === 'approved' ? 'Approved' : 'Declined'}: ${ap.title} — ${nameOf(ap.requestedBy)}` },
            { action: `${status === 'approved' ? 'Approved' : 'Rejected'} ${ap.kind}`, target: ap.title, sensitive: ap.kind !== 'leave' },
            [{ audience: { role: roleOf(ap.requestedBy) === 'admin' ? 'admin' : 'staff', id: ap.requestedBy }, kind: 'approval', title: `${ap.title} ${status}`, body: `Decided by ${nameOf(byId)}` }])
        }),

        requestLeave: (staffId, from, to, reason) => mutate(s => {
          const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 864e5) + 1)
          s.approvals = [{ id: uid('ap'), kind: 'leave', requestedBy: staffId, subjectId: staffId, title: `Leave · ${days} day${days > 1 ? 's' : ''}`, detail: reason, from, to, at: demoNow(), status: 'pending' } as Approval, ...s.approvals]
          log(s, { actorId: staffId, kind: 'approval', text: `${nameOf(staffId)} requested ${days} day${days > 1 ? 's' : ''} leave` }, undefined,
            [{ audience: { role: 'principal' }, kind: 'approval', title: 'New leave request', body: `${nameOf(staffId)} · ${from}${from !== to ? ` → ${to}` : ''}` }])
        }),

        recordPayment: (studentId, amount, mode, byId) => mutate(s => {
          const st = s.students.find(x => x.id === studentId)
          if (!st) return
          const receiptNo = `GF/26/${25000 + s.feePayments.length}`
          s.feePayments = [...s.feePayments, { id: uid('pay'), studentId, amount, at: demoNow(), mode, receiptNo, collectedBy: byId }]
          s.students = s.students.map(x => (x.id === studentId ? { ...x, feePaid: x.feePaid + amount } : x))
          log(s, { actorId: byId, kind: 'fees', text: `${rupees(amount)} received for ${st.name} (${st.classId}) via ${mode}` },
            { action: 'Recorded fee payment', target: `${receiptNo} · ${rupees(amount)}`, sensitive: true },
            [{ audience: { role: 'parent', id: st.parentId }, studentId, kind: 'fees', title: `Payment received · ${rupees(amount)}`, body: `Receipt ${receiptNo} for ${st.name.split(' ')[0]}. Thank you!` }])
        }),

        remindFees: (studentIds, byId) => mutate(s => {
          const notes = studentIds.flatMap(id => {
            const st = s.students.find(x => x.id === id)
            if (!st) return []
            const overdue = Math.max(0, Math.round((st.feeTotal * 2) / 3) - st.feePaid)
            return [{ audience: { role: 'parent' as const, id: st.parentId }, studentId: id, kind: 'fees' as const, title: `Fee reminder · ${st.name.split(' ')[0]}`, body: `${rupees(overdue)} is overdue since 15 September. Pay securely from the Fees tab.` }]
          })
          log(s, { actorId: byId, kind: 'fees', text: `Fee reminders sent to ${notes.length} famil${notes.length === 1 ? 'y' : 'ies'}` }, { action: 'Sent fee reminders', target: `${notes.length} families` }, notes)
        }),

        sendMessage: (threadId, fromId, text) => mutate(s => {
          const th = s.threads.find(t => t.id === threadId)
          if (!th) return
          s.threads = s.threads.map(t => (t.id === threadId ? { ...t, messages: [...t.messages, { id: uid('m'), from: fromId, text, at: demoNow() }] } : t))
          const toParent = fromId === th.staffId
          const st = s.students.find(x => x.id === th.studentId)
          log(s, { actorId: fromId, kind: 'message', text: `${nameOf(fromId)} ${toParent ? 'replied to' : 'messaged'} ${toParent ? nameOf(th.parentId ?? th.studentId) : nameOf(th.staffId)}` }, undefined,
            [toParent
              ? { audience: th.parentId ? { role: 'parent', id: th.parentId } : { role: 'student', id: th.studentId }, studentId: th.studentId, kind: 'message', title: `${nameOf(fromId)} replied`, body: text.slice(0, 90) }
              : { audience: { role: 'staff', id: th.staffId }, studentId: th.studentId, kind: 'message', title: `Message from ${nameOf(fromId)}`, body: `${st?.name ?? ''} · ${text.slice(0, 80)}` }])
        }),

        startThread: (t, fromId, text) => {
          const id = uid('th')
          mutate(s => {
            s.threads = [{ ...t, id, messages: [{ id: uid('m'), from: fromId, text, at: demoNow() }] }, ...s.threads]
            log(s, { actorId: fromId, kind: 'message', text: `${nameOf(fromId)} started a conversation with ${nameOf(t.staffId)}` }, undefined,
              [{ audience: { role: 'staff', id: t.staffId }, studentId: t.studentId, kind: 'message', title: `New message from ${nameOf(fromId)}`, body: text.slice(0, 90) }])
          })
          return id
        },

        createAnnouncement: (a, fromId) => mutate(s => {
          s.announcements = [{ ...a, id: uid('an'), fromId, at: demoNow(), pinned: false, acknowledgedBy: [], responses: [] }, ...s.announcements]
          const notes: Omit<Notification, 'id' | 'at' | 'read'>[] = []
          if (a.audience.includes('staff')) notes.push({ audience: { role: 'staff' }, kind: 'announcement', title: a.title, body: a.body.slice(0, 100) })
          if (a.audience.includes('parents')) notes.push({ audience: { role: 'parent' }, kind: 'announcement', title: a.title, body: a.body.slice(0, 100) })
          if (a.audience.includes('students')) notes.push({ audience: { role: 'student' }, kind: 'announcement', title: a.title, body: a.body.slice(0, 100) })
          log(s, { actorId: fromId, kind: 'announcement', text: `Announcement: ${a.title}` }, { action: 'Published announcement', target: a.title }, notes)
        }),

        respondAnnouncement: (id, staffId, text) => mutate(s => {
          s.announcements = s.announcements.map(a => (a.id === id ? { ...a, responses: [...a.responses, { id: uid('r'), staffId, text, at: demoNow() }], acknowledgedBy: a.acknowledgedBy.includes(staffId) ? a.acknowledgedBy : [...a.acknowledgedBy, staffId] } : a))
          const a = s.announcements.find(x => x.id === id)
          log(s, { actorId: staffId, kind: 'announcement', text: `${nameOf(staffId)} responded to “${a?.title}”` }, undefined,
            [{ audience: { role: 'principal' }, kind: 'announcement', title: `${nameOf(staffId)} responded`, body: text.slice(0, 90) }])
        }),

        acknowledgeAnnouncement: (id, staffId) => mutate(s => {
          s.announcements = s.announcements.map(a => (a.id === id && !a.acknowledgedBy.includes(staffId) ? { ...a, acknowledgedBy: [...a.acknowledgedBy, staffId] } : a))
        }),

        createHomework: (h, teacherId) => mutate(s => {
          const cls = s.classes.find(c => c.id === h.classId)
          if (!cls) return
          const submissions: Homework['submissions'] = Object.fromEntries(cls.studentIds.map(id => [id, 'pending' as const]))
          s.homework = [{ ...h, id: uid('hw'), teacherId, assignedAt: demoNow().slice(0, 10), submissions }, ...s.homework]
          const notes = cls.studentIds.flatMap(sid => {
            const st = s.students.find(x => x.id === sid)!
            return [
              { audience: { role: 'student' as const, id: sid }, kind: 'homework' as const, title: `${h.subject} homework`, body: `${h.title} · due ${h.dueDate}` },
              { audience: { role: 'parent' as const, id: st.parentId }, studentId: sid, kind: 'homework' as const, title: `${h.subject} homework uploaded`, body: `${h.title} · due ${h.dueDate}` },
            ]
          })
          log(s, { actorId: teacherId, kind: 'homework', text: `${nameOf(teacherId)} set ${h.subject} homework for ${h.classId}` }, undefined, notes)
        }),

        submitHomework: (homeworkId, studentId) => mutate(s => {
          s.homework = s.homework.map(h => (h.id === homeworkId ? { ...h, submissions: { ...h.submissions, [studentId]: h.dueDate < demoNow().slice(0, 10) ? 'late' : 'submitted' } } : h))
          const h = s.homework.find(x => x.id === homeworkId)!
          const st = s.students.find(x => x.id === studentId)!
          log(s, { actorId: studentId, kind: 'homework', text: `${st.name} submitted ${h.subject} homework` }, undefined,
            [{ audience: { role: 'parent', id: st.parentId }, studentId, kind: 'homework', title: `${st.name.split(' ')[0]} submitted homework`, body: `${h.subject} · ${h.title}` }])
        }),

        reviewHomework: (homeworkId, byId) => mutate(s => {
          s.homework = s.homework.map(h => (h.id === homeworkId ? { ...h, submissions: Object.fromEntries(Object.entries(h.submissions).map(([k, v]) => [k, v === 'submitted' || v === 'late' ? 'reviewed' : v])) } : h))
          const h = s.homework.find(x => x.id === homeworkId)!
          log(s, { actorId: byId, kind: 'homework', text: `${nameOf(byId)} reviewed ${h.classId} ${h.subject} homework` })
        }),

        submitMarks: (examId, marks, byId) => mutate(s => {
          const ex = s.exams.find(e => e.id === examId) as Exam
          s.exams = s.exams.map(e => (e.id === examId ? { ...e, status: 'submitted', submittedAt: demoNow() } : e))
          s.students = s.students.map(st => (marks[st.id] !== undefined ? { ...st, marks: { ...st.marks, [ex.subject]: { ...st.marks[ex.subject], unitTest2: marks[st.id] } } } : st))
          log(s, { actorId: byId, kind: 'marks', text: `${nameOf(byId)} submitted ${ex.classId} ${ex.subject} marks` }, { action: 'Submitted marks', target: `${ex.classId} · ${ex.subject} · ${ex.name}`, sensitive: true },
            [{ audience: { role: 'principal' }, kind: 'marks', title: `${ex.classId} ${ex.subject} marks submitted`, body: `${nameOf(byId)} · ready to publish` }])
        }),

        publishMarks: (examId, byId) => mutate(s => {
          const ex = s.exams.find(e => e.id === examId)!
          s.exams = s.exams.map(e => (e.id === examId ? { ...e, status: 'published' } : e))
          const cls = s.classes.find(c => c.id === ex.classId)!
          const notes = cls.studentIds.map(sid => {
            const st = s.students.find(x => x.id === sid)!
            return { audience: { role: 'parent' as const, id: st.parentId }, studentId: sid, kind: 'marks' as const, title: `${ex.name} results · ${st.name.split(' ')[0]}`, body: `${ex.subject} ${st.marks[ex.subject].unitTest2 ?? '—'}/100` }
          })
          log(s, { actorId: byId, kind: 'marks', text: `${ex.classId} ${ex.subject} results published to parents` }, { action: 'Published marks', target: `${ex.classId} · ${ex.subject}`, sensitive: true }, notes)
        }),

        addRemark: (studentId, staffId, subject, text, tone) => mutate(s => {
          const st = s.students.find(x => x.id === studentId)!
          s.remarks = [{ id: uid('rm'), studentId, staffId, subject, text, tone, at: demoNow(), visibleToParent: true }, ...s.remarks]
          log(s, { actorId: staffId, kind: 'message', text: `${nameOf(staffId)} left a remark for ${st.name}` }, undefined,
            [{ audience: { role: 'parent', id: st.parentId }, studentId, kind: 'remark', title: `A note from ${nameOf(staffId)}`, body: text.slice(0, 100) }])
        }),

        moveAdmission: (id, stage, byId) => mutate(s => {
          s.admissions = s.admissions.map(a => (a.id === id ? { ...a, stage, updatedAt: demoNow().slice(0, 10) } : a))
          const a = s.admissions.find(x => x.id === id)!
          log(s, { actorId: byId, kind: 'admission', text: `${a.childName} moved to ${stage}` }, { action: 'Updated admission', target: `${a.childName} → ${stage}` })
        }),

        addAdmission: (a, byId) => mutate(s => {
          const fee = a.grade <= 7 ? 72000 : a.grade === 8 ? 80000 : 92000
          s.admissions = [{ ...a, id: uid('adm'), stage: 'enquiry', createdAt: demoNow().slice(0, 10), updatedAt: demoNow().slice(0, 10), feeQuoted: fee }, ...s.admissions]
          log(s, { actorId: byId, kind: 'admission', text: `New enquiry: ${a.childName} for Grade ${a.grade}` }, { action: 'Created enquiry', target: a.childName })
        }),

        processPayroll: (runId, byId) => mutate(s => {
          s.payrollRuns = s.payrollRuns.map(r => (r.id === runId ? { ...r, status: 'processed', processedAt: demoNow() } : r))
          const r = s.payrollRuns.find(x => x.id === runId)!
          log(s, { actorId: byId, kind: 'payroll', text: `Payroll processed for ${r.month} · ${rupees(r.total)}` }, { action: 'Processed payroll', target: `${r.month} · ${rupees(r.total)}`, sensitive: true },
            [{ audience: { role: 'principal' }, kind: 'approval', title: `Payroll ${r.month} ready`, body: `${r.staffCount} staff · ${rupees(r.total)}` }])
        }),

        markPayrollPaid: (runId, byId) => mutate(s => {
          s.payrollRuns = s.payrollRuns.map(r => (r.id === runId ? { ...r, status: 'paid' } : r))
          const r = s.payrollRuns.find(x => x.id === runId)!
          log(s, { actorId: byId, kind: 'payroll', text: `Salaries credited for ${r.month}` }, { action: 'Released salaries', target: `${r.month} · ${rupees(r.total)}`, sensitive: true },
            [{ audience: { role: 'staff' }, kind: 'approval', title: 'Salary credited', body: `Your payslip for ${r.month} is ready.` }])
        }),

        togglePermission: (role, module, action, byId) => mutate(s => {
          const cur = s.permissions[role]?.[module] ?? []
          const next = cur.includes(action) ? cur.filter(a => a !== action) : [...cur, action]
          s.permissions = { ...s.permissions, [role]: { ...s.permissions[role], [module]: next } }
          log(s, { actorId: byId, kind: 'permission', text: `${role} → ${module} → ${action} ${cur.includes(action) ? 'removed' : 'granted'}` },
            { action: 'Changed permission', target: `${role} → ${module} → ${action} (${cur.includes(action) ? 'removed' : 'granted'})`, sensitive: true })
        }),

        setLessonProgress: (lessonId, studentId, pct) => mutate(s => {
          const before = s.lessons.find(l => l.id === lessonId)?.progress[studentId] ?? 0
          if (pct <= before) return
          s.lessons = s.lessons.map(l => (l.id === lessonId ? { ...l, progress: { ...l.progress, [studentId]: Math.max(l.progress[studentId] ?? 0, pct) } } : l))
          if (pct >= 100 && before < 100) {
            const l = s.lessons.find(x => x.id === lessonId)!
            s.students = s.students.map(st => (st.id === studentId ? { ...st, housePoints: st.housePoints + 5 } : st))
            log(s, { actorId: studentId, kind: 'lms', text: `${nameOf(studentId)} completed “${l.title}”` })
          }
        }),

        recordQuiz: (quizId, studentId, score) => mutate(s => {
          const best = s.quizzes.find(q => q.id === quizId)?.attempts[studentId] ?? 0
          if (score <= best && s.quizzes.find(q => q.id === quizId)?.attempts[studentId] !== undefined) return
          s.quizzes = s.quizzes.map(q => (q.id === quizId ? { ...q, attempts: { ...q.attempts, [studentId]: score } } : q))
          const q = s.quizzes.find(x => x.id === quizId)!
          s.students = s.students.map(st => (st.id === studentId ? { ...st, housePoints: st.housePoints + (score - best) * 2 } : st))
          log(s, { actorId: studentId, kind: 'lms', text: `${nameOf(studentId)} scored ${score}/${q.questions.length} on “${q.title}”` })
        }),

        publishLesson: (l, teacherId) => mutate(s => {
          const cls = s.classes.find(c => c.id === l.classId)!
          s.lessons = [{ ...l, id: uid('ls'), teacherId, publishedAt: demoNow(), progress: Object.fromEntries(cls.studentIds.map(id => [id, 0])) }, ...s.lessons]
          log(s, { actorId: teacherId, kind: 'lms', text: `${nameOf(teacherId)} published “${l.title}” for ${l.classId}` }, undefined,
            cls.studentIds.map(sid => ({ audience: { role: 'student' as const, id: sid }, kind: 'homework' as const, title: `New ${l.kind}: ${l.title}`, body: `${l.subject} · ${l.minutes} min` })))
        }),

        readNotifications: (role, id) => mutate(s => {
          s.notifications = s.notifications.map(n => (n.audience.role === role && (!n.audience.id || n.audience.id === id) ? { ...n, read: true } : n))
        }),

        updateComplaint: (id, status) => mutate(s => {
          s.complaints = s.complaints.map(c => (c.id === id ? { ...c, status } : c))
        }),

        nudge: (toStaffId, title, body, byId) => mutate(s => {
          log(s, { actorId: byId, kind: 'nudge', text: `${nameOf(byId)} nudged ${nameOf(toStaffId)}: ${title}` }, { action: 'Sent reminder', target: `${nameOf(toStaffId)} · ${title}` },
            [{ audience: { role: 'staff', id: toStaffId }, kind: 'alert', title, body }])
        }),

        assignSubstitute: (classId, period, staffId, byId) => mutate(s => {
          s.substitutions = { ...s.substitutions, [`${classId}:${period}`]: staffId }
          const slot = s.timetable[classId]?.[2]?.[period - 1]
          const what = `${classId} · Period ${period}${slot ? ` (${slot.start}, ${slot.subject})` : ''}`
          log(s, { actorId: byId, kind: 'nudge', text: `${nameOf(staffId)} will cover ${what}` },
            { action: 'Assigned substitute', target: `${nameOf(staffId)} → ${what}` },
            [{ audience: { role: 'staff', id: staffId }, kind: 'alert', title: `Please cover ${classId} · Period ${period}`, body: `${slot ? `${slot.start}–${slot.end} · ${slot.subject}. ` : ''}Assigned by ${nameOf(byId)}.` }])
        }),

        acknowledgeAlert: alertId => mutate(s => {
          s.acknowledgedAlerts = { ...s.acknowledgedAlerts, [alertId]: demoNow() }
        }),

        reset: () => set(() => ({ ...initialData() })),
      }
    },
    {
      name: 'eduflow-school-v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: s => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as SchoolData,
    },
  ),
)

// Cross-tab live sync: open the teacher phone in one tab and the principal wall in another.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === 'eduflow-school-v2') useSchool.persist.rehydrate()
  })
}

export const DEMO = seed.DEMO
export const SUBJECTS = seed.SUBJECTS
