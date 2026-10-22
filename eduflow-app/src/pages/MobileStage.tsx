import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Monitor, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PhoneFrame } from '@/components/shell/Mobile'
import { Logo } from '@/components/shell/Logo'
import { cx, ease, fadeUp, stagger } from '@/components/ui'
import { useSchool } from '@/store/school'
import type { RoleId } from '@/data/types'

const COPY: Record<RoleId, { who: string; title: string; story: string; tryThis: string[]; web?: string; watch?: { label: string; to: string } }> = {
  principal: {
    who: 'Dr. Meera Iyer · Principal', title: 'The school, in her pocket.',
    story: 'Between corridors she sees which classrooms are marked, what needs her signature, and who needs a nudge — and acts with one thumb.',
    tryThis: ['Swipe an approval right to approve it', 'Tap “Remind teachers” on an alert', 'Ask: “Who is absent today?”'], web: '/principal',
  },
  admin: {
    who: 'Rakesh Menon · Administrator', title: 'Fees, salaries and admissions — on the move.',
    story: 'Record a payment at the counter, process October payroll, move a family to the next admission stage. Every change is audited.',
    tryThis: ['Record a fee payment', 'Process October payroll', 'Remind all fee defaulters'], web: '/admin',
  },
  staff: {
    who: 'Ms. Kavya Rao · Mathematics · Class teacher 9B', title: 'Nine seconds, and she can start teaching.',
    story: 'The 9B register hasn’t been taken yet. When she sends it, 34 families know — and the principal’s wall turns green.',
    tryThis: ['Take the 9B register', 'Review homework that’s waiting', 'Reply to a parent'], watch: { label: 'Open the principal’s wall alongside', to: '/principal' },
  },
  parent: {
    who: 'Sunita Kulkarni · Mother of Ananya & Vihaan', title: 'Her phone buzzes once. She just knows.',
    story: 'Bus reached, marked present, homework up, a kind note from the teacher. And a gentle flag when something about Vihaan is worth a look.',
    tryThis: ['Switch between Ananya and Vihaan', 'Watch Bus 17 on the map', 'Pay Vihaan’s overdue fee'], watch: { label: 'Open Ms. Rao’s phone alongside', to: '/m/staff' },
  },
  student: {
    who: 'Ananya Kulkarni · 9B · Willow House', title: 'It feels like it belongs to her.',
    story: 'Her streak, her house points, the countdown to Monday’s paper — and lessons and quizzes she can actually finish on the bus.',
    tryThis: ['Take the quadratic equations quiz', 'Continue a lesson', 'Submit Friday’s maths homework'],
  },
}

export function MobileStage({ role, children }: { role: RoleId; children: ReactNode }) {
  const c = COPY[role]
  const reset = useSchool(s => s.reset)
  return (
    <div className="paper-grain min-h-dvh bg-ivory md:flex md:items-center md:justify-center md:gap-16 md:px-8 md:py-10">
      <motion.aside initial="hidden" animate="show" variants={stagger(0.06)} className="hidden max-w-[420px] md:block">
        <motion.div variants={fadeUp}><Link to="/" className="mb-10 inline-flex"><Logo /></Link></motion.div>
        <motion.div variants={fadeUp} className="text-[12px] font-medium uppercase tracking-[0.14em] text-copper">{c.who}</motion.div>
        <motion.h1 variants={fadeUp} className="mt-3 font-display text-[40px] leading-[1.06]">{c.title}</motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-[16px] leading-relaxed text-charcoal-2">{c.story}</motion.p>
        <motion.div variants={fadeUp} className="mt-7 rounded-[14px] border border-line bg-ivory-2 p-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">Try this</div>
          <ol className="space-y-2">
            {c.tryThis.map((t, i) => (
              <li key={t} className="flex items-center gap-3 text-[14.5px] text-ink">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-p text-[12px] font-semibold text-forest">{i + 1}</span>{t}
              </li>
            ))}
          </ol>
        </motion.div>
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2 text-[13.5px]">
          {c.web && <Link to={c.web} className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-ivory-2 px-3 py-2 text-charcoal hover:bg-paper"><Monitor size={15} /> Web version</Link>}
          {c.watch && <a href={c.watch.to} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-ivory-2 px-3 py-2 text-charcoal hover:bg-paper"><ExternalLink size={15} /> {c.watch.label}</a>}
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-stone hover:bg-paper hover:text-ink"><RotateCcw size={14} /> Reset demo</button>
        </motion.div>
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-1.5">
          {(['principal', 'admin', 'staff', 'parent', 'student'] as RoleId[]).map(r => (
            <Link key={r} to={`/m/${r}`} className={cx('rounded-full px-3 py-1 text-[12.5px] capitalize transition-colors', r === role ? 'bg-ink text-ivory' : 'text-stone hover:bg-paper hover:text-ink')}>{r === 'staff' ? 'teacher' : r}</Link>
          ))}
          <Link to="/" className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] text-stone hover:bg-paper hover:text-ink"><ArrowLeft size={12} /> All roles</Link>
        </motion.div>
      </motion.aside>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: ease.out, delay: 0.1 }}>
        <PhoneFrame>{children}</PhoneFrame>
      </motion.div>
    </div>
  )
}
