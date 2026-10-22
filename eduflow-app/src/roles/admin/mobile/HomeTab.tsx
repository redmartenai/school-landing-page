import { motion } from 'framer-motion'
import { ChevronRight, Inbox, IndianRupee, UserPlus } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow, useMobileNav } from '@/components/shell/Mobile'
import { AnimatedNumber, Avatar, fadeUp } from '@/components/ui'
import { useData, useMe, useNow, usePulse } from '@/store/hooks'
import { feeStatus } from '@/engine/monitoring'
import { daysBetween, firstName, greeting, rupees, rupeesShort, time, weekday, dateLabel } from '@/lib/format'
import { MetricChip } from '@/roles/_shared/MetricChip'
import { PayrollCard } from './PayrollCard'
import { STAGE_LABEL, decidable, paymentsOn } from './lib'

export function HomeTab() {
  const d = useData()
  const now = useNow()
  const pulse = usePulse()
  const me = useMe('admin')
  const nav = useMobileNav()
  const today = now.slice(0, 10)
  const todays = paymentsOn(d, today).sort((a, b) => b.at.localeCompare(a.at))
  const collectedToday = todays.reduce((a, p) => a + p.amount, 0)
  const defaulters = d.students.filter(s => feeStatus(s).overdue > 0).length
  const weekAdmissions = d.admissions.filter(a => daysBetween(a.createdAt, today) <= 6)
  const waiting = decidable(d)

  return (
    <MobileScreen eyebrow={`${weekday(now)} ${dateLabel(now, { day: 'numeric', month: 'long' })} · ${time(now)}`} title={`${greeting(now)}, ${firstName(me.name)}`}>
      <motion.div variants={fadeUp} className="rounded-[18px] border border-line bg-ivory-2 p-4 shadow-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">Collected today</div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <AnimatedNumber value={collectedToday} format={rupees} className="font-display text-[36px] leading-none text-ink" />
          <span className="pb-1 text-[13px] text-stone">{todays.length ? `${todays.length} payment${todays.length > 1 ? 's' : ''}` : 'Counter opens at 09:00'}</span>
        </div>
        {todays.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {todays.slice(0, 3).map(p => {
              const st = d.students.find(s => s.id === p.studentId)
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-[13px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest-l" />
                  <span className="min-w-0 flex-1 truncate text-charcoal-2">{st?.name} · {st?.classId} · {p.mode}</span>
                  <span className="tabular font-medium text-forest">{rupees(p.amount)}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <MetricChip label="This month" value={rupeesShort(pulse.collectedThisMonth)} sub={`${Math.round((pulse.feeCollected / pulse.feeTotal) * 100)}% of the year collected`} />
        <MetricChip label="Overdue" tone="rust" value={rupeesShort(pulse.feeOverdue)} sub={`${defaulters} families`} onClick={() => nav.setTab('fees')} />
      </div>

      <MSection title="Payroll">
        <PayrollCard />
      </MSection>

      <MSection title="Your desk">
        <MList>
          <MRow onClick={() => nav.setTab('approvals')}
            icon={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-amber-p text-[#8a5f14]"><Inbox size={17} /></span>}
            title={waiting.length ? `${waiting.length} approval${waiting.length > 1 ? 's' : ''} waiting on you` : 'No approvals waiting'}
            sub={waiting.length ? waiting.slice(0, 2).map(a => a.title).join(' · ') : 'Refunds, expenses and leave land here'}
            right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
          <MRow onClick={() => nav.setTab('admissions')}
            icon={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-forest-p text-forest"><UserPlus size={17} /></span>}
            title={`${weekAdmissions.length} new enquir${weekAdmissions.length === 1 ? 'y' : 'ies'} this week`}
            sub={`${d.admissions.filter(a => a.stage === 'offer').length} offers out · ${d.admissions.filter(a => a.stage === 'enrolled').length} enrolled this season`}
            right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
          <MRow onClick={() => nav.setTab('fees')}
            icon={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-rust-p text-rust"><IndianRupee size={17} /></span>}
            title={`${defaulters} families are behind on fees`}
            sub="Term 2 instalment was due 15 September"
            right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
        </MList>
      </MSection>

      {weekAdmissions.length > 0 && (
        <MSection title="Latest enquiries">
          <MList>
            {[...weekAdmissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map(a => (
              <MRow key={a.id} icon={<Avatar name={a.childName} size={34} />} title={a.childName}
                sub={`Grade ${a.grade} · ${a.parentName} · ${a.source}`}
                right={<span className="shrink-0 text-[12.5px] text-stone">{STAGE_LABEL[a.stage]}</span>} />
            ))}
          </MList>
        </MSection>
      )}
    </MobileScreen>
  )
}
