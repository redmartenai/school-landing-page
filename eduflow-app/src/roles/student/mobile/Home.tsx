/* Home — a page that is hers: the streak, the house, the next paper, today's lessons, the last kind word. */
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Bell, BookOpen, ClipboardList, Clock, Leaf, MapPin, Quote } from 'lucide-react'
import { AnimatedNumber, EmptyState, IconButton, Sheet, cx } from '@/components/ui'
import { MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useNotifications, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { streak } from '@/engine/monitoring'
import { ago, dateLabel, firstName, greeting } from '@/lib/format'
import { lessonScreen } from './open'
import { useMyHomework } from './Homework'
import {
  HOUSE_STYLE, NEXT_EXAM, type DayCell, Panel, SubjectChip, countdown, minutesBetween, staffName, teacherShort,
  useAttendanceWeeks, useNowNext, useStudent,
} from './shared'

const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300]
const STRIP: Record<DayCell['mark'], string> = { P: 'bg-forest-l', L: 'bg-amber', A: 'bg-rust', today: 'border border-dashed border-copper', future: 'bg-line-2' }

export function HomeTab() {
  const { d, s, cls } = useStudent()
  const now = useNow()
  const nav = useMobileNav()
  const notes = useNotifications('student', s.id)
  const readNotifications = useSchool(st => st.readNotifications)
  const [bell, setBell] = useState(false)
  const unread = notes.filter(n => !n.read).length

  const run = streak(d, s)
  const goal = MILESTONES.find(m => m > run) ?? run + 50
  const prevGoal = [...MILESTONES].reverse().find(m => m <= run) ?? 0
  const todayMark = d.registers.find(r => r.classId === s.classId)?.marks[s.id] ?? null
  const strip = useAttendanceWeeks(3).flat().filter(c => c.mark !== 'future').slice(-12)

  // house standing within her grade (aggregate only — no other names)
  const house = useMemo(() => {
    const gradeClasses = new Set(d.classes.filter(c => c.grade === cls.grade).map(c => c.id))
    const grade = d.students.filter(x => gradeClasses.has(x.classId))
    const totals = new Map<string, number>()
    for (const x of grade) totals.set(x.house, (totals.get(x.house) ?? 0) + x.housePoints)
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const rank = ranked.findIndex(([h]) => h === s.house) + 1
    return { rank, of: ranked.length }
  }, [d.students, d.classes, cls.grade, s.house])
  const weekGain = 18 + (s.housePoints - 312)
  const hs = HOUSE_STYLE[s.house]

  const homework = useMyHomework()
  const due = homework.filter(h => h.submissions[s.id] === 'pending').sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const cd = countdown(NEXT_EXAM.at, now)
  const revise = d.lessons.find(l => l.classId === s.classId && l.subject === NEXT_EXAM.subject && l.kind === 'quiz')

  const { current, next, hm } = useNowNext(now)
  const praise = d.remarks.filter(r => r.studentId === s.id && r.tone === 'praise').sort((a, b) => b.at.localeCompare(a.at))[0]

  const closeBell = () => { setBell(false); if (unread) readNotifications('student', s.id) }

  return (
    <MobileScreen title={`${greeting(now)}, ${firstName(s.name)}`} eyebrow={`${dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })} · ${s.classId}`}
      actions={<IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => setBell(true)} />}>

      {/* streak hero */}
      <Panel className="paper-grain overflow-hidden p-5">
        <div className="flex items-center gap-5">
          <StreakRing value={(run - prevGoal) / (goal - prevGoal)}>
            <div className="font-display text-[46px] leading-none text-ink"><AnimatedNumber value={run} duration={1.4} /></div>
            <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-stone">days in a row</div>
          </StreakRing>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-forest">Your streak</div>
            <div className="mt-1 font-display text-[19px] leading-snug text-ink">{goal - run} more {goal - run === 1 ? 'day' : 'days'} to {goal}.</div>
            <div className="mt-1 text-[13px] leading-snug text-stone">
              {todayMark === 'P' || todayMark === 'L' ? 'Today is counted. Keep it going tomorrow.'
                : todayMark === 'A' ? 'Marked absent today — a new streak starts tomorrow.'
                  : `Today counts once ${teacherShort(staffName(d, cls.classTeacherId))} takes the register.`}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {strip.map((c, i) => (
            <motion.span key={c.date} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.035, type: 'spring', stiffness: 380, damping: 24 }}
              className={cx('h-2 flex-1 origin-bottom rounded-full', STRIP[c.mark])} title={c.date} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-stone"><span>Since {dateLabel(strip[0]?.date ?? now)}</span><span>Today</span></div>
      </Panel>

      {/* house + homework */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Panel className="p-4" onClick={() => nav.setTab('me')}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: hs.fg }}>
            <span className="grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: hs.bg }}><Leaf size={11} /></span>{s.house} House
          </div>
          <div className="mt-2 font-display text-[32px] leading-none text-ink"><AnimatedNumber value={s.housePoints} /></div>
          <div className="mt-0.5 text-[11.5px] text-stone">house points</div>
          <div className="mt-2 text-[12px] leading-snug text-charcoal-2">{ordinal(house.rank)} in Grade {cls.grade} · <span className="font-medium text-forest">up {weekGain} this week</span></div>
        </Panel>
        <Panel className="p-4" onClick={() => nav.setTab('homework')}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-stone"><ClipboardList size={14} /> Homework</div>
          <div className={cx('mt-2 font-display text-[32px] leading-none', due.length ? 'text-ink' : 'text-forest')}><AnimatedNumber value={due.length} /></div>
          <div className="mt-0.5 text-[11.5px] text-stone">{due.length ? 'to hand in' : 'all handed in'}</div>
          {due[0] && <div className="mt-2 truncate text-[12px] leading-snug text-charcoal-2"><span className={cx('font-medium', due[0].dueDate < now.slice(0, 10) ? 'text-rust' : 'text-copper-d')}>{due[0].subject === 'Mathematics' ? 'Maths' : due[0].subject}</span> · {dateLabel(due[0].dueDate, { weekday: 'long' })}</div>}
        </Panel>
      </div>

      {/* next exam */}
      <MSection title="Next paper">
        <Panel className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <div className="flex items-center gap-2"><SubjectChip subject={NEXT_EXAM.subject} /><span className="text-[12px] text-stone">Room {NEXT_EXAM.room}</span></div>
              <div className="mt-2 font-display text-[21px] leading-tight text-ink">{NEXT_EXAM.name} · {NEXT_EXAM.subject}</div>
              <div className="mt-0.5 text-[13px] text-stone">{dateLabel(NEXT_EXAM.at, { weekday: 'long', day: 'numeric', month: 'short' })} · {NEXT_EXAM.at.slice(11, 16)}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 px-4">
            {[{ v: cd.days, k: cd.days === 1 ? 'day' : 'days' }, { v: cd.hours, k: 'hours' }, { v: cd.minutes, k: 'min' }].map(x => (
              <div key={x.k} className="rounded-[12px] bg-copper-p px-2 py-2.5 text-center">
                <div className="h-[30px] overflow-hidden font-display text-[28px] leading-[30px] text-copper-d tabular">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={x.v} className="inline-block" initial={{ y: -26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 26, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                      {String(x.v).padStart(2, '0')}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="text-[11px] text-copper-d/80">{x.k}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 px-4 text-[12.5px] text-stone">Syllabus: {NEXT_EXAM.syllabus}</div>
          {revise && (
            <motion.button whileTap={{ scale: 0.99 }} onClick={() => nav.push(lessonScreen(revise))}
              className="mt-3 flex w-full items-center justify-between border-t border-line-2 px-4 py-3 text-left">
              <span className="text-[14px] font-medium text-forest">{(revise.progress[s.id] ?? 0) >= 100 ? 'Revise with the quick check again' : 'Revise with the 5-question quick check'}</span>
              <ArrowRight size={16} className="text-forest" />
            </motion.button>
          )}
        </Panel>
      </MSection>

      {/* today */}
      <MSection title="Today" action={<button onClick={() => nav.setTab('me')} className="text-[12.5px] font-medium text-forest">Full timetable</button>}>
        <Panel className="divide-y divide-line-2">
          {current ? (
            <NowRow label="Now" slot={current} hm={hm} teacher={teacherShort(staffName(d, current.teacherId))} live />
          ) : (
            <div className="px-4 py-3.5 text-[14px] text-stone">{next ? 'School starts soon.' : 'Classes are over for today.'}</div>
          )}
          {next && <NowRow label={`Next · ${next.start}`} slot={next} hm={hm} teacher={teacherShort(staffName(d, next.teacherId))} />}
        </Panel>
      </MSection>

      {/* praise */}
      {praise && (
        <MSection title="A note from your teacher">
          <Panel className="relative overflow-hidden p-4">
            <Quote size={44} className="absolute -right-1 -top-1 text-copper/15" strokeWidth={1.5} />
            <p className="relative font-display text-[17px] leading-[1.45] text-ink">“{praise.text}”</p>
            <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-stone">
              {praise.subject !== 'General' && <SubjectChip subject={praise.subject} />}
              {staffName(d, praise.staffId)} · {ago(praise.at, now)}
            </div>
          </Panel>
        </MSection>
      )}

      {/* learning nudge */}
      <LearnNudge />

      <Sheet open={bell} onClose={closeBell} title="Notifications">
        {notes.length === 0 ? <EmptyState icon={Bell} title="All quiet" body="Homework, marks and replies from teachers will show up here." /> : (
          <div className="-mx-1 divide-y divide-line-2">
            {notes.map(n => (
              <div key={n.id} className="flex gap-3 px-1 py-3">
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-copper')} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-ink">{n.title}</div>
                  <div className="text-[13px] text-stone">{n.body}</div>
                </div>
                <span className="shrink-0 text-[11.5px] text-stone">{ago(n.at, now)}</span>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </MobileScreen>
  )
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

function StreakRing({ value, children }: { value: number; children: ReactNode }) {
  const size = 132, stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ticks = 24
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2
          const r1 = r - stroke / 2 - 5, r2 = r1 - 3
          return <line key={i} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke="#DCD6CB" strokeWidth={1.2} strokeLinecap="round" />
        })}
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E4EDE9" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="#2E5D4E" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0.02, Math.min(1, value))) }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

function NowRow({ label, slot, hm, teacher, live }: { label: string; slot: { subject: string; start: string; end: string; room?: string }; hm: string; teacher: string; live?: boolean }) {
  const total = minutesBetween(slot.start, slot.end)
  const elapsed = Math.max(0, Math.min(total, minutesBetween(slot.start, hm)))
  const subjectLike = slot.subject as Parameters<typeof SubjectChip>[0]['subject']
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className={cx('text-[11.5px] font-semibold uppercase tracking-[0.12em]', live ? 'text-forest' : 'text-stone')}>{label}</span>
        <SubjectChip subject={subjectLike} />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-[19px] text-ink">{slot.subject}</span>
        {live && <span className="flex items-center gap-1 text-[12px] text-stone tabular"><Clock size={12} /> {total - elapsed} min left</span>}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-stone">{teacher !== '—' && <>{teacher} · </>}<MapPin size={12} /> {slot.room ?? '—'} · {slot.start}–{slot.end}</div>
      {live && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-2">
          <motion.div className="h-full rounded-full bg-forest-l" initial={{ width: 0 }} animate={{ width: `${(elapsed / total) * 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        </div>
      )}
    </div>
  )
}

function LearnNudge() {
  const { d, s } = useStudent()
  const nav = useMobileNav()
  const l = d.lessons.filter(x => x.classId === s.classId && (x.progress[s.id] ?? 0) > 0 && (x.progress[s.id] ?? 0) < 100).sort((a, b) => (b.progress[s.id] ?? 0) - (a.progress[s.id] ?? 0))[0]
  if (!l) return null
  const pct = l.progress[s.id] ?? 0
  return (
    <MSection title="Pick up where you left off">
      <Panel onClick={() => nav.push(lessonScreen(l))} className="flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-forest-p text-forest"><BookOpen size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-ink">{l.title}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2"><motion.div className="h-full rounded-full bg-copper" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} /></div>
            <span className="text-[12px] tabular text-stone">{pct}%</span>
          </div>
        </div>
        <ArrowRight size={18} className="text-forest" />
      </Panel>
    </MSection>
  )
}
