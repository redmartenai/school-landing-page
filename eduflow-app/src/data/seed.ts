import type {
  Admission, Announcement, Approval, AttendanceMark, AuditEntry, Bus, Complaint, Exam, FeePayment,
  Homework, House, Lesson, Notification, Parent, PayrollRun, PermissionMatrix, Quiz, RegisterToday,
  Remark, School, SchoolClass, Staff, StaffDay, Student, Subject, SubjectMarks, Thread, Timetable,
  TimetableSlot,
} from './types'

/* ───────────────────────── deterministic randomness ───────────────────────── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261007)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
const between = (a: number, b: number) => a + rand() * (b - a)
const int = (a: number, b: number) => Math.floor(between(a, b + 1))
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const normal = (mean: number, sd: number) => {
  const u = 1 - rand(), v = rand()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/* ───────────────────────── calendar ───────────────────────── */

export const TODAY = '2026-10-07' // Wednesday
export const DEMO_START_TIME = '08:24'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const dt = (date: string, time: string) => `${date}T${time}:00`

function previousSchoolDays(from: string, count: number) {
  const days: string[] = []
  let cur = from
  while (days.length < count) {
    cur = addDays(cur, -1)
    const wd = new Date(cur + 'T00:00:00Z').getUTCDay()
    if (wd !== 0 && wd !== 6) days.unshift(cur)
  }
  return days
}
const schoolDays = previousSchoolDays(TODAY, 60)
const staffDays = schoolDays.slice(-30)

export const school: School = {
  name: 'Greenfield School',
  city: 'Pune',
  board: 'CBSE',
  academicYear: '2026–27',
  today: TODAY,
  schoolDays,
}

/* ───────────────────────── names ───────────────────────── */

const FIRST_F = ['Aarya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Nisha', 'Priya', 'Riya', 'Saanvi', 'Tara', 'Anika', 'Myra', 'Navya', 'Pari', 'Sara', 'Zoya', 'Aditi', 'Ira', 'Khushi', 'Avni', 'Mahi', 'Siya', 'Trisha', 'Jiya', 'Lavanya', 'Neha', 'Shreya', 'Tanvi', 'Vanya', 'Rhea']
const FIRST_M = ['Aarav', 'Arjun', 'Dev', 'Ishaan', 'Kabir', 'Reyansh', 'Rohan', 'Vivaan', 'Aditya', 'Krish', 'Om', 'Shaurya', 'Atharv', 'Ayaan', 'Dhruv', 'Kian', 'Laksh', 'Neel', 'Parth', 'Rudra', 'Sahil', 'Tanish', 'Yash', 'Veer', 'Arnav', 'Rishi', 'Pranav', 'Siddharth', 'Harsh', 'Nikhil']
const LAST = ['Sharma', 'Mehta', 'Iqbal', 'Varma', 'Nair', 'Rao', 'Patil', 'Deshpande', 'Joshi', 'Kulkarni', 'Gupta', 'Reddy', 'Pillai', 'Shetty', 'Banerjee', 'Kapoor', 'Malhotra', 'Bhat', 'Chopra', 'Sen', 'Das', 'Menon', 'Gokhale', 'Jain', 'Agarwal', 'Khan', 'Fernandes', 'Thakur', 'Pandey', 'Sinha']
const PARENT_F = ['Sunita', 'Anjali', 'Pooja', 'Rekha', 'Smita', 'Kavita', 'Neelam', 'Swati', 'Deepa', 'Rupali', 'Asha', 'Madhuri']
const PARENT_M = ['Rajesh', 'Sanjay', 'Amit', 'Vikram', 'Sunil', 'Manoj', 'Prakash', 'Nitin', 'Rahul', 'Girish', 'Anand', 'Mahesh']

export const SUBJECTS: Subject[] = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science']
const HOUSES: House[] = ['Willow', 'Banyan', 'Cedar', 'Neem']

/* ───────────────────────── demo identities ───────────────────────── */

export const DEMO = {
  principalId: 'st-principal',
  adminId: 'st-admin',
  staffId: 'st-math-b', // Ms. Kavya Rao — Mathematics, class teacher 9B
  studentId: 'stu-9B-01', // Ananya Kulkarni
  parentId: 'par-kulkarni',
  siblingId: 'stu-6A-01', // Vihaan Kulkarni
}

/* ───────────────────────── staff ───────────────────────── */

const salary = (basic: number) => {
  const hra = Math.round(basic * 0.4)
  const allowances = Math.round(basic * 0.15)
  const gross = basic + hra + allowances
  return {
    basic, hra, allowances,
    pf: Math.round(Math.min(basic, 15000) * 0.12),
    esi: gross <= 21000 ? Math.round(gross * 0.0075) : 0,
    tds: gross > 60000 ? Math.round((gross - 60000) * 0.1) : 0,
  }
}

