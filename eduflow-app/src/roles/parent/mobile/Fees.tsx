/* Fees: per-child balance, instalments, payment history and the Pay now flow. */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Check, CreditCard, LoaderCircle, Receipt, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { Button, EmptyState, Pill, Progress, Sheet, cx, ease, spring, useToast } from '@/components/ui'
import { MList, MRow, MSection, MobileScreen } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { dateLabel, firstName, rupees } from '@/lib/format'
import type { FeePayment, Student } from '@/data/types'
import { PARENT_ID, feeSummary, useParentScope } from './data'
import { MCard, ToneIcon } from './bits'

type Mode = Extract<FeePayment['mode'], 'UPI' | 'Card'>

/** Bottom sheet: choose amount → choose mode → processing → receipt. */
export function PaySheet({ student, open, onClose }: { student: Student | null; open: boolean; onClose: () => void }) {
  const recordPayment = useSchool(s => s.recordPayment)
  const toast = useToast()
  const [amount, setAmount] = useState(0)
  const [mode, setMode] = useState<Mode>('UPI')
  const [step, setStep] = useState<'choose' | 'processing' | 'done'>('choose')
  const [receipt, setReceipt] = useState<FeePayment | null>(null)
  const f = student ? feeSummary(student) : null

  // Reset each time the sheet opens
  const sid = student?.id
  useEffect(() => {
    if (!open || !sid) return
    const st = useSchool.getState().students.find(x => x.id === sid)
    if (!st) return
    const fs = feeSummary(st)
    setAmount(fs.overdue > 0 ? fs.overdue : fs.balance)
    setMode('UPI'); setStep('choose'); setReceipt(null)
  }, [open, sid])

  if (!student || !f) return null
  const name = firstName(student.name)
  const presets = [
    ...(f.overdue > 0 ? [{ label: `${f.overdueLabel ?? 'Overdue'} instalment`, sub: 'Overdue since 15 Sep', value: f.overdue }] : []),
    ...(f.balance > 0 && f.balance !== f.overdue ? [{ label: 'Full year balance', sub: 'Nothing more due this year', value: f.balance }] : []),
  ]

  const pay = () => {
    setStep('processing')
    setTimeout(() => {
      const before = useSchool.getState().feePayments.length
      recordPayment(student.id, amount, mode, PARENT_ID)
      const after = useSchool.getState().feePayments
      setReceipt(after.length > before ? after[after.length - 1] : null)
      setStep('done')
      toast(`${rupees(amount)} paid for ${name}`)
    }, 1200)
  }

  return (
    <Sheet open={open} onClose={step === 'processing' ? () => {} : onClose} title={step === 'done' ? undefined : `Pay for ${name}`}
      footer={step === 'choose' ? (
        <Button size="lg" block onClick={pay} disabled={amount <= 0} icon={ShieldCheck}>Pay {rupees(amount)} securely</Button>
      ) : step === 'done' ? <Button size="lg" variant="outline" block onClick={onClose}>Done</Button> : undefined}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'choose' && (
          <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Amount</div>
            <div className="space-y-2">
              {presets.map(p => {
                const on = amount === p.value
                return (
                  <button key={p.label} onClick={() => setAmount(p.value)}
                    className={cx('flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors', on ? 'border-forest bg-forest-p' : 'border-line bg-ivory')}>
                    <span className={cx('grid h-5 w-5 place-items-center rounded-full border-2', on ? 'border-forest bg-forest text-ivory' : 'border-stone-p')}>
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">{p.label}</span>
                      <span className="block text-[12.5px] text-stone">{p.sub}</span>
                    </span>
                    <span className="font-display text-[19px] tabular text-ink">{rupees(p.value)}</span>
                  </button>
                )
              })}
            </div>
            <div className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Pay with</div>
            <div className="grid grid-cols-2 gap-2">
              {([['UPI', Smartphone, 'GPay, PhonePe, Paytm'], ['Card', CreditCard, 'Debit or credit']] as const).map(([m, Icon, sub]) => {
                const on = mode === m
                return (
                  <button key={m} onClick={() => setMode(m)}
                    className={cx('relative rounded-[14px] border px-3.5 py-3 text-left transition-colors', on ? 'border-forest bg-forest-p' : 'border-line bg-ivory')}>
                    <Icon size={20} className={on ? 'text-forest' : 'text-stone'} />
                    <span className="mt-1.5 block text-[15px] font-medium text-ink">{m}</span>
                    <span className="block text-[12px] text-stone">{sub}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-[12.5px] text-stone">A receipt is sent to you and to the school accounts office the moment the payment clears.</p>
          </motion.div>
        )}
        {step === 'processing' && (
          <motion.div key="proc" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 text-center">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} className="text-forest">
              <LoaderCircle size={44} strokeWidth={1.6} />
            </motion.span>
            <div className="mt-4 font-display text-[20px]">Paying {rupees(amount)}</div>
            <div className="mt-1 text-[13.5px] text-stone">Confirming with your {mode === 'UPI' ? 'UPI app' : 'bank'}…</div>
          </motion.div>
        )}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: ease.out }}
            className="flex flex-col items-center pt-4 text-center">
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring} className="grid h-16 w-16 place-items-center rounded-full bg-forest text-ivory">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: ease.out }} />
              </svg>
            </motion.span>
            <div className="mt-3 font-display text-[24px] leading-tight">Payment received</div>
            <div className="mt-1 text-[13.5px] text-stone">Thank you. {name}'s fees are updated with the school.</div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4, ease: ease.out }}
              className="mt-5 w-full rounded-[16px] border border-dashed border-stone-p bg-ivory p-4 text-left">
              <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.12em] text-stone"><span>Receipt</span><span className="tabular">{receipt?.receiptNo ?? '—'}</span></div>
              <div className="mt-2 font-display text-[30px] tabular leading-none text-ink">{rupees(amount)}</div>
              <dl className="mt-3 space-y-1.5 text-[13.5px]">
                {[
                  ['Student', `${student.name} · ${student.classId}`],
                  ['Paid via', mode],
                  ['Date', receipt ? `${dateLabel(receipt.at, { day: 'numeric', month: 'short', year: 'numeric' })}, ${receipt.at.slice(11, 16)}` : '—'],
                  ['Balance now', rupees(Math.max(0, student.feeTotal - student.feePaid))],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-stone">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>
                ))}
              </dl>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}

