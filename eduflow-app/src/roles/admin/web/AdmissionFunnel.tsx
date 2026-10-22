import { motion } from 'framer-motion'
import { cx, ease, toneClass } from '@/components/ui'
import type { Admission } from '@/data/types'
import { STAGES } from './shared'

const PIPE = STAGES.filter(s => s.id !== 'dropped')

/** How many families reached each stage (dropped families count only as enquiries). */
export function funnelStats(list: Admission[]) {
  const idx = (a: Admission) => PIPE.findIndex(s => s.id === a.stage)
  const steps = PIPE.map((s, i) => ({ ...s, reached: list.filter(a => (i === 0 ? true : a.stage !== 'dropped' && idx(a) >= i)).length, at: list.filter(a => a.stage === s.id).length }))
  const total = list.length
  const enrolled = list.filter(a => a.stage === 'enrolled').length
  const dropped = list.filter(a => a.stage === 'dropped').length
  return { steps, total, enrolled, dropped, conversion: total ? enrolled / total : 0 }
}

export function FunnelBars({ list, compact }: { list: Admission[]; compact?: boolean }) {
  const { steps, total } = funnelStats(list)
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const w = total ? s.reached / total : 0
        const prev = i ? steps[i - 1].reached : s.reached
        const step = prev ? s.reached / prev : 0
        return (
          <div key={s.id} className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
            <span className="truncate text-[13px] text-charcoal">{s.label}</span>
            <div className={cx('relative overflow-hidden rounded-[7px] bg-line-2', compact ? 'h-6' : 'h-8')}>
              <motion.div className={cx('h-full rounded-[7px]', toneClass[s.tone].dot)} initial={{ width: 0 }} animate={{ width: `${Math.max(w * 100, 3)}%` }} transition={{ duration: 0.8, delay: i * 0.07, ease: ease.out }} />
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[12px] font-semibold tabular text-ink mix-blend-multiply">{s.reached}</span>
            </div>
            <span className="w-14 text-right text-[12px] tabular text-stone">{i === 0 ? `${s.at} new` : `${Math.round(step * 100)}%`}</span>
          </div>
        )
      })}
    </div>
  )
}
