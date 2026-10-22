// EduFlow domain model. Every role reads the same school; scope is applied at the
// selector layer (see store/selectors.ts), mirroring Role → Module → Action → Data Scope.

export type RoleId = 'principal' | 'admin' | 'staff' | 'student' | 'parent'

export type AttendanceMark = 'P' | 'A' | 'L' // present · absent · late

export type Subject =
  | 'Mathematics'
  | 'Science'
  | 'English'
  | 'Hindi'
  | 'Social Studies'
  | 'Computer Science'

export type House = 'Willow' | 'Banyan' | 'Cedar' | 'Neem'

export interface SchoolClass {
  id: string // "9B"
  grade: number
  section: string
  room: string
  classTeacherId: string
  studentIds: string[]
}

export interface SubjectMarks {
  unitTest1: number // out of 100
  term1: number
  unitTest2: number | null // null → not yet entered
}

export interface Student {
  id: string
  name: string
  classId: string
  rollNo: number
  gender: 'F' | 'M'
  house: House
  parentId: string
  busId: string | null
  dob: string
  admissionNo: string
  /** last 60 school days, oldest first */
  attendance: AttendanceMark[]
  marks: Record<Subject, SubjectMarks>
  behaviourIncidents: number
  housePoints: number
  feeTotal: number
  feePaid: number
  feeDueDate: string // ISO date of the current instalment
  scholarshipPct: number
}

export type StaffRole = 'teacher' | 'admin' | 'accountant' | 'driver' | 'support'

export interface StaffDay {
  date: string
  status: 'present' | 'late' | 'absent' | 'leave'
  checkIn: string | null // "07:52"
}

export interface Salary {
  basic: number
  hra: number
  allowances: number
  pf: number // employee PF deduction
  esi: number
  tds: number
}

export interface Staff {
  id: string
  name: string
  role: StaffRole
  designation: string
  subjects: Subject[]
  classIds: string[] // classes taught
  classTeacherOf: string | null
  phone: string
  email: string
  joinDate: string
  attendance: StaffDay[] // last 30 working days
  salary: Salary
  bank: string
  avgParentReplyHours: number
  leaveBalance: number
}

export interface Parent {
  id: string
  name: string
  phone: string
  email: string
  childIds: string[]
  relation: 'Mother' | 'Father' | 'Guardian'
}

export interface TimetableSlot {
  period: number
  start: string
  end: string
  subject: Subject | 'Break' | 'Library' | 'Games' | 'Lunch'
  teacherId: string | null
  room?: string
}

/** classId → weekday (0=Mon..4=Fri) → slots */
export type Timetable = Record<string, TimetableSlot[][]>

export interface Exam {
  id: string
  name: 'Unit Test 2'
  classId: string
  subject: Subject
  teacherId: string
  deadline: string // marks submission deadline (ISO)
  status: 'pending' | 'submitted' | 'published'
  submittedAt: string | null
}

export interface Homework {
  id: string
  classId: string
  subject: Subject
  teacherId: string
  title: string
  description: string
  assignedAt: string
  dueDate: string
  /** studentId → state */
  submissions: Record<string, 'pending' | 'submitted' | 'reviewed' | 'late'>
  attachment?: string
}

export interface ChatMessage {
  id: string
  from: string // userId (parent/staff/student id)
  text: string
  at: string // ISO datetime
}

