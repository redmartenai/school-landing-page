import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { BellRing, Check, ChevronRight, Phone, ReceiptIndianRupee, Search, X } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, Button, EmptyState, Pill, Progress, Sheet, Tabs, ease, softSpring, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import { useSchool } from '@/store/school'
import type { FeePayment, Student } from '@/data/types'
import { feeStatus } from '@/engine/monitoring'
import { dateLabel, firstName, rupees, rupeesShort, time } from '@/lib/format'
import { MODES } from './lib'

type Filter = 'overdue' | 'all'
const PAGE = 40

export function FeesTab() {
  const d = useData()
  const now = useNow()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('overdue')
  const [openId, setOpenId] = useState<string | null>(null)
  const [remindedAt, setRemindedAt] = useState<string | null>(null)

  const rows = useMemo(() => d.students.map(s => ({ s, f: feeStatus(s) })), [d.students])
  const defaulters = rows.filter(r => r.f.overdue > 0)
  const totalOverdue = defaulters.reduce((a, r) => a + r.f.overdue, 0)
  const needle = q.trim().toLowerCase()
  const shown = rows
    .filter(r => (filter === 'all' || needle ? true : r.f.overdue > 0))
    .filter(r => !needle || r.s.name.toLowerCase().includes(needle) || r.s.classId.toLowerCase() === needle || r.s.admissionNo.toLowerCase().includes(needle))
    .sort((a, b) => b.f.overdue - a.f.overdue || a.s.name.localeCompare(b.s.name))
  const open = d.students.find(s => s.id === openId) ?? null

  const remindAll = () => {
    d.remindFees(defaulters.map(r => r.s.id), DEMO.adminId)
    setRemindedAt(now)
    toast(`Reminders sent to ${defaulters.length} families`)
  }

  return (
    <MobileScreen eyebrow={`${defaulters.length} families · ${rupeesShort(totalOverdue)} overdue`} title="Fees">
      <div className="flex h-11 items-center gap-2 rounded-[12px] border border-line bg-ivory-2 px-3 focus-within:border-forest-l">
        <Search size={16} className="shrink-0 text-stone" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Student, class or admission no."
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-stone-l" aria-label="Search students" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search" className="text-stone"><X size={16} /></button>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Tabs size="sm" value={filter} onChange={setFilter} tabs={[{ id: 'overdue', label: 'Overdue', count: defaulters.length }, { id: 'all', label: 'All students' }]} />
      </div>

      {defaulters.length > 0 && !needle && filter === 'overdue' && (
        <Button block size="md" className="mt-3" variant={remindedAt ? 'soft' : 'copper'} icon={remindedAt ? Check : BellRing} disabled={!!remindedAt} onClick={remindAll}>
          {remindedAt ? `Reminded ${defaulters.length} families at ${time(remindedAt)}` : `Remind all ${defaulters.length} defaulters`}
        </Button>
      )}

      <MSection className="!mt-4">
        {shown.length ? (
          <MList>
            {shown.slice(0, PAGE).map(({ s, f }) => (
              <MRow key={s.id} onClick={() => setOpenId(s.id)}
                icon={<Avatar name={s.name} size={34} />}
                title={s.name}
                sub={`${s.classId} · Roll ${s.rollNo} · paid ${Math.round(f.paidPct * 100)}%`}
                right={<span className="flex shrink-0 items-center gap-1.5">
                  {f.overdue > 0 ? <Pill tone="rust">{rupees(f.overdue)}</Pill> : <Pill tone="forest" icon={Check}>Up to date</Pill>}
                  <ChevronRight size={15} className="text-stone-l" />
                </span>} />
            ))}
          </MList>
        ) : (
          <EmptyState icon={Search} title={needle ? `No one matches “${q}”` : 'Every family is up to date'} body={needle ? 'Try a first name, a class like 9B, or an admission number.' : 'Nothing is overdue. A good month.'} />
        )}
        {shown.length > PAGE && <p className="mt-3 text-center text-[12.5px] text-stone">Showing {PAGE} of {shown.length}. Search to narrow down.</p>}
      </MSection>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name}>
        {open && <StudentFees key={open.id} student={open} />}
      </Sheet>
    </MobileScreen>
  )
}

