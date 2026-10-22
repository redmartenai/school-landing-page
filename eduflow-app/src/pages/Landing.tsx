import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Briefcase, GraduationCap, HeartHandshake, Monitor, Radio, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/shell/Logo'
import { LiveDot, Pill, ease, fadeUp, severityTone, stagger, toneClass, cx } from '@/components/ui'
import { useAlerts, useNow, usePulse } from '@/store/hooks'
import { dateLabel } from '@/lib/format'

interface RoleCard { id: string; name: string; person: string; line: string; icon: LucideIcon; web?: string; mobile: string; tone: 'forest' | 'copper' | 'slate' | 'amber' }

const ROLES: RoleCard[] = [
  { id: 'principal', name: 'Principal', person: 'Dr. Meera Iyer', line: 'One wall, one glance. The Monitoring Center tells her what needs her before assembly ends.', icon: ShieldCheck, web: '/principal', mobile: '/m/principal', tone: 'forest' },
  { id: 'admin', name: 'Administrator', person: 'Rakesh Menon', line: 'Fees, salaries, admissions and who-can-see-what — every change logged.', icon: Briefcase, web: '/admin', mobile: '/m/admin', tone: 'slate' },
  { id: 'staff', name: 'Teacher', person: 'Ms. Kavya Rao · 9B', line: 'Nine seconds for the register, and she can start teaching.', icon: BookOpen, mobile: '/m/staff', tone: 'copper' },
  { id: 'parent', name: 'Parent', person: 'Sunita Kulkarni', line: 'Her phone buzzes once. She reads it in nine seconds and goes back to her day.', icon: HeartHandshake, mobile: '/m/parent', tone: 'amber' },
  { id: 'student', name: 'Student', person: 'Ananya Kulkarni · 9B', line: 'Her streak, her house points, her lessons — it feels like it belongs to her.', icon: GraduationCap, mobile: '/m/student', tone: 'forest' },
]

const CHAIN = ['Owner', 'Principal', 'Staff', 'Student', 'Parent']

