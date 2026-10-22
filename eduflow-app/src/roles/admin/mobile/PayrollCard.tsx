import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useState } from 'react'
import { Banknote, Check, Landmark } from 'lucide-react'
import { Button, Pill, Sheet, fadeUp, softSpring, useToast } from '@/components/ui'
import { useData, DEMO } from '@/store/hooks'
import { dateLabel, monthLabel, rupees, rupeesShort, time } from '@/lib/format'
import { currentRun, deductions, grossPay } from './lib'

const STEPS = ['draft', 'processed', 'paid'] as const
const STEP_LABEL = { draft: 'Draft', processed: 'Processed', paid: 'Paid' }

/** The month's payroll as a three-step track: Draft → Processed → Paid. */
export function PayrollCard({ detailed }: { detailed?: boolean }) {
  const d = useData()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const run = currentRun(d)
  if (!run) return null
  const step = STEPS.indexOf(run.status)
  const month = monthLabel(run.month).split(' ')[0]
  const gross = d.staff.reduce((a, s) => a + grossPay(s), 0)
  const ded = d.staff.reduce((a, s) => a + deductions(s), 0)

  const process = () => {
    d.processPayroll(run.id, DEMO.adminId)
    toast(`${month} payroll processed · ${rupeesShort(run.total)} for ${run.staffCount} staff`)
  }
  const pay = () => {
    d.markPayrollPaid(run.id, DEMO.adminId)
    setConfirm(false)
    toast(`Salaries credited to ${run.staffCount} accounts`)
  }

  return (
    <motion.div variants={fadeUp} className="rounded-[18px] border border-line bg-ivory-2 p-4 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone">{monthLabel(run.month)} payroll</div>
          <div className="mt-1 font-display tabular text-[30px] leading-none text-ink">{rupees(run.total)}</div>
          <div className="mt-1 text-[13px] text-stone">Net pay · {run.staffCount} staff</div>
        </div>
        <Pill tone={run.status === 'paid' ? 'forest' : run.status === 'processed' ? 'copper' : 'amber'} dot>{STEP_LABEL[run.status]}</Pill>
      </div>

      <div className="mt-4 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className={clsx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <motion.span animate={{ backgroundColor: i <= step ? '#2E5D4E' : '#EDE8DF', scale: i === step ? 1.12 : 1 }} transition={softSpring}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ivory">
              {i <= step && <Check size={12} strokeWidth={3} />}
            </motion.span>
            {i < STEPS.length - 1 && (
              <span className="mx-1.5 h-[3px] flex-1 overflow-hidden rounded-full bg-line-2">
                <motion.span className="block h-full bg-forest" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.6 }} />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-stone">{STEPS.map(s => <span key={s}>{STEP_LABEL[s]}</span>)}</div>

      {detailed && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-paper/70 px-3 py-2"><div className="text-[11.5px] text-stone">Gross</div><div className="font-display tabular text-[17px] text-ink">{rupeesShort(gross)}</div></div>
          <div className="rounded-[12px] bg-paper/70 px-3 py-2"><div className="text-[11.5px] text-stone">PF · ESI · TDS</div><div className="font-display tabular text-[17px] text-ink">{rupeesShort(ded)}</div></div>
        </div>
      )}

      <div className="mt-4">
        {run.status === 'draft' && <Button block size="lg" icon={Banknote} onClick={process}>Process {month} payroll</Button>}
        {run.status === 'processed' && (
          <>
            <p className="mb-2.5 text-[13px] text-charcoal-2">Processed {run.processedAt ? `${dateLabel(run.processedAt)} at ${time(run.processedAt)}` : ''}. Dr. Iyer has been told. Release when the bank file is uploaded.</p>
            <Button block size="lg" variant="copper" icon={Landmark} onClick={() => setConfirm(true)}>Mark salaries paid</Button>
          </>
        )}
        {run.status === 'paid' && <p className="text-[13.5px] text-forest">Salaries credited. Every payslip for {month} is in the staff app.</p>}
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Release salaries?">
        <p className="text-[15px] leading-relaxed text-charcoal-2">
          This marks <span className="font-medium text-ink">{rupees(run.total)}</span> as credited to <span className="font-medium text-ink">{run.staffCount} bank accounts</span> and sends every staff member their {month} payslip. It is recorded in the audit trail.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setConfirm(false)}>Not yet</Button>
          <Button size="lg" className="flex-1" icon={Check} onClick={pay}>Yes, release</Button>
        </div>
      </Sheet>
    </motion.div>
  )
}
