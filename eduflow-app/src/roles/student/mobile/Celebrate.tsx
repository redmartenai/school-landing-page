/* A one-shot "you earned it" moment. Motion shows causality: the points fly out of the thing she finished. */
import { AnimatePresence, motion } from 'framer-motion'
import { useContext, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Leaf } from 'lucide-react'
import { OverlayRootContext } from '@/components/ui'

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  return { x: Math.cos(a) * 92, y: Math.sin(a) * 92, d: i % 2 ? 6 : 4, c: i % 3 === 0 ? '#B4763A' : '#417A66' }
})

export function Celebrate({ open, points, title, sub, onDone }: { open: boolean; points: number; title: string; sub?: string; onDone: () => void }) {
  const root = useContext(OverlayRootContext)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => done.current(), 2600)
    return () => clearTimeout(t)
  }, [open])
  if (!root) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-[55] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onDone}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]" />
          <motion.div initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative w-[268px] rounded-[26px] border border-line bg-ivory-2 px-6 pb-6 pt-8 text-center shadow-3">
            <div className="relative mx-auto grid h-[84px] w-[84px] place-items-center">
              {SPARKS.map((s, i) => (
                <motion.span key={i} className="absolute rounded-full" style={{ width: s.d, height: s.d, backgroundColor: s.c }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }} animate={{ x: s.x * 0.62, y: s.y * 0.62, opacity: [0, 1, 0], scale: 1 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.012, ease: [0.16, 1, 0.3, 1] }} />
              ))}
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.05 }}
                className="grid h-[84px] w-[84px] place-items-center rounded-full bg-forest-p text-forest ring-8 ring-forest-p/50">
                <Leaf size={34} strokeWidth={1.7} />
              </motion.span>
            </div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="mt-4 font-display text-[34px] leading-none text-forest">+{points}</div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-stone">house points · Willow</div>
              <div className="mt-3 font-display text-[18px] leading-snug text-ink">{title}</div>
              {sub && <div className="mt-1 text-[13px] text-stone">{sub}</div>}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    root,
  )
}