export function FeesScreen() {
  const { d, children, childIds } = useParentScope()
  const [paying, setPaying] = useState<string | null>(null)
  const payingStudent = children.find(c => c.id === paying) ?? null
  const history = d.feePayments.filter(p => childIds.includes(p.studentId)).sort((a, b) => b.at.localeCompare(a.at))
  const totalOverdue = children.reduce((a, c) => a + feeSummary(c).overdue, 0)

  return (
    <MobileScreen title="Fees" eyebrow={totalOverdue > 0 ? `${rupees(totalOverdue)} overdue` : 'All instalments up to date'}>
      {children.map(c => {
        const f = feeSummary(c)
        const name = firstName(c.name)
        return (
          <MSection key={c.id} title={`${name} · ${c.classId}`}>
            <MCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] text-stone">{f.balance > 0 ? 'Balance this year' : 'Fully paid'}</div>
                  <div className="font-display text-[30px] tabular leading-tight text-ink">{rupees(f.balance)}</div>
                </div>
                {f.overdue > 0 ? <Pill tone="rust" dot>{rupees(f.overdue)} overdue</Pill> : <Pill tone="forest" dot>Up to date</Pill>}
              </div>
              <Progress className="mt-3" value={f.paidPct} tone={f.overdue > 0 ? 'copper' : 'forest'} />
              <div className="mt-1.5 text-[12.5px] text-stone">{rupees(c.feePaid)} of {rupees(c.feeTotal)} paid{c.scholarshipPct ? ` · ${c.scholarshipPct}% scholarship applied` : ''}</div>
              <div className="mt-3 divide-y divide-line-2">
                {f.inst.map(i => (
                  <div key={i.label} className="flex items-center justify-between py-2.5 text-[14px]">
                    <div>
                      <div className="font-medium text-ink">{i.label}</div>
                      <div className="text-[12.5px] text-stone">Due {dateLabel(i.due)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular text-ink">{rupees(i.amount)}</span>
                      <Pill tone={i.state === 'paid' ? 'forest' : i.state === 'overdue' ? 'rust' : 'stone'}>{i.state === 'paid' ? 'Paid' : i.state === 'overdue' ? 'Overdue' : 'Upcoming'}</Pill>
                    </div>
                  </div>
                ))}
              </div>
              {f.balance > 0 && (
                <Button className="mt-3" size="lg" block variant={f.overdue > 0 ? 'primary' : 'outline'} icon={Wallet} onClick={() => setPaying(c.id)}>
                  {f.overdue > 0 ? `Pay ${rupees(f.overdue)} now` : 'Pay in advance'}
                </Button>
              )}
            </MCard>
          </MSection>
        )
      })}

      <MSection title="Payment history">
        {history.length ? (
          <MList>
            <AnimatePresence initial={false}>
              {history.map(p => {
                const s = children.find(c => c.id === p.studentId)!
                return (
                  <motion.div key={p.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.35, ease: ease.out }}>
                    <MRow icon={<ToneIcon icon={Receipt} tone="forest" />}
                      title={<span className="tabular">{rupees(p.amount)}</span>}
                      sub={`${firstName(s.name)} · ${p.mode} · ${dateLabel(p.at, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      right={<span className="text-[12px] tabular text-stone">{p.receiptNo}</span>} />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </MList>
        ) : <EmptyState icon={Receipt} title="No payments yet" body="Receipts appear here the moment a payment clears." />}
      </MSection>

      <PaySheet student={payingStudent} open={!!paying} onClose={() => setPaying(null)} />
    </MobileScreen>
  )
}

