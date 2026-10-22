import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PhoneFrame } from '@/components/shell/Mobile'
import { LogoMark } from '@/components/shell/Logo'
import { LiveDot, cx, ease, spring } from '@/components/ui'
import { StaffMobileApp } from '@/roles/staff/mobile'
import { ParentMobileApp } from '@/roles/parent/mobile'
import { PrincipalMobileApp } from '@/roles/principal/mobile'
import { useSchool, DEMO } from '@/store/school'
import { useNow } from '@/store/hooks'
import { ago } from '@/lib/format'

/**
 * One morning, three phones. The whole point of EduFlow in a single screen:
 * a teacher acts → the parent is told → the principal sees it. Same store, no refresh.
 */
export function LiveDemo() {
  const marked = useSchool(s => !!s.registers.find(r => r.classId === '9B')?.markedAt)
  const parentTold = useSchool(s => s.notifications.some(n => n.audience.id === DEMO.parentId && n.kind === 'attendance' && n.studentId === DEMO.studentId))
  const events = useSchool(s => s.events)
  const reset = useSchool(s => s.reset)
  const now = useNow()

  const steps = [
    { done: marked, title: 'Ms. Rao takes the 9B register', sub: 'Teacher’s phone · Today → Take the register' },
    { done: parentTold, title: 'Sunita’s phone buzzes', sub: 'Parent’s phone · “Ananya marked present”' },
    { done: marked, title: 'The principal’s wall turns green', sub: 'Principal’s phone · Wall' },
  ]

  const phones = [
    { label: 'Teacher', who: 'Ms. Kavya Rao', node: <StaffMobileApp /> },
    { label: 'Parent', who: 'Sunita Kulkarni', node: <ParentMobileApp /> },
    { label: 'Principal', who: 'Dr. Meera Iyer', node: <PrincipalMobileApp /> },
  ]

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-[14px] text-stone hover:text-ink"><ArrowLeft size={16} /> <LogoMark size={24} /> EduFlow</Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-line bg-ivory-2 px-3 py-1.5 text-[12.5px]"><LiveDot /> One morning at Greenfield · <span className="tabular">{now.slice(11, 16)}</span></span>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ivory-2 px-3 py-1.5 text-[12.5px] text-charcoal-2 hover:bg-ivory"><RotateCcw size={13} /> Start over</button>
        </div>
      </header>

      <div className="px-5 md:px-8">
        <h1 className="font-display text-[30px] leading-tight md:text-[38px]">Watch one action ripple through the school.</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-stone">Three people, three phones, one school. Nothing here refreshes — it’s the same live data, seen from three places.</p>

        <ol className="mt-5 grid gap-2 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li key={i} layout className={cx('flex items-center gap-3 rounded-[14px] border px-4 py-3 transition-colors duration-500', s.done ? 'border-forest/25 bg-forest-p' : 'border-line bg-ivory-2')}>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors duration-500', s.done ? 'bg-forest text-ivory' : 'bg-paper text-stone')}>
                <AnimatePresence mode="wait" initial={false}>
                  {s.done
                    ? <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Check size={16} strokeWidth={3} /></motion.span>
                    : <motion.span key="n" exit={{ scale: 0 }}>{i + 1}</motion.span>}
                </AnimatePresence>
              </span>
              <div>
                <div className="text-[14.5px] font-medium text-ink">{s.title}</div>
                <div className="text-[12.5px] text-stone">{s.sub}</div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="no-scrollbar mt-6 overflow-x-auto pb-6">
        <div className="mx-auto flex w-max gap-8 px-5 md:px-8">
          {phones.map((p, i) => (
            <motion.div key={p.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12, duration: 0.7, ease: ease.out }} className="flex flex-col items-center">
              <div className="mb-3 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">{p.label}</div>
                <div className="text-[13px] text-stone">{p.who}</div>
              </div>
              <PhoneFrame framed scale={0.82}>{p.node}</PhoneFrame>
            </motion.div>
          ))}
          <div className="w-[300px] shrink-0 self-stretch pt-10">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone">What the school just saw</div>
            {events.length === 0 && <p className="text-[14px] text-stone">Nothing yet. Start on the teacher’s phone — take the 9B register.</p>}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {events.slice(0, 12).map(e => (
                  <motion.div key={e.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: ease.out }}
                    className="rounded-[12px] border border-line bg-ivory-2 px-3.5 py-2.5">
                    <div className="text-[13.5px] text-ink">{e.text}</div>
                    <div className="text-[11.5px] text-stone">{ago(e.at, now)}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
