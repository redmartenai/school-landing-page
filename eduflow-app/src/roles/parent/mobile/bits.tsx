/* Small building blocks shared by the parent screens. */
import { AnimatePresence, motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, cx, ease, spring, toneClass, type Tone } from '@/components/ui'
import { firstName } from '@/lib/format'
import { useParentScope } from './data'
import { useParentCtx } from './context'

/** Pill segmented control: Ananya / Vihaan, with avatar and class. */
export function ChildSwitcher({ className }: { className?: string }) {
  const { children } = useParentScope()
  const { childId, setChildId } = useParentCtx()
  const group = useId()
  if (children.length < 2) return null
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={cx('flex gap-1 rounded-full border border-line bg-paper p-1', className)} role="tablist" aria-label="Choose child">
      {children.map(c => {
        const on = c.id === childId
        return (
          <button key={c.id} role="tab" aria-selected={on} onClick={() => setChildId(c.id)}
            className="relative flex min-h-[44px] flex-1 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-left">
            {on && <motion.span layoutId={`child-pill-${group}`} className="absolute inset-0 rounded-full bg-ivory-2 shadow-1 ring-1 ring-line" transition={spring} />}
            <span className="relative"><Avatar name={c.name} size={32} /></span>
            <span className="relative min-w-0">
              <span className={cx('block truncate text-[14.5px] font-semibold leading-tight transition-colors', on ? 'text-ink' : 'text-stone')}>{firstName(c.name)}</span>
              <span className="block text-[11.5px] leading-tight text-stone">Class {c.classId}</span>
            </span>
          </button>
        )
      })}
    </motion.div>
  )
}

/** Crossfade child-dependent content when the selected child changes. */
export function ChildFade({ children }: { children: ReactNode }) {
  const { childId } = useParentCtx()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={childId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.26, ease: ease.out }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function ToneIcon({ icon: Icon, tone, size = 36 }: { icon: LucideIcon; tone: Tone; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center rounded-full', toneClass[tone].bg, toneClass[tone].text)}>
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} />
    </span>
  )
}

export const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.out } },
}

/** Paper card for mobile. */
export function MCard({ children, className, onClick, tone }: { children: ReactNode; className?: string; onClick?: () => void; tone?: Tone }) {
  const C = onClick ? motion.button : motion.div
  return (
    <C variants={item} onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined}
      className={cx('block w-full rounded-[16px] border p-4 text-left shadow-1', tone ? `${toneClass[tone].bg} border-transparent` : 'border-line bg-ivory-2', className)}>
      {children}
    </C>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-[11px] font-medium uppercase tracking-[0.14em] text-stone', className)}>{children}</div>
}
