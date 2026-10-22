import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { Check, Clock, UserX } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, Pill, cx, spring, useToast } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { RULES } from '@/engine/monitoring'
import { firstName, hoursBetween } from '@/lib/format'
import { BASE, HEX, ME, staffToday, useNameOf } from './shared'

type TileState = 'absent-teacher' | 'overdue' | 'awaiting' | 'marked'
const ORDER: Record<TileState, number> = { 'absent-teacher': 0, overdue: 1, awaiting: 2, marked: 3 }

const PALETTE: Record<TileState, { bg: string; border: string; ink: string }> = {
  'absent-teacher': { bg: HEX.rustP, border: HEX.rust, ink: HEX.rust },
  overdue: { bg: HEX.copperP, border: HEX.copper, ink: '#96602D' },
  awaiting: { bg: HEX.amberP, border: HEX.amber, ink: '#8a5f14' },
  marked: { bg: HEX.forestP, border: '#C9DCD4', ink: HEX.forest },
}

export function Wall() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const nudge = useSchool(s => s.nudge)
  const toast = useToast()
  const navigate = useNavigate()
  const today = d.school.today
  const hm = now.slice(11, 16)

  const tiles = useMemo(() => {
    const classOrder = d.classes.map(c => c.id)
    return d.classes.map(c => {
      const r = d.registers.find(x => x.classId === c.id)
      const ct = d.staff.find(s => s.id === c.classTeacherId)
      const ctDay = ct ? staffToday(ct, today) : null
      const ctAway = ctDay?.status === 'absent' || ctDay?.status === 'leave'
      const marks = r ? Object.values(r.marks) : []
      const present = marks.filter(m => m !== 'A').length
      const state: TileState = r?.markedAt ? 'marked' : ctAway ? 'absent-teacher' : hm >= RULES.registerBy ? 'overdue' : 'awaiting'
      return { c, r, ct, ctAway, present, total: c.studentIds.length, state }
    }).sort((a, b) => ORDER[a.state] - ORDER[b.state] || classOrder.indexOf(a.c.id) - classOrder.indexOf(b.c.id))
  }, [d.classes, d.registers, d.staff, today, hm])

  const marked = tiles.filter(t => t.state === 'marked').length
  const lateBy = Math.max(0, Math.round(hoursBetween(`${today}T${RULES.registerBy}:00`, now) * 60))

  const act = (t: (typeof tiles)[number]) => {
    if (t.state === 'marked') { navigate(`${BASE}/attendance`); return }
    if (t.state === 'absent-teacher') { navigate(`${BASE}/staff?t=${t.c.classTeacherId}`); return }
    nudge(t.c.classTeacherId, `Register for ${t.c.id}`, `Class ${t.c.id} hasn't taken the register yet. Parents are waiting to hear their child is safe. — Dr. Iyer`, ME)
    toast(`Reminded ${nameOf(t.c.classTeacherId)} about ${t.c.id}`)
  }

  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="One wall. One glance." title="Classrooms right now"
        action={<Pill tone={marked === tiles.length ? 'forest' : 'copper'} dot>{marked}/{tiles.length} in</Pill>} />
      <LayoutGroup>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2">
          {tiles.map(t => {
            const p = PALETTE[t.state]
            return (
              <motion.button
                key={t.c.id}
                layout
                transition={{ layout: spring }}
                onClick={() => act(t)}
                initial={false}
                animate={{ backgroundColor: p.bg, borderColor: p.border }}
                style={{ borderWidth: 1, borderStyle: 'solid' }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative min-h-[92px] overflow-hidden rounded-[12px] p-3 text-left"
                title={t.state === 'marked' ? 'Open attendance' : t.state === 'absent-teacher' ? 'Class teacher is away — find cover' : `Remind ${nameOf(t.c.classTeacherId)}`}
              >
                {t.state === 'awaiting' && (
                  <motion.span className="pointer-events-none absolute inset-0 rounded-[12px] border-2" style={{ borderColor: HEX.amber }}
                    animate={{ opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
                )}
                <div className="flex items-start justify-between gap-1">
                  <motion.span layout="position" className="font-display text-[22px] leading-none" animate={{ color: p.ink }}>{t.c.id}</motion.span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={t.state} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring}
                      className="grid h-5 w-5 place-items-center rounded-full text-ivory" style={{ background: p.border === '#C9DCD4' ? HEX.forest : p.border }}>
                      {t.state === 'marked' ? <Check size={12} strokeWidth={3} /> : t.state === 'absent-teacher' ? <UserX size={11} strokeWidth={2.4} /> : <Clock size={11} strokeWidth={2.4} />}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="mt-2.5 text-[12.5px] font-medium" style={{ color: p.ink }}>
                  {t.state === 'marked' && <><span className="tabular">{t.present}/{t.total}</span> in · {t.r?.markedAt?.slice(11, 16)}</>}
                  {t.state === 'overdue' && <>Waiting · {lateBy} min late</>}
                  {t.state === 'awaiting' && <>Awaiting teacher</>}
                  {t.state === 'absent-teacher' && <>Needs cover</>}
                </div>
                <div className={cx('truncate text-[11.5px] text-stone')}>
                  {t.state === 'marked' && t.r?.markedBy && t.r.markedBy !== t.c.classTeacherId
                    ? `Covered by ${firstName(nameOf(t.r.markedBy))}`
                    : t.ctAway ? `${nameOf(t.c.classTeacherId)} is away` : nameOf(t.c.classTeacherId)}
                </div>
              </motion.button>
            )
          })}
        </div>
      </LayoutGroup>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-stone">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-l" />Marked</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />Awaiting teacher</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-copper" />Past {RULES.registerBy} · tap to remind</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rust" />Teacher away</span>
      </div>
    </Card>
  )
}
