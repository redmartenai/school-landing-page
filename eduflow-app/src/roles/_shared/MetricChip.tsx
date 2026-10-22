import clsx from 'clsx'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp, toneClass, type Tone } from '@/components/ui'

/**
 * A compact, glanceable number for phone dashboards.
 * The dot carries the meaning (forest good · amber waiting · copper attention · rust critical).
 */
export function MetricChip({ label, value, sub, tone = 'forest', onClick, className }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; className?: string
}) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp variants={fadeUp} whileTap={onClick ? { scale: 0.96 } : undefined} onClick={onClick}
      className={clsx('flex min-w-0 flex-col rounded-[14px] border border-line bg-ivory-2 px-3 py-2.5 text-left shadow-1', className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-stone">
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', toneClass[tone].dot)} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 font-display tabular text-[22px] leading-none text-ink">{value}</span>
      {sub && <span className="mt-1 truncate text-[11.5px] text-stone">{sub}</span>}
    </Comp>
  )
}