function StudentFees({ student: s }: { student: Student }) {
  const d = useData()
  const toast = useToast()
  const f = feeStatus(s)
  const parent = d.parents.find(p => p.id === s.parentId)
  const history = d.feePayments.filter(p => p.studentId === s.id).sort((a, b) => b.at.localeCompare(a.at))
  const instalment = Math.min(f.balance, Math.round(s.feeTotal / 3))
  const presets = [
    f.overdue > 0 && { label: 'Overdue', amount: f.overdue },
    instalment > 0 && instalment !== f.overdue && { label: 'One instalment', amount: instalment },
    f.balance > 0 && f.balance !== f.overdue && { label: 'Full balance', amount: f.balance },
  ].filter((x): x is { label: string; amount: number } => !!x)

  const [amount, setAmount] = useState<number>(presets[0]?.amount ?? 0)
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<FeePayment['mode']>('UPI')
  const [receipt, setReceipt] = useState<FeePayment | null>(null)
  // after a payment the presets change; fall back to the first one rather than a stale amount
  const chosen = presets.some(p => p.amount === amount) ? amount : presets[0]?.amount ?? 0
  const value = custom ? Number(custom) : chosen
  const valid = value > 0 && value <= f.balance

  const record = () => {
    if (!valid) return
    d.recordPayment(s.id, value, mode, DEMO.adminId)
    // the store commits synchronously — read the receipt it just issued
    const issued = useSchool.getState().feePayments.filter(p => p.studentId === s.id).at(-1) ?? null
    setReceipt(issued)
    toast(`${rupees(value)} received for ${firstName(s.name)}`)
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {receipt ? (
        <Receipt key="receipt" payment={receipt} student={s} parentName={parent?.name ?? 'the family'} onAnother={() => { setReceipt(null); setCustom('') }} />
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <div className="text-[13.5px] text-stone">{s.classId} · Roll {s.rollNo} · {s.admissionNo}{s.scholarshipPct ? ` · ${s.scholarshipPct}% scholarship` : ''}</div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Fig label="Annual fee" value={rupeesShort(s.feeTotal)} />
            <Fig label="Paid" value={rupeesShort(s.feePaid)} className="text-forest" />
            <Fig label="Overdue" value={f.overdue ? rupeesShort(f.overdue) : '—'} className={f.overdue ? 'text-rust' : 'text-stone'} />
          </div>
          <Progress className="mt-3" value={f.paidPct} tone={f.overdue ? 'copper' : 'forest'} />

          {parent && (
            <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-ivory p-3">
              <Avatar name={parent.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-medium text-ink">{parent.name}</div>
                <div className="text-[12.5px] text-stone">{parent.relation} · {parent.phone}</div>
              </div>
              <a href={`tel:${parent.phone.replace(/\s/g, '')}`} aria-label={`Call ${parent.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-forest"><Phone size={16} /></a>
            </div>
          )}

          {f.balance > 0 ? (
            <>
              <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Record a payment</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {presets.map(p => {
                  const on = !custom && chosen === p.amount
                  return (
                    <motion.button key={p.label} whileTap={{ scale: 0.96 }} onClick={() => { setAmount(p.amount); setCustom('') }}
                      className={clsx('rounded-[12px] border px-3 py-2.5 text-left transition-colors', on ? 'border-forest bg-forest-p' : 'border-line bg-ivory')}>
                      <div className={clsx('text-[11.5px]', on ? 'text-forest' : 'text-stone')}>{p.label}</div>
                      <div className="font-display tabular text-[18px] text-ink">{rupees(p.amount)}</div>
                    </motion.button>
                  )
                })}
                <label className={clsx('rounded-[12px] border px-3 py-2.5', custom ? 'border-forest bg-forest-p' : 'border-line bg-ivory')}>
                  <div className="text-[11.5px] text-stone">Other amount</div>
                  <div className="flex items-center font-display text-[18px] text-ink">₹
                    <input inputMode="numeric" value={custom} onChange={e => setCustom(e.target.value.replace(/[^\d]/g, ''))} placeholder="0"
                      className="ml-0.5 w-full min-w-0 bg-transparent tabular outline-none placeholder:text-stone-l" aria-label="Other amount" />
                  </div>
                </label>
              </div>
              {custom && !valid && <p className="mt-1.5 text-[12.5px] text-rust">Enter up to {rupees(f.balance)} — the remaining balance.</p>}

              <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
                {MODES.map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={clsx('relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium', mode === m ? 'text-ivory' : 'border border-line bg-ivory text-charcoal-2')}>
                    {mode === m && <motion.span layoutId="fee-mode" className="absolute inset-0 rounded-full bg-ink" transition={softSpring} />}
                    <span className="relative">{m}</span>
                  </button>
                ))}
              </div>
              <Button block size="lg" className="mt-4" icon={ReceiptIndianRupee} disabled={!valid} onClick={record}>
                Record {valid ? rupees(value) : 'payment'} · {mode}
              </Button>
            </>
          ) : (
            <p className="mt-5 rounded-[12px] bg-forest-p px-4 py-3 text-[14px] text-forest">The year is fully paid. Nothing to collect.</p>
          )}

          {history.length > 0 && (
            <>
              <div className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Payments</div>
              <MList className="mt-2">
                {history.slice(0, 5).map(p => (
                  <MRow key={p.id} title={rupees(p.amount)} sub={`${dateLabel(p.at)} · ${p.mode} · ${p.receiptNo}`} />
                ))}
              </MList>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Fig = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className="rounded-[12px] bg-paper/70 py-2">
    <div className={clsx('font-display tabular text-[18px] leading-tight text-ink', className)}>{value}</div>
    <div className="text-[11.5px] text-stone">{label}</div>
  </div>
)

function Receipt({ payment: p, student: s, parentName, onAnother }: { payment: FeePayment; student: Student; parentName: string; onAnother: () => void }) {
  const f = feeStatus(s)
  return (
    <motion.div key="receipt" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }} className="pb-1">
      <div className="relative overflow-hidden rounded-[18px] border border-line bg-ivory px-5 pb-5 pt-6 text-center">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...softSpring, delay: 0.15 }}
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-ivory">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.35, ease: ease.out }} />
          </svg>
        </motion.span>
        <div className="mt-3 text-[12px] font-medium uppercase tracking-[0.14em] text-stone">Payment received</div>
        <div className="mt-1 font-display tabular text-[38px] leading-none text-ink">{rupees(p.amount)}</div>
        <div className="mt-1.5 text-[13.5px] text-charcoal-2">{s.name} · {s.classId}</div>
        <div className="my-4 border-t border-dashed border-stone-p" />
        <dl className="space-y-1.5 text-left text-[13.5px]">
          {[['Receipt', p.receiptNo], ['Mode', p.mode], ['Time', `${dateLabel(p.at)} · ${time(p.at)}`], ['Balance for the year', f.balance ? rupees(f.balance) : 'Fully paid']].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><dt className="text-stone">{k}</dt><dd className="tabular font-medium text-ink">{v}</dd></div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-center text-[13px] text-forest">Receipt sent to {parentName} in the parent app.</p>
      {f.balance > 0 && <Button block variant="outline" size="md" className="mt-3" onClick={onAnother}>Record another payment</Button>}
    </motion.div>
  )
}
