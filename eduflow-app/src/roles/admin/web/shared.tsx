/* Admin web — local helpers shared by the admin pages. */
import { motion } from 'framer-motion'
import { Search, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx, inputClass, spring, toneClass, type Tone } from '@/components/ui'
import { feeStatus } from '@/engine/monitoring'
import { DEMO } from '@/store/hooks'
import type { SchoolData } from '@/store/school'
import type { AdmissionStage, RoleId, Salary, Staff, Student } from '@/data/types'

export const ADMIN_ID = DEMO.adminId

/* ───────── fees ───────── */

export type FeeState = 'paid' | 'partial' | 'overdue'

export function feeState(s: Student): FeeState {
  const f = feeStatus(s)
  if (f.overdue > 0) return 'overdue'
  if (s.feePaid >= s.feeTotal) return 'paid'
  return 'partial'
}

export const FEE_STATE: Record<FeeState, { label: string; tone: Tone }> = {
  paid: { label: 'Paid in full', tone: 'forest' },
  partial: { label: 'Up to date', tone: 'slate' },
  overdue: { label: 'Overdue', tone: 'rust' },
}

/** Grade-wise annual fee before scholarship (mirrors the school's fee schedule). */
export const annualFee = (grade: number) => (grade <= 7 ? 72000 : grade === 8 ? 80000 : 92000)

export const INSTALMENTS = [
  { label: 'Term 1', due: '2026-04-15' },
  { label: 'Term 2', due: '2026-09-15' },
  { label: 'Term 3', due: '2027-01-15' },
] as const

export const PAY_MODES = ['UPI', 'Card', 'Cash', 'Bank transfer', 'Cheque'] as const

/* ───────── payroll ───────── */

export const gross = (s: Salary) => s.basic + s.hra + s.allowances
export const deductions = (s: Salary) => s.pf + s.esi + s.tds
export const net = (s: Salary) => gross(s) - deductions(s)

export type Dept = 'Teaching' | 'Administration' | 'Support' | 'Drivers'
export function deptOf(s: Staff): Dept {
  if (s.role === 'teacher') return 'Teaching'
  if (s.role === 'admin' || s.role === 'accountant') return 'Administration'
  if (s.role === 'driver') return 'Drivers'
  return 'Support'
}
export const DEPT_TONE: Record<Dept, Tone> = { Teaching: 'forest', Administration: 'copper', Support: 'slate', Drivers: 'amber' }

/* ───────── admissions ───────── */

export const STAGES: { id: AdmissionStage; label: string; tone: Tone }[] = [
  { id: 'enquiry', label: 'Enquiry', tone: 'amber' },
  { id: 'visit', label: 'Campus visit', tone: 'slate' },
  { id: 'assessment', label: 'Assessment', tone: 'copper' },
  { id: 'offer', label: 'Offer sent', tone: 'copper' },
  { id: 'enrolled', label: 'Enrolled', tone: 'forest' },
  { id: 'dropped', label: 'Dropped', tone: 'stone' },
]
export const stageMeta = (id: AdmissionStage) => STAGES.find(s => s.id === id)!

/* ───────── people ───────── */

export function nameOf(d: SchoolData, id: string) {
  return d.staff.find(s => s.id === id)?.name ?? d.parents.find(p => p.id === id)?.name ?? d.students.find(s => s.id === id)?.name ?? id
}

export const ROLE_LABEL: Record<RoleId, string> = { principal: 'Principal', admin: 'Admin office', staff: 'Teacher', parent: 'Parent', student: 'Student' }

/** Approval kinds that land on the admin's desk. */
export const ADMIN_APPROVAL_KINDS = ['refund', 'expense', 'admission'] as const

/* ───────── small UI pieces ───────── */

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cx(inputClass, 'pl-9 pr-8')} />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-stone hover:bg-paper">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

export function Select<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value as T)} className={cx(inputClass, 'w-auto cursor-pointer pr-8', className)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/** Compact segmented control with a shared layoutId pill. */
export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] border border-line bg-ivory-2 p-0.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('relative shrink-0 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors', value === o.value ? 'text-ivory' : 'text-stone hover:text-ink')}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[8px] bg-forest" transition={spring} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** A tinted icon chip used in list rows. */
export function IconChip({ icon: Icon, tone = 'forest', size = 34 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center rounded-[10px]', toneClass[tone].bg, toneClass[tone].text)}>
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} />
    </span>
  )
}

/** Key/value line used in sheets and payslips. */
export const KV = ({ k, v, strong, tone }: { k: ReactNode; v: ReactNode; strong?: boolean; tone?: Tone }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5 text-[13.5px]">
    <span className="text-stone">{k}</span>
    <span className={cx('tabular text-right', strong ? 'font-semibold text-ink' : 'text-charcoal', tone && toneClass[tone].text)}>{v}</span>
  </div>
)
