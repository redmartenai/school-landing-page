import type { SchoolData } from '@/store/school'
import type { AdmissionStage, ApprovalKind, FeePayment, Staff } from '@/data/types'
import { DEMO } from '@/store/hooks'

export const netPay = (s: Staff) => s.salary.basic + s.salary.hra + s.salary.allowances - s.salary.pf - s.salary.esi - s.salary.tds
export const grossPay = (s: Staff) => s.salary.basic + s.salary.hra + s.salary.allowances
export const deductions = (s: Staff) => s.salary.pf + s.salary.esi + s.salary.tds

export const currentRun = (d: SchoolData) => [...d.payrollRuns].sort((a, b) => b.month.localeCompare(a.month))[0]

export const paymentsOn = (d: SchoolData, date: string) => d.feePayments.filter(p => p.at.startsWith(date))

export const MODES: FeePayment['mode'][] = ['UPI', 'Cash', 'Card', 'Bank transfer', 'Cheque']

/** What the administrator decides; leave is shared with the principal. */
export const ADMIN_KINDS: ApprovalKind[] = ['refund', 'expense', 'admission', 'leave']

/** Pending approvals Rakesh can decide — never his own requests. */
export const decidable = (d: SchoolData) =>
  d.approvals.filter(a => a.status === 'pending' && ADMIN_KINDS.includes(a.kind) && a.requestedBy !== DEMO.adminId)

/** Requests Rakesh raised, waiting on the principal. */
export const raisedByMe = (d: SchoolData) => d.approvals.filter(a => a.status === 'pending' && a.requestedBy === DEMO.adminId)

export const STAGES: AdmissionStage[] = ['enquiry', 'visit', 'assessment', 'offer', 'enrolled']
export const STAGE_LABEL: Record<AdmissionStage, string> = {
  enquiry: 'Enquiry', visit: 'Campus visit', assessment: 'Assessment', offer: 'Offer', enrolled: 'Enrolled', dropped: 'Dropped',
}
export const NEXT_ACTION: Partial<Record<AdmissionStage, string>> = {
  enquiry: 'Book campus visit', visit: 'Schedule assessment', assessment: 'Send offer', offer: 'Confirm enrolment',
}
export const nextStage = (s: AdmissionStage): AdmissionStage | null => {
  const i = STAGES.indexOf(s)
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null
}
