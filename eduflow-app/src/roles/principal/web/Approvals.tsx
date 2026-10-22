import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, CalendarClock, Check, ClipboardCheck, GraduationCap, Inbox, Receipt, School, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Tabs, cx, listItem, useToast, type Tone } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { RULES } from '@/engine/monitoring'
import { ago, dateLabel, hoursBetween, rupees } from '@/lib/format'
import type { Approval, ApprovalKind } from '@/data/types'
import { ME, ToneIcon, plural, useNameOf } from './shared'

const KIND: Record<ApprovalKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  leave: { label: 'Leave', icon: CalendarClock, tone: 'slate' },
  'marks-correction': { label: 'Marks correction', icon: GraduationCap, tone: 'copper' },
  refund: { label: 'Refund', icon: Receipt, tone: 'amber' },
  admission: { label: 'Admission', icon: School, tone: 'forest' },
  'attendance-correction': { label: 'Attendance fix', icon: ClipboardCheck, tone: 'slate' },
  expense: { label: 'Expense', icon: Banknote, tone: 'amber' },
}

type Filter = 'all' | ApprovalKind

export function ApprovalsPage() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const decide = useSchool(s => s.decideApproval)
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')

  const pending = d.approvals.filter(a => a.status === 'pending').sort((a, b) => a.at.localeCompare(b.at))
  const decided = d.approvals.filter(a => a.status !== 'pending').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const visible = pending.filter(a => filter === 'all' || a.kind === filter)
  const stale = pending.filter(a => hoursBetween(a.at, now) >= RULES.approvalHours).length
  const kinds = (Object.keys(KIND) as ApprovalKind[]).filter(k => pending.some(a => a.kind === k))

  const act = (a: Approval, status: 'approved' | 'rejected') => {
    decide(a.id, status, ME)
    toast(`${status === 'approved' ? 'Approved' : 'Declined'} · ${nameOf(a.requestedBy)} has been told`, status === 'approved' ? 'forest' : 'rust')
  }

  return (
    <Page>
      <PageHeader eyebrow="Approvals"
        title={pending.length ? `${plural(pending.length, 'decision')} waiting on you` : 'Nothing waiting on you'}
        subtitle={stale ? `${stale} ${stale === 1 ? 'has' : 'have'} been waiting more than a day. Each one is somebody blocked.` : 'Everything in the queue is fresh.'} />

      <Card padded={false} className="p-4 md:p-5">
        <Tabs<Filter> size="sm" className="mb-4" value={filter} onChange={setFilter}
          tabs={[{ id: 'all', label: 'All', count: pending.length }, ...kinds.map(k => ({ id: k as Filter, label: KIND[k].label, count: pending.filter(a => a.kind === k).length }))]} />
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map(a => {
              const k = KIND[a.kind]
              const h = hoursBetween(a.at, now)
              const old = h >= RULES.approvalHours
              return (
                <motion.div key={a.id} layout variants={listItem} initial="hidden" animate="show" exit="exit"
                  className={cx('flex flex-col gap-3 rounded-[13px] border bg-ivory-2 p-4 sm:flex-row sm:items-center', old ? 'border-rust/30' : 'border-line')}>
                  <ToneIcon icon={k.icon} tone={k.tone} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{a.title}</span>
                      <Pill tone={k.tone}>{k.label}</Pill>
                      {a.amount !== undefined && <Pill tone="stone">{rupees(a.amount)}</Pill>}
                    </div>
                    <div className="mt-0.5 text-[13px] text-charcoal-2">{a.detail}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-stone">
                      <span className="inline-flex items-center gap-1.5"><Avatar name={nameOf(a.requestedBy)} size={18} />{nameOf(a.requestedBy)}</span>
                      {a.subjectId && a.subjectId !== a.requestedBy && <span>· about {nameOf(a.subjectId)}</span>}
                      {a.from && <span>· {dateLabel(a.from)}{a.to && a.to !== a.from ? ` → ${dateLabel(a.to)}` : ''}</span>}
                      <span className={cx('tabular', old ? 'font-medium text-rust' : '')}>· waiting {h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h)}h`}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" icon={X} onClick={() => act(a, 'rejected')}>Decline</Button>
                    <Button size="sm" icon={Check} onClick={() => act(a, 'approved')}>Approve</Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {visible.length === 0 && <EmptyState icon={Inbox} title="Queue clear" body={filter === 'all' ? 'No one is waiting on a decision from you.' : 'Nothing of this kind is waiting.'} />}
        </div>
      </Card>

      <Card padded={false} className="mt-5 p-4 md:p-5">
        <CardHeader eyebrow="History" title="Decided" action={<Pill>{decided.length}</Pill>} />
        {decided.length === 0 ? <EmptyState icon={Inbox} title="No decisions yet" body="Approved and declined requests will collect here." /> : (
          <div className="divide-y divide-line-2">
            <AnimatePresence initial={false}>
              {decided.map(a => (
                <motion.div key={a.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="flex items-center gap-3 py-2.5">
                    <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', a.status === 'approved' ? 'bg-forest-p text-forest' : 'bg-rust-p text-rust')}>
                      {a.status === 'approved' ? <Check size={13} strokeWidth={2.6} /> : <X size={13} strokeWidth={2.6} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] text-ink">{a.title} <span className="text-stone">· {nameOf(a.requestedBy)}</span></div>
                    </div>
                    <span className="shrink-0 text-[12px] text-stone">{a.status === 'approved' ? 'Approved' : 'Declined'} {a.decidedAt ? ago(a.decidedAt, now) : ''}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </Page>
  )
}
