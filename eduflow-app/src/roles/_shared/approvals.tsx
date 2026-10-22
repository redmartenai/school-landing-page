/**
 * Shared approval presentation for the Principal and Admin phones.
 * One body, two surfaces: the principal swipes it, the admin taps it.
 */
import clsx from 'clsx'
import {
  CalendarDays, ClipboardCheck, FilePen, ReceiptIndianRupee, UserPlus, Wallet, type LucideIcon,
} from 'lucide-react'
import type { Approval, ApprovalKind } from '@/data/types'
import type { SchoolData } from '@/store/school'
import { Avatar, Pill, type Tone } from '@/components/ui'
import { dateLabel, hoursBetween, rupees } from '@/lib/format'

export const KIND_LABEL: Record<ApprovalKind, string> = {
  leave: 'Leave',
  'marks-correction': 'Marks correction',
  refund: 'Refund',
  admission: 'Admission',
  'attendance-correction': 'Attendance correction',
  expense: 'Expense',
}

export const KIND_ICON: Record<ApprovalKind, LucideIcon> = {
  leave: CalendarDays,
  'marks-correction': FilePen,
  refund: ReceiptIndianRupee,
  admission: UserPlus,
  'attendance-correction': ClipboardCheck,
  expense: Wallet,
}

/** Whole hours an approval has been waiting on the demo clock. */
export const hoursWaiting = (a: Approval, now: string) => Math.max(0, Math.round(hoursBetween(a.at, now)))

export function waitingLabel(h: number) {
  if (h < 1) return 'Just in'
  if (h < 24) return `Waiting ${h} h`
  const days = Math.floor(h / 24)
  return `Waiting ${days} day${days > 1 ? 's' : ''}`
}

/** Waiting longer than a day is the monitoring threshold — copper; otherwise it is simply pending — amber. */
export const waitingTone = (h: number): Tone => (h >= 24 ? 'copper' : 'amber')

export function personName(d: SchoolData, id: string | null | undefined) {
  if (!id) return null
  return d.staff.find(s => s.id === id)?.name ?? d.students.find(s => s.id === id)?.name ?? null
}

function aboutLine(d: SchoolData, a: Approval) {
  if (!a.subjectId || a.subjectId === a.requestedBy) return null
  const st = d.students.find(s => s.id === a.subjectId)
  if (st) return `${st.name} · ${st.classId}`
  return personName(d, a.subjectId)
}

/** The content of an approval: kind, title, money, dates, who asked and why. */
export function ApprovalBody({ d, approval: a, now, dense, selfId }: { d: SchoolData; approval: Approval; now: string; dense?: boolean; selfId?: string }) {
  const requester = d.staff.find(s => s.id === a.requestedBy)
  const h = hoursWaiting(a, now)
  const about = aboutLine(d, a)
  const Icon = KIND_ICON[a.kind]
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Pill tone="slate" icon={Icon}>{KIND_LABEL[a.kind]}</Pill>
        <Pill tone={waitingTone(h)} dot>{waitingLabel(h)}</Pill>
      </div>
      <h3 className={clsx('font-display leading-tight text-ink', dense ? 'mt-2.5 text-[18px]' : 'mt-4 text-[23px]')}>{a.title}</h3>
      {a.amount !== undefined && (
        <div className={clsx('font-display tabular text-ink', dense ? 'mt-1 text-[22px]' : 'mt-2 text-[34px] leading-none')}>{rupees(a.amount)}</div>
      )}
      {a.from && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-charcoal-2">
          <CalendarDays size={14} className="text-stone" />
          {a.to && a.to !== a.from ? `${dateLabel(a.from, { weekday: 'short', day: 'numeric', month: 'short' })} → ${dateLabel(a.to, { weekday: 'short', day: 'numeric', month: 'short' })}` : dateLabel(a.from, { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      )}
      {about && <div className="mt-1 text-[13.5px] text-charcoal-2">About {about}</div>}
      <p className={clsx('text-charcoal-2', dense ? 'mt-2 text-[13.5px] leading-snug' : 'mt-3 text-[15px] leading-relaxed')}>{a.detail}</p>
      {requester && (
        <div className={clsx('flex items-center gap-2.5', dense ? 'mt-3' : 'mt-5')}>
          <Avatar name={requester.name} size={dense ? 26 : 32} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-medium text-ink">{requester.id === selfId ? 'You' : requester.name}</div>
            <div className="truncate text-[12px] text-stone">{requester.designation}</div>
          </div>
        </div>
      )}
    </div>
  )
}