function staffAttendance(lateBias: number, absentBias = 0.02): StaffDay[] {
  return staffDays.map(date => {
    const r = rand()
    if (r < absentBias) return { date, status: 'absent', checkIn: null }
    if (r < absentBias + 0.02) return { date, status: 'leave', checkIn: null }
    const late = rand() < lateBias
    const m = late ? int(3, 22) : int(32, 56)
    const h = late ? 8 : 7
    return { date, status: late ? 'late' : 'present', checkIn: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
  })
}

interface TeacherSpec { id: string; name: string; subject: Subject; group: 'a' | 'b'; late?: number; reply?: number }
const TEACHERS: TeacherSpec[] = [
  { id: 'st-math-a', name: 'Mr. Suresh Patil', subject: 'Mathematics', group: 'a', reply: 6 },
  { id: 'st-math-b', name: 'Ms. Kavya Rao', subject: 'Mathematics', group: 'b', reply: 3 },
  { id: 'st-sci-a', name: 'Ms. Farah Iqbal', subject: 'Science', group: 'a', reply: 5 },
  { id: 'st-sci-b', name: 'Mr. Anil Deshpande', subject: 'Science', group: 'b', late: 0.3, reply: 31 },
  { id: 'st-eng-a', name: 'Ms. Leena Fernandes', subject: 'English', group: 'a', reply: 4 },
  { id: 'st-eng-b', name: 'Mr. Joseph Pillai', subject: 'English', group: 'b', reply: 9 },
  { id: 'st-hin-a', name: 'Ms. Rekha Joshi', subject: 'Hindi', group: 'a', reply: 7 },
  { id: 'st-hin-b', name: 'Mr. Prakash Thakur', subject: 'Hindi', group: 'b', late: 0.26, reply: 28 },
  { id: 'st-sst-a', name: 'Ms. Anjali Sen', subject: 'Social Studies', group: 'a', reply: 5 },
  { id: 'st-sst-b', name: 'Mr. Vikram Malhotra', subject: 'Social Studies', group: 'b', reply: 12 },
  { id: 'st-cs-a', name: 'Ms. Neha Kapoor', subject: 'Computer Science', group: 'a', reply: 4 },
  { id: 'st-cs-b', name: 'Mr. Rahul Bhat', subject: 'Computer Science', group: 'b', late: 0.22, reply: 19 },
]

const CLASS_IDS = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B']
const GROUP_A = ['6A', '6B', '7A', '7B', '8A']
const GROUP_B = ['8B', '9A', '9B', '10A', '10B']
const CLASS_TEACHER: Record<string, string> = {
  '6A': 'st-eng-a', '6B': 'st-hin-a', '7A': 'st-sci-a', '7B': 'st-sst-a', '8A': 'st-math-a',
  '8B': 'st-cs-b', '9A': 'st-eng-b', '9B': 'st-math-b', '10A': 'st-sst-b', '10B': 'st-sci-b',
}

const phone = () => `+91 9${int(100000000, 999999999)}`
const emailOf = (name: string) => name.toLowerCase().replace(/^(mr|ms|dr)\.\s*/, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@greenfield.edu.in'

export const staff: Staff[] = [
  ...TEACHERS.map((t): Staff => {
    const classTeacherOf = Object.entries(CLASS_TEACHER).find(([, s]) => s === t.id)?.[0] ?? null
    return {
      id: t.id,
      name: t.name,
      role: 'teacher',
      designation: `${t.subject} Teacher${classTeacherOf ? ` · Class Teacher ${classTeacherOf}` : ''}`,
      subjects: [t.subject],
      classIds: t.group === 'a' ? GROUP_A : GROUP_B,
      classTeacherOf,
      phone: phone(),
      email: emailOf(t.name),
      joinDate: `20${int(12, 24)}-0${int(4, 7)}-01`,
      attendance: staffAttendance(t.late ?? 0.04),
      salary: salary(int(34, 58) * 1000),
      bank: `HDFC ••${int(1000, 9999)}`,
      avgParentReplyHours: t.reply ?? 8,
      leaveBalance: int(3, 12),
    }
  }),
  { id: 'st-principal', name: 'Dr. Meera Iyer', role: 'admin', designation: 'Principal', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: 'principal@greenfield.edu.in', joinDate: '2015-06-01', attendance: staffAttendance(0.02, 0), salary: salary(110000), bank: 'SBI ••4412', avgParentReplyHours: 10, leaveBalance: 14 },
  { id: 'st-admin', name: 'Rakesh Menon', role: 'admin', designation: 'School Administrator', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: 'admin@greenfield.edu.in', joinDate: '2017-04-01', attendance: staffAttendance(0.03), salary: salary(68000), bank: 'ICICI ••2290', avgParentReplyHours: 6, leaveBalance: 9 },
  { id: 'st-acct', name: 'Smita Gokhale', role: 'accountant', designation: 'Accountant', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: 'accounts@greenfield.edu.in', joinDate: '2019-07-01', attendance: staffAttendance(0.03), salary: salary(42000), bank: 'HDFC ••7781', avgParentReplyHours: 5, leaveBalance: 8 },
  { id: 'st-lib', name: 'Mr. Girish Bhat', role: 'support', designation: 'Librarian', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: 'library@greenfield.edu.in', joinDate: '2020-06-15', attendance: staffAttendance(0.05), salary: salary(30000), bank: 'BOI ••1904', avgParentReplyHours: 8, leaveBalance: 6 },
  { id: 'st-pe', name: 'Mr. Kiran Shetty', role: 'teacher', designation: 'Physical Education', subjects: [], classIds: CLASS_IDS, classTeacherOf: null, phone: phone(), email: 'pe@greenfield.edu.in', joinDate: '2021-06-01', attendance: staffAttendance(0.06), salary: salary(32000), bank: 'SBI ••6620', avgParentReplyHours: 9, leaveBalance: 7 },
  { id: 'st-drv-17', name: 'Ramesh Pawar', role: 'driver', designation: 'Driver · Bus 17', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: '', joinDate: '2018-01-10', attendance: staffAttendance(0.02), salary: salary(18000), bank: 'BOM ••3381', avgParentReplyHours: 0, leaveBalance: 5 },
  { id: 'st-drv-21', name: 'Sunil Kamble', role: 'driver', designation: 'Driver · Bus 21', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: '', joinDate: '2020-03-02', attendance: staffAttendance(0.08), salary: salary(17500), bank: 'BOM ••9013', avgParentReplyHours: 0, leaveBalance: 4 },
  { id: 'st-drv-08', name: 'Mahadev Jadhav', role: 'driver', designation: 'Driver · Bus 08', subjects: [], classIds: [], classTeacherOf: null, phone: phone(), email: '', joinDate: '2016-08-22', attendance: staffAttendance(0.03), salary: salary(19000), bank: 'BOM ••5127', avgParentReplyHours: 0, leaveBalance: 6 },
]

// Today: two teachers are absent/late — this is what the principal sees at 08:24
const todayStaff: Record<string, StaffDay> = {
  'st-hin-b': { date: TODAY, status: 'late', checkIn: '08:17' },
  'st-sst-b': { date: TODAY, status: 'leave', checkIn: null },
  'st-cs-b': { date: TODAY, status: 'absent', checkIn: null },
}
for (const s of staff) {
  s.attendance.push(todayStaff[s.id] ?? { date: TODAY, status: 'present', checkIn: `07:${String(int(30, 55)).padStart(2, '0')}` })
}

export const teacherFor = (classId: string, subject: Subject) =>
  TEACHERS.find(t => t.subject === subject && (t.group === 'a' ? GROUP_A : GROUP_B).includes(classId))!.id

/* ───────────────────────── students & parents ───────────────────────── */

const BUS_IDS = ['17', '21', '08', '12', '33']
const annualFee = (grade: number) => (grade <= 7 ? 72000 : grade === 8 ? 80000 : 92000)

export const classes: SchoolClass[] = CLASS_IDS.map(id => ({
  id,
  grade: Number(id.slice(0, -1)),
  section: id.slice(-1),
  room: `${id.slice(0, -1) === '10' ? 3 : Number(id.slice(0, -1)) >= 8 ? 2 : 1}${String(CLASS_IDS.indexOf(id) + 1).padStart(2, '0')}`,
  classTeacherId: CLASS_TEACHER[id],
  studentIds: [],
}))

export const students: Student[] = []
export const parents: Parent[] = []

function makeAttendance(p: number, decline = 0): AttendanceMark[] {
  return schoolDays.map((_, i) => {
    const pp = i > 44 ? p - decline : p
    const r = rand()
    if (r < pp) return rand() < 0.04 ? 'L' : 'P'
    return 'A'
  })
}

function makeMarks(ability: number, falling: boolean): Record<Subject, SubjectMarks> {
  const out = {} as Record<Subject, SubjectMarks>
  for (const s of SUBJECTS) {
    const a = ability + normal(0, 7)
    const ut1 = Math.round(clamp(a + normal(0, 5), 18, 99))
    const t1 = Math.round(clamp(a + normal(0, 5), 18, 99))
    const ut2 = Math.round(clamp(a + normal(0, 5) - (falling ? between(14, 24) : 0), 12, 99))
    out[s] = { unitTest1: ut1, term1: t1, unitTest2: ut2 }
  }
  return out
}

let parentSeq = 0
for (const c of classes) {
  const size = c.id === '9B' ? 34 : int(30, 34)
  for (let r = 1; r <= size; r++) {
    const id = `stu-${c.id}-${String(r).padStart(2, '0')}`
    const gender: 'F' | 'M' = rand() < 0.5 ? 'F' : 'M'
    let name = `${pick(gender === 'F' ? FIRST_F : FIRST_M)} ${pick(LAST)}`
    const lastName = name.split(' ')[1]

    // ~10% attendance-risk, ~8% falling grades — enough for the engine to have something to say
    const riskAttendance = rand() < 0.1
    const falling = rand() < 0.08
    let p = riskAttendance ? between(0.6, 0.77) : between(0.88, 0.995)
    let decline = !riskAttendance && rand() < 0.05 ? between(0.25, 0.4) : 0
    let ability = clamp(normal(70, 11), 38, 95)
    let behaviour = rand() < 0.06 ? int(2, 5) : rand() < 0.2 ? 1 : 0

    let parentId: string
    let gender2 = gender
    if (id === DEMO.studentId) {
      name = 'Ananya Kulkarni'; gender2 = 'F'; p = 1; decline = 0; ability = 86; behaviour = 0
      parentId = DEMO.parentId
    } else if (id === DEMO.siblingId) {
      name = 'Vihaan Kulkarni'; gender2 = 'M'; p = 0.86; decline = 0.12; ability = 64; behaviour = 1
      parentId = DEMO.parentId
    } else {
      parentId = `par-${String(++parentSeq).padStart(4, '0')}`
      const mother = rand() < 0.6
      parents.push({
        id: parentId,
        name: `${pick(mother ? PARENT_F : PARENT_M)} ${lastName}`,
        phone: phone(),
        email: `${lastName.toLowerCase()}${int(10, 99)}@gmail.com`,
        childIds: [id],
        relation: mother ? 'Mother' : 'Father',
      })
    }

    const attendance = id === DEMO.studentId
      ? schoolDays.map((_, i) => (i === 13 ? 'A' : 'P') as AttendanceMark) // 46-day streak
      : makeAttendance(p, decline)
    const isFalling = id === DEMO.siblingId ? true : falling
    const total = annualFee(c.grade)
    const scholarshipPct = rand() < 0.06 ? pick([10, 25, 50]) : 0
    const net = Math.round(total * (1 - scholarshipPct / 100))
    // instalments: Apr (1/3) + Sep (1/3) due so far
    const payState = rand()
    let feePaid = payState < 0.8 ? Math.round((net * 2) / 3) : payState < 0.955 ? Math.round((net * 2) / 3) - int(1, 8) * 1000 : payState < 0.985 ? Math.round(net / 3) : int(0, 3) * 5000
    if (id === DEMO.studentId) feePaid = Math.round((net * 2) / 3)
    if (id === DEMO.siblingId) feePaid = Math.round(net / 3)

    students.push({
      id,
      name,
      classId: c.id,
      rollNo: r,
      gender: gender2,
      house: id === DEMO.studentId ? 'Willow' : pick(HOUSES),
      parentId,
      busId: id === DEMO.studentId || id === DEMO.siblingId ? '17' : rand() < 0.62 ? pick(BUS_IDS) : null,
      dob: `20${String(26 - c.grade - 6).padStart(2, '0')}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      admissionNo: `GF${2026 - (c.grade - 1)}${String(int(100, 999))}`,
      attendance,
      marks: makeMarks(ability, isFalling),
      behaviourIncidents: behaviour,
      housePoints: id === DEMO.studentId ? 312 : int(40, 300),
      feeTotal: net,
      feePaid,
      feeDueDate: '2026-09-15',
      scholarshipPct,
    })
    c.studentIds.push(id)
  }
}
parents.unshift({ id: DEMO.parentId, name: 'Sunita Kulkarni', phone: '+91 98220 41736', email: 'sunita.kulkarni@gmail.com', childIds: [DEMO.studentId, DEMO.siblingId], relation: 'Mother' })

/* ───────────────────────── exams (Unit Test 2 marks submission) ───────────────────────── */

const LATE_MARKS: Record<string, string[]> = {
  // teacher → classes still pending past the 3 Oct deadline
  'st-sci-b': ['9A', '10B'],
  'st-hin-b': ['8B', '9B', '10A'],
  'st-cs-b': ['10B'],
}
export const exams: Exam[] = []
for (const c of classes) {
  for (const subj of SUBJECTS) {
    const teacherId = teacherFor(c.id, subj)
    const pending = LATE_MARKS[teacherId]?.includes(c.id) ?? false
    exams.push({
      id: `ex-${c.id}-${subj.replace(/\s+/g, '').toLowerCase()}`,
      name: 'Unit Test 2',
      classId: c.id,
      subject: subj,
      teacherId,
      deadline: '2026-10-03',
      status: pending ? 'pending' : rand() < 0.7 ? 'published' : 'submitted',
      submittedAt: pending ? null : dt(addDays('2026-10-03', -int(0, 4)), '16:30'),
    })
    if (pending) for (const sid of c.studentIds) students.find(s => s.id === sid)!.marks[subj].unitTest2 = null
  }
}
// Ms. Rao's own 9B maths UT2 is submitted but not yet published — something she can act on
exams.find(e => e.id === 'ex-9B-mathematics')!.status = 'submitted'

/* ───────────────────────── timetable ───────────────────────── */

const PERIODS: [string, string][] = [['08:00', '08:45'], ['08:45', '09:30'], ['09:30', '10:15'], ['10:15', '10:30'], ['10:30', '11:15'], ['11:15', '12:00'], ['12:00', '12:40'], ['12:40', '13:25'], ['13:25', '14:10']]
export const timetable: Timetable = {}
for (const c of classes) {
  // Seven teaching slots a day: six subjects + one Games/Library period, rotated per class so that
  // no teacher is ever in two rooms at once and some class is always out on the field.
  const ci = CLASS_IDS.indexOf(c.id)
  timetable[c.id] = [0, 1, 2, 3, 4].map(day => {
    const extra: TimetableSlot['subject'] = day % 2 === 0 ? 'Games' : 'Library'
    const items: TimetableSlot['subject'][] = [...SUBJECTS, extra]
    const teaching = [0, 1, 2, 3, 4, 5, 6].map(t => items[(t + ci + day) % 7])
    const seq: TimetableSlot['subject'][] = [teaching[0], teaching[1], teaching[2], 'Break', teaching[3], teaching[4], 'Lunch', teaching[5], teaching[6]]
    return seq.map((subject, i): TimetableSlot => ({
      period: i + 1,
      start: PERIODS[i][0],
      end: PERIODS[i][1],
      subject,
      teacherId: SUBJECTS.includes(subject as Subject) ? teacherFor(c.id, subject as Subject) : subject === 'Games' ? 'st-pe' : subject === 'Library' ? 'st-lib' : null,
      room: subject === 'Games' ? 'Field' : subject === 'Library' ? 'Library' : subject === 'Computer Science' ? 'Computer Lab' : c.room,
    }))
  })
}

/* ───────────────────────── substitutions (today) ───────────────────────── */

/**
 * key "9B:3" (class:period) → covering teacher.
 * Mr. Malhotra's leave was approved at 07:05, so his periods were covered this morning.
 * Mr. Bhat simply didn't turn up — his periods are deliberately left uncovered for the principal.
 */
export const substitutions: Record<string, string> = {}
{
  const WED = 2
  const unavailable = new Set(['st-sst-b', 'st-cs-b'])
  const teachingIds = TEACHERS.map(t => t.id)
  for (const c of classes) {
    for (const slot of timetable[c.id][WED]) {
      if (slot.teacherId !== 'st-sst-b') continue
      const busy = new Set(Object.values(timetable).map(days => days[WED][slot.period - 1]?.teacherId))
      for (const [k, v] of Object.entries(substitutions)) if (k.endsWith(`:${slot.period}`)) busy.add(v)
      const sameSubject = TEACHERS.find(t => t.subject === 'Social Studies' && !busy.has(t.id) && !unavailable.has(t.id))
      const anyone = teachingIds.find(id => !busy.has(id) && !unavailable.has(id))
      const cover = sameSubject?.id ?? anyone
      if (cover) substitutions[`${c.id}:${slot.period}`] = cover
    }
  }
}

/* ───────────────────────── homework ───────────────────────── */

const HW_TITLES: Record<Subject, string[]> = {
  Mathematics: ['Quadratic equations — Exercise 4.3', 'Linear equations word problems', 'Mensuration worksheet'],
  Science: ['Chemical reactions — balance 10 equations', 'Draw and label the human heart', 'Lab record: acids & bases'],
  English: ['Essay: A morning I remember', 'Comprehension — The Snake and the Mirror', 'Grammar: reported speech'],
  Hindi: ['निबंध: मेरा विद्यालय', 'पाठ 4 — प्रश्न उत्तर'],
  'Social Studies': ['Map work: rivers of India', 'French Revolution timeline', 'Notes: democratic rights'],
  'Computer Science': ['Python: loops practice set', 'Spreadsheet formulas exercise'],
}
export const homework: Homework[] = []
let hwSeq = 0
for (const c of classes) {
  for (const subj of SUBJECTS.slice(0, 5)) {
    if (rand() < 0.35 && !(c.id === '9B' && (subj === 'Mathematics' || subj === 'Social Studies'))) continue
    const teacherId = teacherFor(c.id, subj)
    const assignedDaysAgo = int(1, 6)
    const assignedAt = addDays(TODAY, -assignedDaysAgo)
    const dueDate = addDays(assignedAt, int(2, 6))
    const past = dueDate < TODAY
    // Mr. Deshpande and Mr. Thakur sit on reviews — the scorecard should notice
    const slowReviewer = teacherId === 'st-sci-b' || teacherId === 'st-hin-b'
    const submissions: Homework['submissions'] = {}
    for (const sid of c.studentIds) {
      const r = rand()
      if (!past) submissions[sid] = r < 0.45 ? 'submitted' : 'pending'
      else if (r < 0.86) submissions[sid] = slowReviewer || rand() < 0.3 ? 'submitted' : 'reviewed'
      else submissions[sid] = r < 0.93 ? 'late' : 'pending'
    }
    homework.push({
      id: `hw-${++hwSeq}`,
      classId: c.id,
      subject: subj,
      teacherId,
      title: c.id === '9B' && subj === 'Mathematics' ? 'Quadratic equations — Exercise 4.3' : pick(HW_TITLES[subj]),
      description: 'Complete in your notebook and upload a clear photo of each page. Show all working.',
      assignedAt,
      dueDate: c.id === '9B' && subj === 'Mathematics' ? '2026-10-09' : dueDate,
      submissions,
    })
  }
}
// Ananya: maths due Friday (pending), social studies due next Tuesday
for (const h of homework) if (h.classId === '9B') {
  if (h.subject === 'Mathematics') { h.submissions[DEMO.studentId] = 'pending'; h.dueDate = '2026-10-09' }
  if (h.subject === 'Social Studies') { h.submissions[DEMO.studentId] = 'pending'; h.dueDate = '2026-10-13'; h.title = 'French Revolution timeline' }
}

/* ───────────────────────── messages ───────────────────────── */

const PARENT_ASKS = [
  'Could you share how she is doing in class lately? Her marks seem to have dropped.',
  'He was unwell yesterday — what did he miss in class?',
  'Is there a revised date for the unit test? We will be travelling.',
  'The homework portal is not opening the worksheet. Could you resend it?',
  'She says she was marked absent on Monday but she was present. Please check.',
  'Can we meet this week to discuss his progress?',
  'He finds the new chapter difficult. Any practice material you can suggest?',
  'Could you let us know when the remedial classes start?',
]
export const threads: Thread[] = []
let msgSeq = 0
const mid = () => `m-${++msgSeq}`
{
  // Kulkarni ↔ Ms. Rao — a healthy, answered thread
  threads.push({
    id: 'th-kulkarni-rao', kind: 'parent-class-teacher', parentId: DEMO.parentId, studentId: DEMO.studentId, staffId: 'st-math-b',
    messages: [
      { id: mid(), from: DEMO.parentId, text: 'Good evening Ms. Rao. Ananya mentioned a maths olympiad — is registration open?', at: dt('2026-10-05', '19:12') },
      { id: mid(), from: 'st-math-b', text: 'Yes! Registration closes on 15 October. I have shared the form in Study Material. She should definitely try.', at: dt('2026-10-05', '20:03') },
      { id: mid(), from: DEMO.parentId, text: 'Wonderful, thank you. We will submit it this week.', at: dt('2026-10-05', '20:10') },
      { id: mid(), from: 'st-math-b', text: 'Lovely work in the science practical today, by the way — Ms. Iqbal was very impressed.', at: dt('2026-10-06', '14:05') },
    ],
  })
  threads.push({
    id: 'th-kulkarni-patil', kind: 'parent-subject-teacher', parentId: DEMO.parentId, studentId: DEMO.siblingId, staffId: 'st-math-a', subject: 'Mathematics',
    messages: [
      { id: mid(), from: DEMO.parentId, text: 'Vihaan scored lower in the maths unit test. Is there anything we can do at home?', at: dt('2026-10-06', '09:40') },
    ],
  })
  // Unanswered parent messages (>24h) spread across slower responders
  const slow = ['st-sci-b', 'st-hin-b', 'st-cs-b', 'st-sst-b', 'st-eng-b', 'st-math-a']
  let n = 0
  for (const s of students) {
    if (n >= 15) break
    if (s.parentId === DEMO.parentId || rand() > 0.07) continue
    const staffId = slow[n % slow.length]
    const hoursAgo = int(26, 80)
    const at = new Date(new Date(dt(TODAY, '08:24')).getTime() - hoursAgo * 3600e3).toISOString().slice(0, 19)
    threads.push({
      id: `th-${s.id}`, kind: 'parent-subject-teacher', parentId: s.parentId, studentId: s.id, staffId,
      subject: staff.find(x => x.id === staffId)!.subjects[0],
      messages: [{ id: mid(), from: s.parentId, text: pick(PARENT_ASKS), at }],
    })
    n++
  }
  // one parent has been waiting on Ms. Rao since yesterday morning
  {
    const s = students.find(x => x.classId === '9B' && x.rollNo === 12)!
    threads.push({
      id: `th-${s.id}-wait`, kind: 'parent-class-teacher', parentId: s.parentId, studentId: s.id, staffId: 'st-math-b',
      messages: [{ id: mid(), from: s.parentId, text: `${s.name.split(' ')[0]} was unwell on Monday — could you tell us what was covered in maths so we can catch up at home?`, at: dt('2026-10-06', '07:20') }],
    })
  }
  // a few answered threads for volume
  for (const s of students.filter(s => s.classId === '9B').slice(3, 8)) {
    threads.push({
      id: `th-${s.id}`, kind: 'parent-class-teacher', parentId: s.parentId, studentId: s.id, staffId: 'st-math-b',
      messages: [
        { id: mid(), from: s.parentId, text: pick(PARENT_ASKS), at: dt('2026-10-06', `1${int(0, 7)}:${int(10, 59)}`) },
        { id: mid(), from: 'st-math-b', text: 'Thank you for reaching out — I will check and update you after class tomorrow.', at: dt('2026-10-06', `19:${int(10, 59)}`) },
      ],
    })
  }
}

/* ───────────────────────── announcements ───────────────────────── */

export const announcements: Announcement[] = [
  {
    id: 'an-1', title: 'Unit Test 2 marks — final reminder', fromId: 'st-principal', audience: ['staff'], at: dt('2026-10-04', '08:05'), pinned: true,
    body: 'Marks for Unit Test 2 were due on 3 October. Please submit any pending marks by end of day Wednesday so report cards can be generated before the PTM.',
    acknowledgedBy: ['st-math-a', 'st-math-b', 'st-sci-a', 'st-eng-a', 'st-eng-b', 'st-hin-a', 'st-sst-a', 'st-cs-a'],
    responses: [
      { id: 'r1', staffId: 'st-math-b', text: '9B and 10A are done. 9B is ready to publish once reviewed.', at: dt('2026-10-04', '08:40') },
      { id: 'r2', staffId: 'st-hin-b', text: 'Will finish 8B and 9B tonight. 10A answer sheets are still with the moderator.', at: dt('2026-10-05', '17:22') },
    ],
  },
  {
    id: 'an-2', title: 'Parent–Teacher Meeting · Saturday 17 October', fromId: 'st-principal', audience: ['staff', 'parents'], at: dt('2026-10-06', '11:30'), pinned: false,
    body: 'PTM for Grades 6–10 will run from 9:00 to 13:00. Slots can be booked from the parent app. Class teachers, please keep progress notes ready.',
    acknowledgedBy: ['st-math-b', 'st-sci-a', 'st-eng-a'],
    responses: [{ id: 'r3', staffId: 'st-sci-a', text: 'Could the science lab be open for parents to see the project display?', at: dt('2026-10-06', '13:02') }],
  },
  {
    id: 'an-4', title: 'Fire drill on Thursday at 11:20', fromId: 'st-principal', audience: ['staff'], at: dt(TODAY, '07:30'), pinned: true,
    body: 'The alarm will sound at 11:20 during Period 5. Class teachers, please walk your class to Assembly Point B and take a head count on the app.',
    acknowledgedBy: ['st-sci-a', 'st-eng-a', 'st-pe'], responses: [],
  },
  {
    id: 'an-3', title: 'Inter-house football finals on Friday', fromId: 'st-principal', audience: ['staff', 'parents', 'students'], at: dt('2026-10-03', '15:10'), pinned: false,
    body: 'Willow vs Cedar, 2:15 pm on the main field. Students may wear house colours. Parents are welcome.',
    acknowledgedBy: ['st-pe', 'st-math-b'], responses: [],
  },
]

/* ───────────────────────── approvals ───────────────────────── */

export const approvals: Approval[] = [
  { id: 'ap-1', kind: 'leave', requestedBy: 'st-sci-a', subjectId: 'st-sci-a', title: 'Casual leave · 2 days', detail: 'Family function in Nashik. Lesson plans shared with Mr. Deshpande.', from: '2026-10-12', to: '2026-10-13', at: dt('2026-10-05', '18:20'), status: 'pending' },
  { id: 'ap-2', kind: 'leave', requestedBy: 'st-eng-b', subjectId: 'st-eng-b', title: 'Medical leave · 1 day', detail: 'Dental procedure scheduled.', from: '2026-10-09', to: '2026-10-09', at: dt('2026-10-06', '20:45'), status: 'pending' },
  { id: 'ap-3', kind: 'leave', requestedBy: 'st-drv-21', subjectId: 'st-drv-21', title: 'Half day leave', detail: 'Vehicle fitness certificate at RTO.', from: '2026-10-08', to: '2026-10-08', at: dt('2026-10-07', '07:10'), status: 'pending' },
  { id: 'ap-4', kind: 'marks-correction', requestedBy: 'st-math-a', subjectId: 'stu-8A-07', title: 'Marks correction · Term 1 Maths', detail: 'Totalling error on page 3: 58 → 66. Re-checked answer sheet attached.', at: dt('2026-10-06', '12:15'), status: 'pending' },
  { id: 'ap-5', kind: 'refund', requestedBy: 'st-acct', subjectId: 'stu-10A-12', title: 'Refund · Transport fee', detail: 'Student moved closer to school and stopped using Bus 12 from September.', amount: 4500, at: dt('2026-10-04', '10:30'), status: 'pending' },
  { id: 'ap-6', kind: 'attendance-correction', requestedBy: 'st-eng-a', subjectId: 'stu-6A-14', title: 'Attendance correction · 5 Oct', detail: 'Student was at the inter-school quiz, marked absent by mistake.', at: dt('2026-10-06', '09:05'), status: 'pending' },
  { id: 'ap-7', kind: 'expense', requestedBy: 'st-admin', subjectId: null, title: 'Lab consumables purchase', detail: 'Chemicals and glassware for Grade 9–10 practicals. Three quotes attached.', amount: 38600, at: dt('2026-10-06', '16:40'), status: 'pending' },
  { id: 'ap-8', kind: 'admission', requestedBy: 'st-admin', subjectId: null, title: 'Mid-year admission · Grade 7', detail: 'Transfer from Kendriya Vidyalaya, Nagpur. Assessment score 78%.', at: dt('2026-10-05', '11:00'), status: 'pending' },
  { id: 'ap-9', kind: 'leave', requestedBy: 'st-sst-b', subjectId: 'st-sst-b', title: 'Casual leave · today', detail: 'Unwell since last night.', from: TODAY, to: TODAY, at: dt(TODAY, '06:40'), status: 'approved', decidedBy: 'st-principal', decidedAt: dt(TODAY, '07:05') },
]

/* ───────────────────────── transport ───────────────────────── */

const route = (pts: [string, string, number, number][]) => pts.map(([name, at, x, y]) => ({ name, at, x, y }))
const busStudents = (id: string) => students.filter(s => s.busId === id).map(s => s.id)
export const buses: Bus[] = [
  { id: '17', route: 'Kothrud – Karve Nagar', driverId: 'st-drv-17', driverName: 'Ramesh Pawar', driverPhone: '+91 98500 11717', vehicleNo: 'MH 12 QT 1717', stops: route([['Kothrud Depot', '07:05', 8, 78], ['Mayur Colony', '07:14', 22, 64], ['Karve Nagar', '07:22', 36, 70], ['Warje Bridge', '07:30', 52, 52], ['Erandwane', '07:36', 68, 40], ['Greenfield School', '07:42', 88, 22]]), progress: 1, delayMin: 0, status: 'arrived', studentIds: busStudents('17'), capacity: 40 },
  { id: '21', route: 'Baner – Aundh', driverId: 'st-drv-21', driverName: 'Sunil Kamble', driverPhone: '+91 98500 22121', vehicleNo: 'MH 12 RT 2121', stops: route([['Baner Gaon', '07:10', 6, 20], ['Balewadi Phata', '07:18', 20, 30], ['Aundh ITI Rd', '07:27', 38, 26], ['University Circle', '07:36', 58, 38], ['Model Colony', '07:44', 74, 30], ['Greenfield School', '07:52', 88, 22]]), progress: 0.72, delayMin: 34, status: 'delayed', studentIds: busStudents('21'), capacity: 40 },
  { id: '08', route: 'Hadapsar – Camp', driverId: 'st-drv-08', driverName: 'Mahadev Jadhav', driverPhone: '+91 98500 30808', vehicleNo: 'MH 12 PQ 0808', stops: route([['Hadapsar', '07:00', 90, 90], ['Fatima Nagar', '07:12', 76, 76], ['Camp', '07:24', 66, 58], ['Shivajinagar', '07:36', 74, 38], ['Greenfield School', '07:46', 88, 22]]), progress: 1, delayMin: 0, status: 'arrived', studentIds: busStudents('08'), capacity: 36 },
  { id: '12', route: 'Sinhagad Rd – Parvati', driverId: 'st-drv-08', driverName: 'Dattatray More', driverPhone: '+91 98500 41212', vehicleNo: 'MH 12 SU 1212', stops: route([['Vadgaon', '07:02', 30, 94], ['Anand Nagar', '07:12', 40, 82], ['Parvati', '07:24', 56, 70], ['Swargate', '07:34', 70, 56], ['Greenfield School', '07:44', 88, 22]]), progress: 1, delayMin: 0, status: 'arrived', studentIds: busStudents('12'), capacity: 40 },
  { id: '33', route: 'Pashan – Sus Rd', driverId: 'st-drv-17', driverName: 'Ganesh Lokhande', driverPhone: '+91 98500 53333', vehicleNo: 'MH 12 VK 3333', stops: route([['Sus Gaon', '07:08', 4, 44], ['Pashan Lake', '07:18', 18, 46], ['NCL Colony', '07:28', 36, 40], ['Ganeshkhind', '07:38', 60, 30], ['Greenfield School', '07:48', 88, 22]]), progress: 1, delayMin: 6, status: 'arrived', studentIds: busStudents('33'), capacity: 40 },
]

/* ───────────────────────── fees ───────────────────────── */

export const feePayments: FeePayment[] = []
let rcpt = 24000
for (const s of students) {
  let remaining = s.feePaid
  const inst = Math.round(s.feeTotal / 3)
  const dates = ['2026-04-' + String(int(1, 28)).padStart(2, '0'), addDays('2026-09-01', int(0, 35))].filter(d => d <= addDays(TODAY, -1))
  for (const d of dates) {
    if (remaining <= 0) break
    const amt = Math.min(inst, remaining)
    remaining -= amt
    feePayments.push({ id: `pay-${rcpt}`, studentId: s.id, amount: amt, at: dt(d, `${int(9, 16)}:${int(10, 59)}`), mode: pick(['UPI', 'UPI', 'UPI', 'Card', 'Bank transfer', 'Cash', 'Cheque'] as const), receiptNo: `GF/26/${++rcpt}`, collectedBy: 'st-acct' })
  }
  if (remaining > 0) feePayments.push({ id: `pay-${rcpt}`, studentId: s.id, amount: remaining, at: dt('2026-09-20', '11:00'), mode: 'UPI', receiptNo: `GF/26/${++rcpt}`, collectedBy: 'st-acct' })
}
// a few families paid at the counter before assembly this morning
for (const [i, t] of (['08:02', '08:09', '08:17'] as const).entries()) {
  const st = students.find(x => x.feePaid < Math.round((x.feeTotal * 2) / 3) && x.feePaid > x.feeTotal / 3 && x.id !== DEMO.siblingId && !feePayments.some(p => p.studentId === x.id && p.at.startsWith(TODAY)) && x.rollNo > 5 + i)!
  const amt = Math.round((st.feeTotal * 2) / 3) - st.feePaid
  st.feePaid += amt
  feePayments.push({ id: `pay-today-${i}`, studentId: st.id, amount: amt, at: dt(TODAY, t), mode: i === 1 ? 'Cash' : 'UPI', receiptNo: `GF/26/${++rcpt}`, collectedBy: 'st-acct' })
}
feePayments.sort((a, b) => a.at.localeCompare(b.at))

/* ───────────────────────── admissions ───────────────────────── */

const ADM_STAGES: Admission['stage'][] = ['enquiry', 'enquiry', 'enquiry', 'enquiry', 'enquiry', 'visit', 'visit', 'visit', 'visit', 'assessment', 'assessment', 'assessment', 'offer', 'offer', 'offer', 'enrolled', 'enrolled', 'enrolled', 'enrolled', 'enrolled', 'dropped', 'dropped', 'enquiry', 'visit', 'assessment', 'offer']
export const admissions: Admission[] = ADM_STAGES.map((stage, i) => {
  const gender = rand() < 0.5
  const last = pick(LAST)
  const grade = pick([1, 1, 1, 2, 3, 5, 6, 6, 7, 8, 9, 11])
  const created = addDays(TODAY, -int(1, 40))
  return {
    id: `adm-${i + 1}`,
    childName: `${pick(gender ? FIRST_F : FIRST_M)} ${last}`,
    grade,
    parentName: `${pick(rand() < 0.5 ? PARENT_F : PARENT_M)} ${last}`,
    phone: phone(),
    source: pick(['Website', 'Walk-in', 'Referral', 'Referral', 'Social', 'Newspaper'] as const),
    stage,
    createdAt: created,
    updatedAt: addDays(created, int(0, 6)) > TODAY ? TODAY : addDays(created, int(0, 6)),
    notes: stage === 'dropped' ? 'Chose a school closer to home.' : stage === 'offer' ? 'Offer letter sent; awaiting fee payment.' : 'Interested in the science stream & sports programme.',
    feeQuoted: annualFee(Math.min(grade, 10)) + (grade > 10 ? 12000 : 0),
  }
})

/* ───────────────────────── payroll ───────────────────────── */

const payrollTotal = () => staff.reduce((a, s) => a + s.salary.basic + s.salary.hra + s.salary.allowances - s.salary.pf - s.salary.esi - s.salary.tds, 0)
export const payrollRuns: PayrollRun[] = [
  { id: 'pr-2026-07', month: '2026-07', status: 'paid', processedAt: dt('2026-07-30', '17:00'), total: payrollTotal(), staffCount: staff.length },
  { id: 'pr-2026-08', month: '2026-08', status: 'paid', processedAt: dt('2026-08-29', '16:40'), total: payrollTotal(), staffCount: staff.length },
  { id: 'pr-2026-09', month: '2026-09', status: 'paid', processedAt: dt('2026-09-30', '17:20'), total: payrollTotal(), staffCount: staff.length },
  { id: 'pr-2026-10', month: '2026-10', status: 'draft', processedAt: null, total: payrollTotal(), staffCount: staff.length },
]

/* ───────────────────────── remarks ───────────────────────── */

const PRAISE = ['Lovely work in the science practical today.', 'Asked excellent questions during the discussion.', 'Very neat and complete notebook this week.', 'Helped a classmate understand fractions — kind and clear.', 'Great improvement in reading fluency.']
const CONCERN = ['Has missed three homework submissions this month.', 'Seems distracted in class; could we check in at home?', 'Needs more practice with algebraic expressions.', 'Arrived late twice this week.']
export const remarks: Remark[] = [
  { id: 'rm-1', studentId: DEMO.studentId, staffId: 'st-sci-a', subject: 'Science', text: 'Lovely work in the science practical today. Careful observation and a very clear lab record.', tone: 'praise', at: dt('2026-10-06', '14:05'), visibleToParent: true },
  { id: 'rm-2', studentId: DEMO.studentId, staffId: 'st-math-b', subject: 'Mathematics', text: 'Solved the challenge problem on quadratic roots before anyone else. Encourage the olympiad!', tone: 'praise', at: dt('2026-10-01', '12:20'), visibleToParent: true },
  { id: 'rm-3', studentId: DEMO.studentId, staffId: 'st-eng-b', subject: 'English', text: 'Essay structure is strong; work on varying sentence length.', tone: 'note', at: dt('2026-09-25', '10:00'), visibleToParent: true },
  { id: 'rm-4', studentId: DEMO.siblingId, staffId: 'st-math-a', subject: 'Mathematics', text: 'Needs more practice with fractions and decimals — scored lower in Unit Test 2.', tone: 'concern', at: dt('2026-10-05', '13:10'), visibleToParent: true },
  { id: 'rm-5', studentId: DEMO.siblingId, staffId: 'st-eng-a', subject: 'General', text: 'Wonderful enthusiasm during the class play rehearsal.', tone: 'praise', at: dt('2026-10-02', '11:40'), visibleToParent: true },
]
for (const s of students) {
  if (s.parentId === DEMO.parentId || rand() > 0.25) continue
  const concern = s.behaviourIncidents > 1 || rand() < 0.3
  remarks.push({ id: `rm-${remarks.length + 1}`, studentId: s.id, staffId: CLASS_TEACHER[s.classId], subject: 'General', text: pick(concern ? CONCERN : PRAISE), tone: concern ? 'concern' : 'praise', at: dt(addDays(TODAY, -int(1, 20)), '13:00'), visibleToParent: true })
}

/* ───────────────────────── LMS: lessons & quizzes ───────────────────────── */

export const quizzes: Quiz[] = [
  {
    id: 'qz-9b-math', title: 'Quadratic equations — quick check', subject: 'Mathematics', classId: '9B', attempts: {},
    questions: [
      { q: 'What are the roots of x² − 5x + 6 = 0?', options: ['2 and 3', '−2 and −3', '1 and 6', '−1 and 6'], answer: 0, explain: '(x − 2)(x − 3) = 0, so x = 2 or x = 3.' },
      { q: 'The discriminant of ax² + bx + c is…', options: ['b² + 4ac', 'b² − 4ac', '4ac − b²', '2a'], answer: 1, explain: 'D = b² − 4ac decides the nature of the roots.' },
      { q: 'If D < 0, the equation has…', options: ['Two equal real roots', 'Two distinct real roots', 'No real roots', 'Exactly one root'], answer: 2, explain: 'A negative discriminant means the roots are not real.' },
      { q: 'Sum of roots of 2x² − 8x + 3 = 0 is…', options: ['8', '4', '−4', '3/2'], answer: 1, explain: 'Sum = −b/a = 8/2 = 4.' },
      { q: 'Which is a quadratic equation?', options: ['x + 1/x = 3 (x ≠ 0) after clearing', '2x + 3 = 0', 'x³ − x = 0', '√x = 4'], answer: 0, explain: 'Multiplying by x gives x² − 3x + 1 = 0.' },
    ],
  },
  {
    id: 'qz-9b-sci', title: 'Chemical reactions — warm-up', subject: 'Science', classId: '9B', attempts: {},
    questions: [
      { q: 'Rusting of iron is an example of…', options: ['Reduction', 'Oxidation', 'Neutralisation', 'Decomposition'], answer: 1, explain: 'Iron combines with oxygen in the presence of moisture.' },
      { q: 'A balanced equation follows the law of…', options: ['Conservation of mass', 'Gravitation', 'Constant speed', 'Inertia'], answer: 0, explain: 'Atoms are neither created nor destroyed.' },
      { q: 'CaCO₃ → CaO + CO₂ is a … reaction', options: ['Combination', 'Displacement', 'Decomposition', 'Double displacement'], answer: 2, explain: 'One reactant breaks into two products.' },
    ],
  },
]
for (const s of students.filter(s => s.classId === '9B' && s.id !== DEMO.studentId)) {
  if (rand() < 0.7) quizzes[0].attempts[s.id] = int(2, 5)
  if (rand() < 0.5) quizzes[1].attempts[s.id] = int(1, 3)
}

const LESSONS: [Subject, string, string, Lesson['kind'], number][] = [
  ['Mathematics', 'Ch 4 · Quadratic Equations', 'Factorisation method, explained with tiles', 'video', 14],
  ['Mathematics', 'Ch 4 · Quadratic Equations', 'Completing the square — notes', 'notes', 8],
  ['Mathematics', 'Ch 4 · Quadratic Equations', 'Quick check: quadratic equations', 'quiz', 6],
  ['Science', 'Ch 1 · Chemical Reactions', 'Types of chemical reactions (lab recording)', 'video', 18],
  ['Science', 'Ch 1 · Chemical Reactions', 'Warm-up: chemical reactions', 'quiz', 5],
  ['English', 'Beehive · The Snake and the Mirror', 'Reading with the author — audio & notes', 'notes', 10],
  ['Social Studies', 'History · French Revolution', 'Timeline of 1789 in 12 minutes', 'video', 12],
  ['Computer Science', 'Python · Loops', 'for and while — live coded', 'video', 16],
  ['Hindi', 'क्षितिज · पाठ 4', 'पाठ का सार', 'notes', 7],
]
export const lessons: Lesson[] = LESSONS.map(([subject, chapter, title, kind, minutes], i) => {
  const progress: Record<string, number> = {}
  for (const sid of classes.find(c => c.id === '9B')!.studentIds) progress[sid] = rand() < 0.65 ? (rand() < 0.6 ? 100 : int(10, 90)) : 0
  progress[DEMO.studentId] = i === 0 ? 100 : i === 1 ? 60 : i === 3 ? 100 : 0
  return {
    id: `ls-${i + 1}`, classId: '9B', subject, teacherId: teacherFor('9B', subject), title, kind, minutes, chapter,
    publishedAt: dt(addDays(TODAY, -int(1, 12)), '15:00'), progress,
    quizId: kind === 'quiz' ? (subject === 'Mathematics' ? 'qz-9b-math' : 'qz-9b-sci') : undefined,
  }
})

/* ───────────────────────── complaints / parent sentiment ───────────────────────── */

const COMPLAINTS: [Complaint['category'], string, Complaint['sentiment']][] = [
  ['Transport', 'Bus 21 has been late three days this week. Children miss assembly.', 'negative'],
  ['Transport', 'Bus 21 driver was speeding near University Circle.', 'negative'],
  ['Academics', 'Hindi unit test marks are still not shared even though other subjects are out.', 'negative'],
  ['Fees', 'Can the second instalment be split into two parts?', 'neutral'],
  ['Facilities', 'Drinking water cooler on the 2nd floor is not working.', 'negative'],
  ['Food', 'The new lunch menu is lovely — thank you!', 'positive'],
  ['Staff', 'Ms. Rao responds so quickly. Really appreciate it.', 'positive'],
  ['Academics', 'Science homework is not being checked — no feedback for 2 weeks.', 'negative'],
  ['Transport', 'Please add a stop near Pashan Lake second gate.', 'neutral'],
  ['Facilities', 'Washrooms near the playground need more frequent cleaning.', 'negative'],
  ['Academics', 'The olympiad coaching sessions are excellent.', 'positive'],
  ['Fees', 'Receipt for September payment not received on email.', 'neutral'],
]
export const complaints: Complaint[] = COMPLAINTS.map(([category, text, sentiment], i) => {
  const s = students[int(0, students.length - 1)]
  return { id: `cp-${i + 1}`, parentId: s.parentId, studentId: s.id, category, text, sentiment, at: dt(addDays(TODAY, -int(0, 9)), `${int(8, 20)}:${int(10, 59)}`), status: i < 6 ? 'open' : i < 9 ? 'in-progress' : 'resolved' }
})

/* ───────────────────────── today's registers (08:24) ───────────────────────── */

const MARKED_AT: Record<string, string> = { '6A': '08:06', '6B': '08:09', '7B': '08:11', '8A': '08:07', '8B': '08:14', '9A': '08:10', '10A': '08:12' }
export const registers: RegisterToday[] = classes.map(c => {
  const markedAt = MARKED_AT[c.id] ?? null
  const marks: Record<string, AttendanceMark> = {}
  if (markedAt) for (const sid of c.studentIds) {
    const s = students.find(x => x.id === sid)!
    const recent = s.attendance.slice(-20).filter(m => m !== 'A').length / 20
    marks[sid] = sid === DEMO.siblingId ? 'L' : rand() < recent ? (rand() < 0.05 ? 'L' : 'P') : 'A'
  }
  return { classId: c.id, markedAt: markedAt ? dt(TODAY, markedAt) : null, markedBy: markedAt ? c.classTeacherId : null, marks }
})
// 8B is covered by a substitute because Mr. Bhat is absent
registers.find(r => r.classId === '8B')!.markedBy = 'st-cs-a'

/* ───────────────────────── notifications & audit ───────────────────────── */

export const notifications: Notification[] = [
  { id: 'n-1', at: dt(TODAY, '07:42'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.studentId, kind: 'bus', title: 'Bus 17 has reached school', body: 'Ananya and Vihaan are on campus.', read: false },
  { id: 'n-2', at: dt(TODAY, '08:06'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.siblingId, kind: 'attendance', title: 'Vihaan marked late · 6A', body: 'Arrived at 08:04 after assembly. Marked by Ms. Fernandes.', read: false },
  { id: 'n-3', at: dt('2026-10-06', '14:05'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.studentId, kind: 'remark', title: 'A note from Ms. Iqbal', body: 'Lovely work in the science practical today.', read: true },
  { id: 'n-4', at: dt('2026-10-06', '09:20'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.studentId, kind: 'homework', title: 'Mathematics homework uploaded', body: 'Quadratic equations — Exercise 4.3 · due Friday', read: true },
  { id: 'n-5', at: dt('2026-10-06', '11:30'), audience: { role: 'parent', id: DEMO.parentId }, kind: 'announcement', title: 'PTM on Saturday 17 October', body: 'Book a slot with each class teacher from the app.', read: true },
  { id: 'n-6', at: dt('2026-10-05', '10:00'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.siblingId, kind: 'fees', title: 'Term 2 fee pending for Vihaan', body: '₹24,000 was due on 15 September.', read: true },
  { id: 'n-7', at: dt('2026-10-05', '13:10'), audience: { role: 'parent', id: DEMO.parentId }, studentId: DEMO.siblingId, kind: 'marks', title: 'Unit Test 2 results · Vihaan', body: 'Mathematics 49/100 — Mr. Patil has added a note.', read: true },
  { id: 'n-8', at: dt(TODAY, '07:58'), audience: { role: 'student', id: DEMO.studentId }, kind: 'homework', title: 'Maths homework due Friday', body: 'Quadratic equations — Exercise 4.3', read: false },
  { id: 'n-9', at: dt(TODAY, '07:05'), audience: { role: 'staff', id: 'st-math-b' }, kind: 'announcement', title: 'Mr. Malhotra is on leave today', body: 'You are on lunch duty for 10A at 12:00 in Room 303.', read: false },
]

export const audit: AuditEntry[] = [
  { id: 'au-1', at: dt(TODAY, '07:05'), actorId: 'st-principal', actorRole: 'principal', action: 'Approved leave', target: 'Mr. Vikram Malhotra · 7 Oct', sensitive: false },
  { id: 'au-2', at: dt('2026-10-06', '17:42'), actorId: 'st-acct', actorRole: 'admin', action: 'Recorded fee payment', target: 'Receipt GF/26/24611 · ₹30,667', sensitive: true },
  { id: 'au-3', at: dt('2026-10-06', '15:18'), actorId: 'st-math-a', actorRole: 'staff', action: 'Requested marks correction', target: '8A · Term 1 Mathematics', sensitive: true },
  { id: 'au-4', at: dt('2026-10-06', '12:02'), actorId: 'st-admin', actorRole: 'admin', action: 'Changed permission', target: 'Teacher → Fees → View (removed)', sensitive: true },
  { id: 'au-5', at: dt('2026-10-05', '16:30'), actorId: 'st-admin', actorRole: 'admin', action: 'Downloaded report', target: 'Fee defaulters · September', sensitive: true },
  { id: 'au-6', at: dt('2026-10-05', '09:12'), actorId: 'st-eng-a', actorRole: 'staff', action: 'Edited attendance', target: '6A · 2 Oct (within 48h window)', sensitive: true },
]

/* ───────────────────────── RBAC ───────────────────────── */

const ALL: ('view' | 'create' | 'edit' | 'approve' | 'export' | 'delete')[] = ['view', 'create', 'edit', 'approve', 'export', 'delete']
export const permissions: PermissionMatrix = {
  Principal: { students: ['view', 'edit', 'export'], attendance: ['view', 'approve', 'export'], exams: ['view', 'approve', 'export'], fees: ['view', 'export'], payroll: ['view'], admissions: ['view', 'approve'], staff: ['view', 'edit', 'approve'], transport: ['view'], communication: ['view', 'create'], reports: ['view', 'export'], approvals: ['view', 'approve'], lms: ['view'], settings: ['view'] },
  Admin: { students: ALL, attendance: ['view', 'edit', 'export'], exams: ['view'], fees: ALL, payroll: ['view', 'create', 'edit', 'approve', 'export'], admissions: ALL, staff: ALL, transport: ALL, communication: ['view', 'create'], reports: ['view', 'export'], approvals: ['view', 'approve'], lms: ['view'], settings: ALL },
  Teacher: { students: ['view'], attendance: ['view', 'create', 'edit'], exams: ['view', 'create', 'edit'], communication: ['view', 'create'], lms: ['view', 'create', 'edit'], reports: ['view'] },
  Accountant: { fees: ['view', 'create', 'edit', 'export'], payroll: ['view', 'export'], reports: ['view', 'export'], students: ['view'] },
  Parent: { students: ['view'], attendance: ['view'], exams: ['view'], fees: ['view', 'create'], transport: ['view'], communication: ['view', 'create'], lms: ['view'] },
  Student: { attendance: ['view'], exams: ['view'], lms: ['view', 'create'], communication: ['view', 'create'] },
}
