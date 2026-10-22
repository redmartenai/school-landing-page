import { motion } from 'framer-motion'
import { BadgeCheck, Banknote, Check, FilePlus } from 'lucide-react'
import { Button, cx, ease, spring, useToast } from '@/components/ui'
import { useSchool } from '@/store/school'
import { dateLabel, monthLabel, rupees, time } from '@/lib/format'
import type { PayrollRun } from '@/data/types'
import { ADMIN_ID } from './shared'

const STEPS: { id: PayrollRun['status']; label: string; sub: string }[] = [
  { id: 'draft', label: 'Draft', sub: 'Attendance & LOP checked' },
  { id: 'processed', label: 'Processed', sub: 'Payslips generated' },
  { id: 'paid', label: 'Paid', sub: 'Salaries credited' },
]
const ORDER: Record<PayrollRun['status'], number> = { draft: 0, processed: 1, paid: 2 }

/** Draft → Processed → Paid. The connector fills as the run moves forward. */
export function RunStepper({ run, compact }: { run: PayrollRun; compact?: boolean }) {
  const at = ORDER[run.status]
  return (
    <div className="relative">
      <div className={cx('absolute left-[14px] right-[14px] h-[3px] rounded-full bg-line-2', compact ? 'top-[12px]' : 'top-[13px]')}>
        <motion.div className="h-full rounded-full bg-forest" initial={false} animate={{ width: `${(at / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 0.7, ease: ease.out }} />
      </div>
      <div className="relative flex justify-between">
        {STEPS.map((s, i) => {
          const done = i < at || run.status === 'paid'
          const current = i === at && run.status !== 'paid'
          return (
            <div key={s.id} className={cx('flex flex-col', i === 0 ? 'items-start' : i === STEPS.length - 1 ? 'items-end text-right' : 'items-center text-center')}>
              <motion.span layout transition={spring}
                className={cx('grid place-items-center rounded-full border-2 bg-ivory-2', compact ? 'h-[26px] w-[26px]' : 'h-7 w-7',
                  done ? 'border-forest bg-forest text-ivory' : current ? 'border-copper text-copper' : 'border-line text-stone-l')}>
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Check size={14} strokeWidth={3} /></motion.span>
                ) : <span className="text-[11px] font-semibold">{i + 1}</span>}
              </motion.span>
              <span className={cx('mt-1.5 text-[12.5px] font-medium', done ? 'text-forest' : current ? 'text-copper-d' : 'text-stone')}>{s.label}</span>
              {!compact && <span className="hidden text-[11.5px] text-stone sm:block">{s.sub}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The one button that moves a run forward. */
export function RunAction({ run, size = 'md' }: { run: PayrollRun; size?: 'sm' | 'md' }) {
  const process = useSchool(s => s.processPayroll)
  const pay = useSchool(s => s.markPayrollPaid)
  const toast = useToast()
  if (run.status === 'draft') {
    return (
      <Button size={size} variant="copper" icon={FilePlus} onClick={() => { process(run.id, ADMIN_ID); toast(`${monthLabel(run.month)} payroll processed · ${run.staffCount} payslips ready. Dr. Iyer has been notified.`) }}>
        Process payroll
      </Button>
    )
  }
  if (run.status === 'processed') {
    return (
      <Button size={size} icon={Banknote} onClick={() => { pay(run.id, ADMIN_ID); toast(`${rupees(run.total)} credited to ${run.staffCount} staff accounts`) }}>
        Mark salaries paid
      </Button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest">
      <BadgeCheck size={16} /> Paid{run.processedAt ? ` · processed ${dateLabel(run.processedAt)} ${time(run.processedAt)}` : ''}
    </span>
  )
}
