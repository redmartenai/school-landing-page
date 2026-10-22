import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Printer, Receipt, ReceiptText } from 'lucide-react'
import { Button, EmptyState, Eyebrow, Field, Pill, Ring, Sheet, cx, ease, inputClass, spring, useToast } from '@/components/ui'
import { useData } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { feeStatus } from '@/engine/monitoring'
import { dateLabel, firstName, rupees, time } from '@/lib/format'
import type { FeePayment } from '@/data/types'
import { ADMIN_ID, FEE_STATE, INSTALMENTS, KV, PAY_MODES, feeState, nameOf } from './shared'

type Mode = FeePayment['mode']

export function StudentFeeSheet({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const d = useData()
  const record = useSchool(s => s.recordPayment)
  const toast = useToast()
  const s = studentId ? d.students.find(x => x.id === studentId) : null
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<Mode>('UPI')
  const [receipt, setReceipt] = useState<FeePayment | null>(null)

  // reset the form whenever a different student opens (derived during render, no effect)
  const [forId, setForId] = useState<string | null>(null)
  if (studentId !== forId) {
    setForId(studentId)
    const st = studentId ? d.students.find(x => x.id === studentId) : null
    if (st) {
      const fs = feeStatus(st)
      setAmount(String(fs.overdue || Math.max(0, fs.balance)))
      setMode('UPI')
      setReceipt(null)
    }
  }

  const f = s ? feeStatus(s) : null
  const history = s ? d.feePayments.filter(p => p.studentId === s.id).sort((a, b) => b.at.localeCompare(a.at)) : []
  const value = Math.round(Number(amount) || 0)
  const valid = !!f && value > 0 && value <= f.balance

  const submit = () => {
    if (!s || !valid) return
    record(s.id, value, mode, ADMIN_ID)
    const latest = useSchool.getState().feePayments.filter(p => p.studentId === s.id).at(-1) ?? null
    setReceipt(latest)
    toast(`${rupees(value)} received for ${firstName(s.name)} · ${nameOf(d, s.parentId)} has the receipt`)
  }

  const instalment = s ? Math.round(s.feeTotal / 3) : 0

  return (
    <Sheet open={!!s} onClose={onClose} title={s ? s.name : ''}
      footer={s && f && !receipt && f.balance > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-stone">Balance after: <span className="tabular text-charcoal">{rupees(Math.max(0, f.balance - value))}</span></span>
          <Button icon={Check} disabled={!valid} onClick={submit}>Record {value > 0 ? rupees(value) : 'payment'}</Button>
        </div>
      ) : undefined}>
      {s && f && (
        <AnimatePresence mode="wait" initial={false}>
          {receipt ? (
            <ReceiptCard key="receipt" p={receipt} studentName={s.name} classId={s.classId} parent={nameOf(d, s.parentId)} balance={f.balance} onDone={() => setReceipt(null)} />
          ) : (
            <motion.div key="ledger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-4 rounded-[12px] bg-paper/60 p-4">
                <Ring value={f.paidPct} size={68} tone={f.overdue ? 'rust' : 'forest'}>
                  <span className="font-display text-[16px] text-ink tabular">{Math.round(f.paidPct * 100)}%</span>
                </Ring>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-stone">Class {s.classId} · Roll {s.rollNo} · Parent {nameOf(d, s.parentId)}</div>
                  <div className="mt-1 font-display text-[22px] leading-tight text-ink tabular">{rupees(s.feePaid)} <span className="text-[15px] text-stone">of {rupees(s.feeTotal)}</span></div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Pill tone={FEE_STATE[feeState(s)].tone} dot>{FEE_STATE[feeState(s)].label}</Pill>
                    {f.overdue > 0 && <Pill tone="rust">{rupees(f.overdue)} overdue</Pill>}
                    {s.scholarshipPct > 0 && <Pill tone="copper">{s.scholarshipPct}% scholarship</Pill>}
                  </div>
                </div>
              </div>

              <Eyebrow className="mt-5">Instalments</Eyebrow>
              <div className="grid grid-cols-3 gap-2">
                {INSTALMENTS.map((ins, i) => {
                  const covered = Math.min(instalment, Math.max(0, s.feePaid - instalment * i))
                  const due = ins.due <= d.school.today
                  const done = covered >= instalment - 1
                  return (
                    <div key={ins.label} className={cx('rounded-[10px] border p-2.5', done ? 'border-forest/20 bg-forest-p/50' : due ? 'border-rust/25 bg-rust-p/50' : 'border-line bg-ivory-2')}>
                      <div className="text-[12px] font-medium text-charcoal">{ins.label}</div>
                      <div className="text-[11.5px] text-stone">Due {dateLabel(ins.due)}</div>
                      <div className={cx('mt-1 text-[13px] font-semibold tabular', done ? 'text-forest' : due ? 'text-rust' : 'text-charcoal')}>
                        {done ? 'Paid' : covered > 0 ? `${rupees(instalment - covered)} left` : rupees(instalment)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {f.balance > 0 && (
                <>
                  <Eyebrow className="mt-5">Record a payment</Eyebrow>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Field label="Amount (₹)" hint={f.overdue ? `Overdue ${rupees(f.overdue)} · full balance ${rupees(f.balance)}` : `Full balance ${rupees(f.balance)}`}>
                      <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))} className={cx(inputClass, 'tabular text-[16px] font-medium')} />
                    </Field>
                    <div className="flex gap-1.5 sm:pt-[26px]">
                      {f.overdue > 0 && <Button size="sm" variant="soft" onClick={() => setAmount(String(f.overdue))}>Overdue</Button>}
                      <Button size="sm" variant="soft" onClick={() => setAmount(String(f.balance))}>Full</Button>
                    </div>
                  </div>
                  {value > f.balance && <p className="mt-1.5 text-[12.5px] text-rust">That is more than the {rupees(f.balance)} still owed.</p>}
                  <div className="mt-3">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">Mode</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PAY_MODES.map(m => (
                        <button key={m} onClick={() => setMode(m)} className={cx('relative rounded-full border px-3 py-1.5 text-[13px] transition-colors', mode === m ? 'border-forest text-ivory' : 'border-line bg-ivory-2 text-charcoal hover:bg-paper')}>
                          {mode === m && <motion.span layoutId="pay-mode" className="absolute inset-0 rounded-full bg-forest" transition={spring} />}
                          <span className="relative">{m}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Eyebrow className="mt-6">Payment history</Eyebrow>
              {history.length === 0 && <EmptyState icon={Receipt} title="No payments yet" body={`Nothing has been received for ${firstName(s.name)} this year.`} />}
              <div>
                {history.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 border-b border-line-2 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-ink tabular">{rupees(p.amount)} <span className="font-normal text-stone">· {p.mode}</span></div>
                      <div className="text-[12px] text-stone">{p.receiptNo} · {dateLabel(p.at, { day: 'numeric', month: 'short', year: 'numeric' })} · by {nameOf(d, p.collectedBy)}</div>
                    </div>
                    <Pill tone="forest">Received</Pill>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  )
}

/** A paper receipt that slides out of the "printer" with a stamp. */
function ReceiptCard({ p, studentName, classId, parent, balance, onDone }: { p: FeePayment; studentName: string; classId: string; parent: string; balance: number; onDone: () => void }) {
  return (
    <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2">
      <div className="mx-auto h-2 max-w-[360px] rounded-full bg-charcoal/80" />
      <div className="mx-auto max-w-[340px] overflow-hidden">
        <motion.div initial={{ y: '-100%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: ease.out }}
          className="relative border-x border-b border-dashed border-line bg-ivory-2 px-5 pb-5 pt-4 shadow-2">
          <div className="text-center">
            <ReceiptText size={20} className="mx-auto text-forest" />
            <div className="mt-1 font-display text-[17px] text-ink">Greenfield School</div>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone">Fee receipt</div>
          </div>
          <div className="my-3 border-t border-dashed border-line" />
          <KV k="Receipt no." v={p.receiptNo} />
          <KV k="Date" v={`${dateLabel(p.at, { day: 'numeric', month: 'short', year: 'numeric' })} · ${time(p.at)}`} />
          <KV k="Student" v={`${studentName} · ${classId}`} />
          <KV k="Received from" v={parent} />
          <KV k="Mode" v={p.mode} />
          <div className="my-2 border-t border-dashed border-line" />
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-stone">Amount</span>
            <span className="font-display text-[28px] text-ink tabular">{rupees(p.amount)}</span>
          </div>
          <KV k="Balance for the year" v={rupees(balance)} />
          <motion.div initial={{ scale: 2.2, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: 0.85, type: 'spring', stiffness: 380, damping: 16 }}
            className="absolute bottom-16 right-4 rounded-[8px] border-2 border-forest px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-forest">
            Paid
          </motion.div>
        </motion.div>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-4 text-center text-[13px] text-stone">
        Sent to {parent}'s phone. The parent app already shows it.
      </motion.p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>Print</Button>
        <Button size="sm" variant="soft" onClick={onDone}>Back to ledger</Button>
      </div>
    </motion.div>
  )
}