export function Landing() {
  const alerts = useAlerts()
  const pulse = usePulse()
  const now = useNow()
  const top = alerts.filter(a => !a.acknowledgedAt).slice(0, 4)

  return (
    <div className="paper-grain min-h-dvh bg-ivory">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-8">
        <span className="inline-flex items-center gap-2.5"><LogoMark /><span className="font-display text-[21px] text-ink">EduFlow</span></span>
        <div className="flex items-center gap-2 rounded-full border border-line bg-ivory-2 px-3 py-1.5 text-[12.5px] text-charcoal-2">
          <LiveDot /> Greenfield School · {dateLabel(now, { weekday: 'short', day: 'numeric', month: 'short' })} · <span className="tabular">{now.slice(11, 16)}</span>
        </div>
      </header>

      <motion.main initial="hidden" animate="show" variants={stagger(0.07)} className="mx-auto max-w-[1240px] px-5 pb-20 md:px-8">
        {/* hero */}
        <section className="grid items-end gap-10 pb-12 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
          <div>
            <motion.div variants={fadeUp} className="mb-4 text-[12px] font-medium uppercase tracking-[0.16em] text-copper">School Monitoring Intelligence</motion.div>
            <motion.h1 variants={fadeUp} className="font-display text-[44px] leading-[1.02] text-ink md:text-[68px]">
              Every morning<br />begins with <em className="text-forest">trust.</em>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-charcoal-2">
              EduFlow doesn’t just manage a school. It continuously watches over it — and tells the principal, the teacher and the parent
              <span className="text-ink"> what needs attention right now</span>, before it becomes a bigger problem.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/principal" className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-forest px-5 text-[15px] font-medium text-ivory shadow-[0_10px_24px_-12px_rgba(46,93,78,.8)] transition-colors hover:bg-forest-d">
                Enter as the principal <ArrowRight size={17} />
              </Link>
              <Link to="/live" className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-line bg-ivory-2 px-5 text-[15px] font-medium text-charcoal transition-colors hover:bg-paper">
                <Radio size={16} className="text-copper" /> Watch one morning, live
              </Link>
            </motion.div>
          </div>

          {/* live signal card */}
          <motion.div variants={fadeUp} className="rounded-[20px] border border-line bg-ivory-2 p-5 shadow-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-stone">Right now at Greenfield</div>
              <Pill tone="forest" dot>{pulse.registersMarked}/{pulse.registersTotal} registers in</Pill>
            </div>
            <div className="space-y-2">
              {top.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: ease.out }}
                  className="flex items-center gap-3 rounded-[12px] bg-paper/60 px-3.5 py-3">
                  <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', toneClass[severityTone[a.severity]].dot)} />
                  <span className="flex-1 text-[14px] text-ink">{a.headline}</span>
                  <span className="hidden text-[12px] text-stone sm:block">{a.owner}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 text-[13px] text-stone">Not reports. Signals — each with an owner, a reason and an escalation path.</div>
          </motion.div>
        </section>

        {/* chain */}
        <motion.section variants={fadeUp} className="mb-14 flex flex-wrap items-center gap-2 text-[14px]">
          <span className="mr-2 text-stone">The accountability chain</span>
          {CHAIN.map((c, i) => (
            <span key={c} className="flex items-center gap-2">
              <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="rounded-full border border-line bg-ivory-2 px-3.5 py-1.5 font-medium text-ink">{c}</motion.span>
              {i < CHAIN.length - 1 && <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }} className="h-px w-6 origin-left bg-stone-l" />}
            </span>
          ))}
        </motion.section>

        {/* roles */}
        <motion.div variants={fadeUp} className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-[30px] md:text-[36px]">Who’s walking in?</h2>
          <span className="hidden text-[13px] text-stone md:block">One school, five views. Every action reaches the others instantly.</span>
        </motion.div>
        <motion.section variants={stagger(0.06)} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLES.map(r => (
            <motion.article key={r.id} variants={fadeUp} whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: ease.out }}
              className="group flex flex-col rounded-[18px] border border-line bg-ivory-2 p-5 shadow-1 transition-shadow hover:shadow-2">
              <div className="mb-4 flex items-center justify-between">
                <span className={cx('grid h-11 w-11 place-items-center rounded-[12px]', toneClass[r.tone].bg, toneClass[r.tone].text)}><r.icon size={20} /></span>
                <span className="flex gap-1.5">
                  {r.web && <Pill tone="slate" icon={Monitor}>Web</Pill>}
                  <Pill tone="stone" icon={Smartphone}>Mobile</Pill>
                </span>
              </div>
              <h3 className="font-display text-[24px]">{r.name}</h3>
              <div className="text-[13px] text-stone">{r.person}</div>
              <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-charcoal-2">{r.line}</p>
              <div className="mt-5 flex gap-2">
                {r.web && (
                  <Link to={r.web} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-forest text-[14px] font-medium text-ivory transition-colors hover:bg-forest-d">
                    <Monitor size={15} /> Open web
                  </Link>
                )}
                <Link to={r.mobile} className={cx('inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-colors', r.web ? 'border border-line bg-ivory-2 text-charcoal hover:bg-paper' : 'bg-forest text-ivory hover:bg-forest-d')}>
                  <Smartphone size={15} /> Open app
                </Link>
              </div>
            </motion.article>
          ))}
          <motion.article variants={fadeUp} whileHover={{ y: -3 }} className="relative flex flex-col overflow-hidden rounded-[18px] bg-ink p-5 text-ivory shadow-2">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-copper/25 blur-2xl" />
            <div className="relative mb-4 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-copper-l"><LiveDot tone="copper" /> Live</div>
            <h3 className="relative font-display text-[24px] text-ivory">See it ripple</h3>
            <p className="relative mt-3 flex-1 text-[14.5px] leading-relaxed text-ivory/75">
              Three phones side by side. Ms. Rao takes the 9B register — Sunita’s phone buzzes and the principal’s wall turns green.
            </p>
            <Link to="/live" className="relative mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-copper text-[14px] font-medium text-ivory transition-colors hover:bg-copper-d">
              Start the morning <ArrowRight size={15} />
            </Link>
          </motion.article>
        </motion.section>

        {/* positioning */}
        <motion.section variants={fadeUp} className="mt-16 grid gap-4 border-t border-line pt-10 md:grid-cols-4">
          {[
            ['MyClassboard', 'manages school operations.'],
            ['Fedena', 'manages school records.'],
            ['Teachmint', 'manages teaching and learning.'],
          ].map(([n, l]) => (
            <div key={n} className="text-[15px] text-stone"><span className="font-medium text-charcoal">{n}</span> {l}</div>
          ))}
          <div className="text-[15px] text-ink"><span className="font-display text-[17px] text-forest">EduFlow</span> monitors the whole school and says what needs action — before problems become bigger.</div>
        </motion.section>
      </motion.main>
    </div>
  )
}
