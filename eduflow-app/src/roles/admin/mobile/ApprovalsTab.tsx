import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Check, CircleCheck, X } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Button, Pill, ease, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import type { Approval } from '@/data/types'
import { rupees, time } from '@/lib/format'
import { ApprovalBody, KIND_LABEL, hoursWaiting, waitingLabel } from '@/roles/_shared/approvals'
import { ADMIN_KINDS, decidable, raisedByMe } from './lib'

type Dir = 1 | -1

export function ApprovalsTab() {
  const d = useData()
  const now = useNow()
  const toast = useToast()
  const [dir, setDir] = useState<Dir>(1)
  const pending = decidable(d).sort((a, b) => a.at.localeCompare(b.at))
  const mine = raisedByMe(d)
  const today = now.slice(0, 10)
  const decided = d.approvals.filter(a => a.status !== 'pending' && ADMIN_KINDS.includes(a.kind) && a.decidedAt?.startsWith(today))
    .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const money = pending.reduce((s, a) => s + (a.amount ?? 0), 0)

  const decide = (a: Approval, direction: Dir) => {
    setDir(direction)
    d.decideApproval(a.id, direction === 1 ? 'approved' : 'rejected', DEMO.adminId)
    const who = d.staff.find(s => s.id === a.requestedBy)?.name ?? 'The requester'
    toast(`${direction === 1 ? 'Approved' : 'Declined'} · ${who} has been told`, direction === 1 ? 'forest' : 'rust')
  }

  return (
    <MobileScreen eyebrow={pending.length ? `${pending.length} waiting${money ? ` · ${rupees(money)} involved` : ''}` : 'Approvals'} title="Approvals">
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        {pending.map(a => (
          <motion.div key={a.id} layout custom={dir}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit="exit" variants={{ exit: (dd: Dir) => ({ opacity: 0, x: dd * 360, rotate: dd * 4, transition: { duration: 0.35, ease: ease.ez } }) }}
            transition={{ duration: 0.35, ease: ease.out }}
            className="mb-3 rounded-[18px] border border-line bg-ivory-2 p-4 shadow-1">
            <ApprovalBody d={d} approval={a} now={now} dense selfId={DEMO.adminId} />
            <div className="mt-4 flex gap-2">
              <Button variant="danger" className="flex-1" icon={X} onClick={() => decide(a, -1)}>Decline</Button>
              <Button className="flex-[1.4]" icon={Check} onClick={() => decide(a, 1)}>Approve{a.amount ? ` ${rupees(a.amount)}` : ''}</Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {!pending.length && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: ease.out }}
          className="flex items-center gap-3 rounded-[16px] border border-forest/15 bg-forest-p px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ivory-2 text-forest"><CircleCheck size={19} /></span>
          <div>
            <div className="font-display text-[17px] text-ink">Nothing waiting on you.</div>
            <div className="text-[13px] text-forest">Refunds, expenses and leave requests appear here.</div>
          </div>
        </motion.div>
      )}

      {mine.length > 0 && (
        <MSection title="Waiting on Dr. Iyer" className="!mt-7">
          <MList>
            {mine.map(a => (
              <MRow key={a.id} title={a.title} sub={`${KIND_LABEL[a.kind]}${a.amount ? ` · ${rupees(a.amount)}` : ''} · raised by you`}
                right={<Pill tone={hoursWaiting(a, now) >= 24 ? 'copper' : 'amber'} dot>{waitingLabel(hoursWaiting(a, now)).replace('Waiting ', '')}</Pill>} />
            ))}
          </MList>
        </MSection>
      )}

      {decided.length > 0 && (
        <MSection title="Decided today">
          <MList>
            {decided.map(a => (
              <MRow key={a.id} title={a.title}
                sub={`${d.staff.find(s => s.id === a.decidedBy)?.name ?? ''} · ${a.decidedAt ? time(a.decidedAt) : ''}`}
                right={<Pill tone={a.status === 'approved' ? 'forest' : 'rust'}>{a.status === 'approved' ? 'Approved' : 'Declined'}</Pill>} />
            ))}
          </MList>
        </MSection>
      )}
    </MobileScreen>
  )
}