export interface Thread {
  id: string
  kind: 'parent-class-teacher' | 'parent-subject-teacher' | 'student-teacher'
  parentId: string | null
  studentId: string
  staffId: string
  subject?: Subject
  messages: ChatMessage[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  fromId: string // principal / admin staff id
  audience: ('staff' | 'parents' | 'students')[]
  at: string
  pinned: boolean
  acknowledgedBy: string[]
  responses: { id: string; staffId: string; text: string; at: string }[]
}

export type ApprovalKind = 'leave' | 'marks-correction' | 'refund' | 'admission' | 'attendance-correction' | 'expense'

export interface Approval {
  id: string
  kind: ApprovalKind
  requestedBy: string // staff id
  subjectId: string | null // student/staff the request is about
  title: string
  detail: string
  amount?: number
  from?: string
  to?: string
  at: string
  status: 'pending' | 'approved' | 'rejected'
  decidedBy?: string
  decidedAt?: string
}

export interface BusStop { name: string; at: string; x: number; y: number }

export interface Bus {
  id: string // "17"
  route: string
  driverId: string
  driverName: string
  driverPhone: string
  vehicleNo: string
  stops: BusStop[]
  /** 0..1 along the route for the morning trip */
  progress: number
  delayMin: number
  status: 'on-route' | 'arrived' | 'delayed' | 'not-started'
  studentIds: string[]
  capacity: number
}

export interface FeePayment {
  id: string
  studentId: string
  amount: number
  at: string
  mode: 'UPI' | 'Card' | 'Cash' | 'Bank transfer' | 'Cheque'
  receiptNo: string
  collectedBy: string
}

export type AdmissionStage = 'enquiry' | 'visit' | 'assessment' | 'offer' | 'enrolled' | 'dropped'

export interface Admission {
  id: string
  childName: string
  grade: number
  parentName: string
  phone: string
  source: 'Website' | 'Walk-in' | 'Referral' | 'Social' | 'Newspaper'
  stage: AdmissionStage
  createdAt: string
  updatedAt: string
  notes: string
  feeQuoted: number
}

export interface PayrollRun {
  id: string
  month: string // "2026-09"
  status: 'draft' | 'processed' | 'paid'
  processedAt: string | null
  total: number
  staffCount: number
}

export interface Remark {
  id: string
  studentId: string
  staffId: string
  subject: Subject | 'General'
  text: string
  tone: 'praise' | 'concern' | 'note'
  at: string
  visibleToParent: boolean
}

export interface Lesson {
  id: string
  classId: string
  subject: Subject
  teacherId: string
  title: string
  kind: 'video' | 'notes' | 'quiz'
  minutes: number
  chapter: string
  publishedAt: string
  /** studentId → 0..100 */
  progress: Record<string, number>
  quizId?: string
}

export interface QuizQuestion { q: string; options: string[]; answer: number; explain: string }

export interface Quiz {
  id: string
  title: string
  subject: Subject
  classId: string
  questions: QuizQuestion[]
  /** studentId → score out of questions.length */
  attempts: Record<string, number>
}

export interface Complaint {
  id: string
  parentId: string
  studentId: string
  category: 'Transport' | 'Academics' | 'Fees' | 'Facilities' | 'Staff' | 'Food'
  text: string
  at: string
  status: 'open' | 'in-progress' | 'resolved'
  sentiment: 'negative' | 'neutral' | 'positive'
}

export interface RegisterToday {
  classId: string
  markedAt: string | null
  markedBy: string | null
  /** studentId → mark for today (only when marked) */
  marks: Record<string, AttendanceMark>
}

export interface AuditEntry {
  id: string
  at: string
  actorId: string
  actorRole: RoleId
  action: string
  target: string
  sensitive: boolean
}

export interface Notification {
  id: string
  at: string
  audience: { role: RoleId; id?: string } // id narrows to a single user
  studentId?: string
  kind: 'attendance' | 'marks' | 'homework' | 'fees' | 'bus' | 'announcement' | 'message' | 'remark' | 'approval' | 'alert'
  title: string
  body: string
  read: boolean
}

export type PermAction = 'view' | 'create' | 'edit' | 'approve' | 'export' | 'delete'
export type ModuleId =
  | 'students' | 'attendance' | 'exams' | 'fees' | 'payroll' | 'admissions'
  | 'staff' | 'transport' | 'communication' | 'reports' | 'approvals' | 'lms' | 'settings'

/** role → module → allowed actions */
export type PermissionMatrix = Record<string, Partial<Record<ModuleId, PermAction[]>>>

export interface School {
  name: string
  city: string
  board: string
  academicYear: string
  today: string // ISO date of the demo day
  schoolDays: string[] // last 60 school days (ISO), aligned with Student.attendance
}
