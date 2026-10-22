import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Receipt } from 'lucide-react'
import { Avatar, Card, CardHeader, EmptyState, cx, ease, listItem } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { ago, dateLabel, rupees, rupeesShort } from '@/lib/format'
import { PAY_MODES } from './shared'

const DAYS = 30
const shift = (iso: string, n: number) => {
  const dt = new Date(iso + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toLocaleDateString('en-CA')
}

/** Daily collections, one series → one hue (forest), hover for exact values. */
function DailyBars({ data }: { data: { day: string; value: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map(d => d.value), 1)
  const H = 200
  const ticks = [max, max / 2].map(v => ({ v, y: H - (v / max) * H }))
  return (
    <div className="relative">
      <div className="relative flex gap-3">
        <div className="relative w-10 shrink-0 text-right text-[11px] tabular text-stone" style={{ height: H }}>
          {ticks.map(t => <span key={t.v} className="absolute right-0 -translate-y-1/2" style={{ top: t.y }}>{rupeesShort(Math.round(t.v))}</span>)}
          <span className="absolute bottom-0 right-0 translate-y-1/2">₹0</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: H }} onMouseLeave={() => setHover(null)}>
          {ticks.map(t => <div key={t.v} className="absolute inset-x-0 border-t border-dashed border-line-2" style={{ top: t.y }} />)}
          <div className="absolute inset-x-0 bottom-0 border-t border-line" />
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.day} className="relative flex h-full min-w-0 flex-1 items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${dateLabel(d.day)}: ${rupees(d.value)}`}>
                <motion.div
                  className={cx('w-full rounded-t-[4px] transition-colors', d.day === data[data.length - 1].day ? 'bg-copper' : hover === i ? 'bg-forest-d' : 'bg-forest-l')}
                  initial={{ height: 0 }} animate={{ height: d.value ? Math.max(2, (d.value / max) * H) : 0 }} transition={{ duration: 0.7, delay: i * 0.015, ease: ease.out }} />
              </div>
            ))}
          </div>
          <AnimatePresence>
            {hover !== null && (
              <motion.div key="tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[9px] bg-ink px-2.5 py-1.5 text-[12px] text-ivory shadow-2"
                style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / data.length) * 100))}%` }}>
                <div className="font-medium">{dateLabel(data[hover].day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="tabular text-stone-p">{rupees(data[hover].value)} · {data[hover].count} receipt{data[hover].count === 1 ? '' : 's'}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="ml-[52px] mt-2 flex justify-between text-[11px] text-stone">
        {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map(d => <span key={d.day}>{dateLabel(d.day)}</span>)}
      </div>
    </div>
  )
}

export function FeeCollections() {
  const d = useData()
  const now = useNow()
  const today = now.slice(0, 10)

  const { daily, modes, total, recent } = useMemo(() => {
    const from = shift(today, -(DAYS - 1))
    const win = d.feePayments.filter(p => p.at.slice(0, 10) >= from && p.at.slice(0, 10) <= today)
    const daily = Array.from({ length: DAYS }, (_, i) => {
      const day = shift(from, i)
      const ps = win.filter(p => p.at.startsWith(day))
      return { day, value: ps.reduce((a, p) => a + p.amount, 0), count: ps.length }
    })
    const total = win.reduce((a, p) => a + p.amount, 0)
    const modes = PAY_MODES.map(m => {
      const ps = win.filter(p => p.mode === m)
      return { mode: m, value: ps.reduce((a, p) => a + p.amount, 0), count: ps.length }
    }).sort((a, b) => b.value - a.value)
    const recent = [...d.feePayments].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
    return { daily, modes, total, recent }
  }, [d.feePayments, today])

  const best = daily.reduce((a, b) => (b.value > a.value ? b : a), daily[0])
  const studentOf = (id: string) => d.students.find(s => s.id === id)

  return (
    <>
      <Card>
        <CardHeader eyebrow="Last 30 days" title={`${rupees(total)} collected`}
          action={<span className="text-[12.5px] text-stone">Busiest: {dateLabel(best.day)} · {rupeesShort(best.value)}</span>} />
        <DailyBars data={daily} />
        <p className="mt-3 text-[12px] text-stone"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-copper align-middle" /> Today, still counting.</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="How families pay" title="Mode split · last 30 days" />
          {total === 0 ? <EmptyState icon={Receipt} title="No collections in this window" /> : (
            <div className="space-y-3.5">
              {modes.map((m, i) => (
                <div key={m.mode}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="text-charcoal">{m.mode} <span className="text-stone">· {m.count}</span></span>
                    <span className="tabular text-ink">{rupees(m.value)} <span className="text-stone">· {Math.round((m.value / total) * 100)}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line-2">
                    <motion.div className="h-full rounded-full bg-forest-l" initial={{ width: 0 }} animate={{ width: `${(m.value / total) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06, ease: ease.out }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Live" title="Latest receipts" />
          {recent.length === 0 && <EmptyState icon={Receipt} title="No receipts yet" />}
          <AnimatePresence initial={false}>
            {recent.map(p => {
              const s = studentOf(p.studentId)
              return (
                <motion.div key={p.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <Avatar name={s?.name ?? '?'} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] text-ink">{s?.name ?? 'Unknown'} <span className="text-stone">· {s?.classId}</span></div>
                    <div className="text-[12px] text-stone">{p.receiptNo} · {p.mode} · {ago(p.at, now)}</div>
                  </div>
                  <span className="font-medium tabular text-forest">{rupees(p.amount)}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </Card>
      </div>
    </>
  )
}
