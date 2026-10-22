/* The nine-second register. Everyone starts present; tap a child to cycle Present → Absent → Late. */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Send, Timer } from 'lucide-react'
import { Avatar, Button, cx, ease, spring, useToast } from '@/components/ui'
import { MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useData } from '@/store/hooks'
import { useSchool } from '@/store/school'
import type { AttendanceMark } from '@/data/types'
import { firstName, time } from '@/lib/format'
import { ME, attendanceFlag } from './shared'

const NEXT: Record<AttendanceMark, AttendanceMark> = { P: 'A', A: 'L', L: 'P' }
const LOOK: Record<AttendanceMark, { bg: string; border: string; label: string; text: string; badge: string }> = {
  P: { bg: '#FDFCF8', border: '#E2DCD1', label: 'Present', text: 'text-ink', badge: 'bg-forest-p text-forest' },
  A: { bg: '#F5E3DF', border: '#A4483A', label: 'Absent', text: 'text-rust', badge: 'bg-rust text-ivory' },
  L: { bg: '#FBF0D9', border: '#E0A53F', label: 'Late', text: 'text-[#8a5f14]', badge: 'bg-amber text-ink' },
}

export function RegisterScreen({ classId }: { classId: string }) {
  const d = useData()
  const markRegister = useSchool(s => s.markRegister)
  const nav = useMobileNav()
  const toast = useToast()

  const cls = d.classes.find(c => c.id === classId)!
  const register = d.registers.find(r => r.classId === classId)
  const roster = useMemo(
    () => cls.studentIds.map(id => d.students.find(s => s.id === id)!).filter(Boolean).sort((a, b) => a.rollNo - b.rollNo),
    [cls, d.students],
  )
  const flags = useMemo(() => Object.fromEntries(roster.map(s => [s.id, attendanceFlag(d, s.id)])), [roster, d])
  const alreadyMarked = !!register?.markedAt

  const allPresent = () => Object.fromEntries(roster.map(s => [s.id, 'P' as AttendanceMark]))
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>(() =>
    alreadyMarked && register ? { ...allPresent(), ...register.marks } : allPresent(),
  )
  const [sent, setSent] = useState<null | { seconds: number; present: number; absent: number; late: number }>(null)

  // live stopwatch — starts the moment the roster appears
  const startedAt = useRef(performance.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (sent) return
    const t = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 100)
    return () => clearInterval(t)
  }, [sent])

  const counts = useMemo(() => {
    const v = Object.values(marks)
    return { P: v.filter(m => m === 'P').length, A: v.filter(m => m === 'A').length, L: v.filter(m => m === 'L').length }
  }, [marks])

  const flagged = roster.filter(s => flags[s.id])

  const send = () => {
    const seconds = (performance.now() - startedAt.current) / 1000
    markRegister(classId, marks, ME)
    setSent({ seconds, present: counts.P, absent: counts.A, late: counts.L })
    setTimeout(() => {
      nav.pop()
      toast(`${classId} register sent · ${counts.P + counts.L} in, ${counts.A} absent`)
    }, 2600)
  }

  return (
    <div className="relative h-full">
      <MobileScreen
        title={`${classId} register`}
        eyebrow={alreadyMarked ? `Sent at ${time(register!.markedAt!)} · corrections go to the same families` : `${roster.length} children · everyone starts present`}
        actions={
          <span className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[13px] font-semibold tabular text-ink" aria-label="Seconds elapsed">
            <Timer size={14} className="text-copper" />{elapsed.toFixed(1)}s
          </span>
        }
        footer={
          <Button block size="lg" icon={Send} onClick={send} disabled={!!sent}>
            {alreadyMarked ? 'Send correction' : 'Send register'} · {counts.P + counts.L} in{counts.A ? `, ${counts.A} absent` : ''}
          </Button>
        }
      >
        {/* running counts */}
        <div className="sticky top-0 z-10 -mx-4 bg-ivory/95 px-4 pb-3 pt-1 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {(['P', 'A', 'L'] as const).map(k => (
              <div key={k} className={cx('rounded-[14px] border px-3 py-2', k === 'P' ? 'border-forest/20 bg-forest-p' : k === 'A' ? 'border-rust/20 bg-rust-p' : 'border-amber/30 bg-amber-p')}>
                <div className={cx('text-[11.5px] font-medium uppercase tracking-[0.1em]', LOOK[k].text, k === 'P' && 'text-forest')}>{LOOK[k].label}</div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={counts[k]} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={spring}
                    className="font-display text-[26px] leading-none tabular text-ink">{counts[k]}</motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[12.5px] text-stone">Tap a child to mark absent, tap again for late.</p>
            <button onClick={() => setMarks(allPresent())} className="-mr-2 flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-forest">
              <RotateCcw size={14} /> All present
            </button>
          </div>
        </div>

        {flagged.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2 text-[12.5px] text-charcoal-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rust" />
            <span><b className="font-semibold text-ink">{flagged.map(s => firstName(s.name)).slice(0, 3).join(', ')}{flagged.length > 3 ? ` +${flagged.length - 3}` : ''}</b> — attendance worth a second look. A dot marks them below.</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {roster.map(s => {
            const m = marks[s.id]
            const flag = flags[s.id]
            return (
              <motion.button key={s.id} onClick={() => setMarks(x => ({ ...x, [s.id]: NEXT[x[s.id]] }))}
                whileTap={{ scale: 0.9 }}
                animate={{ backgroundColor: LOOK[m].bg, borderColor: LOOK[m].border }}
                transition={{ duration: 0.18, ease: ease.out }}
                aria-label={`${s.name}, roll ${s.rollNo}: ${LOOK[m].label}`}
                className="relative flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[14px] border px-1 py-2">
                <span className="relative">
                  <motion.span animate={{ scale: m === 'P' ? 1 : 0.92, opacity: m === 'A' ? 0.55 : 1 }} transition={spring} className="block">
                    <Avatar name={s.name} size={38} />
                  </motion.span>
                  {flag && <span className={cx('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-ivory-2', flag === 'risk' ? 'bg-rust' : 'bg-amber')} />}
                  <AnimatePresence>
                    {m !== 'P' && (
                      <motion.span key={m} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                        className={cx('absolute -bottom-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ring-2 ring-ivory-2', LOOK[m].badge)}>
                        {m}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={cx('w-full truncate text-center text-[12.5px] font-medium leading-tight', LOOK[m].text)}>{firstName(s.name)}</span>
                <span className="text-[10.5px] tabular text-stone">Roll {s.rollNo}</span>
              </motion.button>
            )
          })}
        </div>
      </MobileScreen>

      <AnimatePresence>{sent && <SentMoment classId={classId} families={roster.length} {...sent} />}</AnimatePresence>
    </div>
  )
}

function SentMoment({ classId, families, seconds, present, absent, late }: { classId: string; families: number; seconds: number; present: number; absent: number; late: number }) {
  const lines = ['The office', 'Dr. Meera Iyer', `${families} families`]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-forest px-8 text-center text-ivory">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-ivory/12 ring-1 ring-ivory/25">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
          <motion.path d="M12 25 L21 34 L37 15" stroke="#FDFCF8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.45, ease: ease.out }} />
        </svg>
      </motion.div>
      <motion.h2 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.5, ease: ease.out }}
        className="mt-7 font-display text-[30px] leading-tight text-ivory!">Sent to {families} families</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-1.5 font-display text-[19px] tabular text-ivory/80">
        {seconds.toFixed(1)} seconds
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 text-[14px] text-ivory/75">
        {classId} · {present} present{late ? ` · ${late} late` : ''}{absent ? ` · ${absent} absent` : ''}
      </motion.p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {lines.map((l, i) => (
          <motion.span key={l} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.8 + i * 0.22, ...spring }}
            className="inline-flex items-center gap-1.5 rounded-full bg-ivory/12 px-3 py-1.5 text-[13px] text-ivory">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {l}
          </motion.span>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="mt-8 text-[14px] text-ivory/70">You can start teaching.</motion.p>
    </motion.div>
  )
}
