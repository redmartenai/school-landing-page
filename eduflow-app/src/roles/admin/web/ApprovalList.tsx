import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, GraduationCap, Inbox, Receipt, ShoppingCart, Undo2, X, type LucideIcon } from 'lucide-react'
import { Avatar, Button, EmptyState, Pill, listItem, useToast, type Tone } from '@/components/ui'
import { useData } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago, dateLabel, rupees } from '@/lib/format'
import type { Approval, ApprovalKind } from '@/data/types'
import { ADMIN_ID, IconChip, nameOf } from './shared'

const KIND: Partial<Record<ApprovalKind, { icon: LucideIcon; tone: Tone; label: string }>> = {
  refund: { icon: Undo2, tone: 'copper', label: 'Refund' },
  expense: { icon: ShoppingCart, tone: 'slate', label: 'Expense' },
  admission: { icon: GraduationCap, tone: 'forest', label: 'Admission' },
  leave: { icon: CalendarDays, tone: 'amber', label: 'Leave' },
}

/** Pending approvals of the given kinds, decided inline. Decided items slide out. */
export function ApprovalList({ kinds, emptyTitle, emptyBody }: { kinds: readonly ApprovalKind[]; emptyTitle: string; emptyBody: string }) {
  const d = useData()
  const decide = useSchool(s => s.decideApproval)
  const toast = useToast()
  const items = d.approvals.filter(a => a.status === 'pending' && kinds.includes(a.kind)).sort((a, b) => a.at.localeCompare(b.at))

  const act = (a: Approval, status: 'approved' | 'rejected') => {
    decide(a.id, status, ADMIN_ID)
    const who = nameOf(d, a.requestedBy)
    toast(status === 'approved' ? `Approved · ${a.title}${a.amount ? ` · ${rupees(a.amount)}` : ''}. ${who} has been told.` : `Declined · ${a.title}. ${who} has been told.`, status === 'approved' ? 'forest' : 'rust')
  }

  return (
    <div>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map(a => {
          const k = KIND[a.kind] ?? { icon: Receipt, tone: 'stone' as Tone, label: a.kind }
          const subject = a.subjectId ? d.students.find(s => s.id === a.subjectId) : null
          return (
            <motion.div key={a.id} layout variants={listItem} initial="hidden" animate="show" exit="exit"
              className="flex flex-col gap-3 border-b border-line-2 py-3.5 last:border-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 gap-3">
                <IconChip icon={k.icon} tone={k.tone} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium text-ink">{a.title}</span>
                    {a.amount !== undefined && <Pill tone={k.tone}>{rupees(a.amount)}</Pill>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-stone">{a.detail}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-stone-l">
                    <span className="inline-flex items-center gap-1.5"><Avatar name={nameOf(d, a.requestedBy)} size={16} /> {nameOf(d, a.requestedBy)}</span>
                    {subject && <span>· for {subject.name} ({subject.classId})</span>}
                    {a.from && <span>· {dateLabel(a.from)}{a.to && a.to !== a.from ? ` → ${dateLabel(a.to)}` : ''}</span>}
                    <span>· asked {ago(a.at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 pl-[46px] sm:pl-0">
                <Button size="sm" variant="outline" icon={X} onClick={() => act(a, 'rejected')}>Decline</Button>
                <Button size="sm" icon={Check} onClick={() => act(a, 'approved')}>Approve</Button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {items.length === 0 && <EmptyState icon={Inbox} title={emptyTitle} body={emptyBody} />}
    </div>
  )
}
