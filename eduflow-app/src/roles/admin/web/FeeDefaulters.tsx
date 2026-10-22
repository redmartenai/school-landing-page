import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, Check, CircleCheck, Minus, Phone } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, Pill, cx, listItem, spring, useToast } from '@/components/ui'
import { useData } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { RULES, feeStatus } from '@/engine/monitoring'
import { ago, daysBetween, rupees } from '@/lib/format'
import { ADMIN_ID, Segmented, nameOf } from './shared'
import { StudentFeeSheet } from './StudentFeeSheet'

function Check3({ state, onClick, label }: { state: 'on' | 'off' | 'some'; onClick: () => void; label: string }) {
  return (
    <button role="checkbox" aria-checked={state === 'some' ? 'mixed' : state === 'on'} aria-label={label} onClick={e => { e.stopPropagation(); onClick() }}
      className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition-colors', state === 'off' ? 'border-stone-p bg-ivory-2 hover:border-stone' : 'border-forest bg-forest text-ivory')}>
      <AnimatePresence>
        {state !== 'off' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>
            {state === 'on' ? <Check size={13} strokeWidth={3} /> : <Minus size={13} strokeWidth={3} />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export function FeeDefaulters() {
  const d = useData()
  const remind = useSchool(s => s.remindFees)
  const toast = useToast()
  const [band, setBand] = useState<'all' | 'high'>('all')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => d.students
    .map(s => ({ s, f: feeStatus(s) }))
    .filter(x => x.f.overdue > (band === 'high' ? RULES.feeOverdue : 0))
    .sort((a, b) => b.f.overdue - a.f.overdue), [d.students, band])

  // when was each family last reminded? (from the parent's fee notifications)
  const lastReminder = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of d.notifications) if (n.kind === 'fees' && n.studentId && n.title.startsWith('Fee reminder') && !m.has(n.studentId)) m.set(n.studentId, n.at)
    return m
  }, [d.notifications])

  const visibleSel = rows.filter(r => sel.has(r.s.id))
  const all = rows.length > 0 && visibleSel.length === rows.length
  const selTotal = visibleSel.reduce((a, r) => a + r.f.overdue, 0)
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const daysLate = daysBetween('2026-09-15', d.school.today)

  const send = () => {
    const ids = visibleSel.map(r => r.s.id)
    remind(ids, ADMIN_ID)
    toast(`Reminders sent to ${ids.length} famil${ids.length === 1 ? 'y' : 'ies'} · ${rupees(selTotal)} outstanding`, 'copper')
    setSel(new Set())
  }

  return (
    <Card padded={false}>
      <div className="flex flex-col gap-3 border-b border-line-2 p-4 sm:flex-row sm:items-center md:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] leading-tight">{rows.length} famil{rows.length === 1 ? 'y' : 'ies'} owe {rupees(rows.reduce((a, r) => a + r.f.overdue, 0))}</h3>
          <p className="text-[13px] text-stone">Term 2 was due 15 September — {daysLate} days ago. A reminder lands on the parent's phone instantly.</p>
        </div>
        <Segmented id="def-band" value={band} onChange={v => { setBand(v); setSel(new Set()) }} options={[{ value: 'all', label: 'Any overdue' }, { value: 'high', label: `Over ${rupees(RULES.feeOverdue)}` }]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nobody is overdue" body="Every family has paid the instalments due so far." />
      ) : (
        <>
          <div className="sticky top-16 z-10 flex items-center gap-3 border-b border-line-2 bg-ivory-2/95 px-4 py-2.5 backdrop-blur md:px-5">
            <Check3 label="Select all" state={all ? 'on' : visibleSel.length ? 'some' : 'off'} onClick={() => setSel(all ? new Set() : new Set(rows.map(r => r.s.id)))} />
            <span className="flex-1 text-[13px] text-stone">
              {visibleSel.length ? <><span className="font-medium text-ink">{visibleSel.length} selected</span> · {rupees(selTotal)}</> : 'Select families to remind'}
            </span>
            <AnimatePresence>
              {visibleSel.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <Button size="sm" variant="copper" icon={BellRing} onClick={send}>Send reminder{visibleSel.length > 1 ? 's' : ''}</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="px-4 md:px-5">
            <AnimatePresence initial={false}>
              {rows.map(({ s, f }) => {
                const on = sel.has(s.id)
                const reminded = lastReminder.get(s.id)
                return (
                  <motion.div key={s.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" onClick={() => toggle(s.id)}
                    className={cx('-mx-2 flex cursor-pointer items-center gap-3 rounded-[10px] border-b border-line-2 px-2 py-3 transition-colors last:border-0', on ? 'bg-copper-p/40' : 'hover:bg-paper/60')}>
                    <Check3 label={`Select ${s.name}`} state={on ? 'on' : 'off'} onClick={() => toggle(s.id)} />
                    <Avatar name={s.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <button onClick={e => { e.stopPropagation(); setOpen(s.id) }} className="truncate font-medium text-ink hover:underline">{s.name}</button>
                        <span className="text-[12px] text-stone">{s.classId}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-stone">
                        <span className="inline-flex items-center gap-1"><Phone size={11} /> {nameOf(d, s.parentId)}</span>
                        <span>· paid {Math.round(f.paidPct * 100)}%</span>
                        {reminded && <span className="text-copper-d">· reminded {ago(reminded)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular text-rust">{rupees(f.overdue)}</div>
                      {f.overdue > RULES.feeOverdue ? <Pill tone="rust" className="mt-0.5">Escalated</Pill> : <span className="text-[11.5px] text-stone">{daysLate} days late</span>}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      )}
      <StudentFeeSheet studentId={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
