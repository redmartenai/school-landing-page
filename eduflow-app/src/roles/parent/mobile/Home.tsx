/* Home — "Today" for the selected child. The nine-second read. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  Bell, BookOpen, BusFront, CalendarDays, CircleAlert, CircleCheck, Clock, Heart, IndianRupee, Megaphone,
  MessageCircle, Minus, Quote, Receipt, Sparkles, TrendingDown, TrendingUp, Wallet, type LucideIcon,
} from 'lucide-react'
import { Button, IconButton, cx, ease, toneClass, type Tone } from '@/components/ui'
import { MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useNow } from '@/store/hooks'
import { attendanceRate, attendanceSeries, averageMark, marksTrend, streak, studentRisk, todayMark } from '@/engine/monitoring'
import { dateLabel, dueLabel, firstName, greeting, rupees, time } from '@/lib/format'
import type { Notification, Student, Subject } from '@/data/types'
import { SUBJECT_SHORT, addDays, feeSummary, isForChild, staffName, subjectList, teacherOf, useParentNotifications, useParentScope } from './data'
import { useChild } from './context'
import { ChildFade, ChildSwitcher, MCard, ToneIcon, item } from './bits'
import { PaySheet } from './Fees'
import { useOpenChat } from './Messages'
import { AttendanceScreen } from './Attendance'
import { NotificationsScreen } from './More'

export function HomeScreen() {
  const { parent } = useParentScope()
  const child = useChild()
  const now = useNow()
  const nav = useMobileNav()
  const notes = useParentNotifications()
  const unread = notes.filter(n => !n.read).length
  return (
    <MobileScreen title={`${greeting(now)}, ${firstName(parent.name)}`} eyebrow={dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={<IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => nav.push({ title: 'Notifications', render: () => <NotificationsScreen /> })} />}>
      <ChildSwitcher />
      <ChildFade>
        <TodayHero s={child} />
        <Timeline s={child} />
        <Tiles s={child} />
        <WorthALook s={child} />
      </ChildFade>
    </MobileScreen>
  )
}

/* ───────── hero line: the one sentence ───────── */

function TodayHero({ s }: { s: Student }) {
  const { d } = useParentScope()
  const mark = todayMark(d, s)
  const name = firstName(s.name)
  const reg = d.registers.find(r => r.classId === s.classId)
  const bus = s.busId ? d.buses.find(b => b.id === s.busId) : null
  const [tone, text, sub]: [Tone, string, string] =
    mark === 'P' ? ['forest', `${name} is in class.`, `Marked present at ${reg?.markedAt ? time(reg.markedAt) : '—'} by ${staffName(d, reg?.markedBy)}.`]
    : mark === 'L' ? ['copper', `${name} reached a little late today.`, `Marked late at ${reg?.markedAt ? time(reg.markedAt) : '—'} — in class now.`]
    : mark === 'A' ? ['rust', `${name} is marked absent today.`, 'If this is unexpected, message the class teacher.']
    : bus?.status === 'arrived' ? ['forest', `${name} has reached school.`, `Bus ${bus.id} arrived at ${bus.stops[bus.stops.length - 1].at}. The ${s.classId} register is next.`]
    : ['amber', `${name} is on the way.`, bus ? `Bus ${bus.id} is ${bus.delayMin ? `${bus.delayMin} min late` : 'on time'}.` : 'Waiting for the register.']
  return (
    <motion.div variants={item} className={cx('mt-3 rounded-[18px] p-4', toneClass[tone].bg)}>
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', toneClass[tone].solid)}>
          {tone === 'forest' ? <CircleCheck size={19} /> : tone === 'rust' ? <CircleAlert size={19} /> : <Clock size={19} />}
        </span>
        <div>
          <div className="font-display text-[21px] leading-tight text-ink">{text}</div>
          <div className="mt-0.5 text-[13.5px] text-charcoal-2">{sub}</div>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────── timeline ───────── */

interface TItem { id: string; at: string; title: string; body: string; icon: LucideIcon; tone: Tone; pending?: boolean }

function describe(n: Notification): Pick<TItem, 'icon' | 'tone'> {
  switch (n.kind) {
    case 'bus': return { icon: BusFront, tone: 'forest' }
    case 'attendance': return n.title.includes('absent') ? { icon: CircleAlert, tone: 'rust' } : n.title.includes('late') ? { icon: Clock, tone: 'copper' } : { icon: CircleCheck, tone: 'forest' }
    case 'homework': return { icon: BookOpen, tone: 'slate' }
    case 'remark': return { icon: Heart, tone: 'forest' }
    case 'fees': return n.title.startsWith('Payment received') ? { icon: Receipt, tone: 'forest' } : { icon: IndianRupee, tone: 'rust' }
    case 'marks': return { icon: TrendingUp, tone: 'slate' }
    case 'message': return { icon: MessageCircle, tone: 'slate' }
    case 'announcement': return { icon: Megaphone, tone: 'slate' }
    default: return { icon: Bell, tone: 'slate' }
  }
}

function Timeline({ s }: { s: Student }) {
  const { d } = useParentScope()
  const notes = useParentNotifications()
  const today = d.school.today
  const name = firstName(s.name)
  const recentFrom = addDays(today, -2)

  const items: TItem[] = notes
    .filter(n => isForChild(n, s) && n.at.slice(0, 10) >= recentFrom)
    .map(n => ({ id: n.id, at: n.at, title: n.title, body: n.body, ...describe(n) }))

  // What hasn't happened yet is information too: the register still to come.
  const reg = d.registers.find(r => r.classId === s.classId)
  if (reg && !reg.markedAt) {
    const ct = d.classes.find(c => c.id === s.classId)?.classTeacherId
    items.push({ id: `pending-${s.classId}`, at: `${today}T99`, title: `Waiting for the ${s.classId} register`, body: `${staffName(d, ct)} hasn't taken it yet. You'll know the moment ${name} is marked.`, icon: Clock, tone: 'amber', pending: true })
  }
  // Homework due soon, so it reads as part of today.
  const nowDate = today
  for (const h of d.homework) {
    if (h.classId !== s.classId || h.submissions[s.id] !== 'pending' || h.dueDate < nowDate) continue
    if (items.some(i => i.body.includes(h.title))) continue
    if (h.dueDate > addDays(today, 3)) continue
    items.push({ id: `hw-${h.id}`, at: `${h.assignedAt}T09:00:00`, title: `${h.subject} homework is up`, body: `${h.title} · due ${dueLabel(h.dueDate)}`, icon: BookOpen, tone: 'slate' })
  }
  items.sort((a, b) => b.at.localeCompare(a.at))

  const groups = new Map<string, TItem[]>()
  for (const i of items) {
    const day = i.pending ? today : i.at.slice(0, 10)
    const yesterday = addDays(today, -1)
    const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : dateLabel(day, { weekday: 'long', day: 'numeric', month: 'short' })
    groups.set(label, [...(groups.get(label) ?? []), i])
  }

  return (
    <MSection title={`${name}'s day`} className="!mt-5">
      {!items.length && <div className="rounded-[16px] border border-line bg-ivory-2 px-4 py-6 text-center text-[13.5px] text-stone">A quiet day so far. Updates about {name} appear here the moment they happen.</div>}
      {[...groups.entries()].map(([label, list]) => (
        <div key={label} className="mb-3">
          <div className="mb-1.5 px-1 text-[12px] font-medium text-stone">{label}</div>
          <div className="relative rounded-[16px] border border-line bg-ivory-2 px-4 py-1">
            <AnimatePresence initial={false}>
              {list.map((it, idx) => (
                <motion.div key={it.id} layout
                  initial={{ opacity: 0, x: -12, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease: ease.out, delay: idx * 0.05 }}
                  className="relative flex gap-3 py-3">
                  {idx < list.length - 1 && <span className="absolute bottom-[-6px] left-[17px] top-[44px] w-px bg-line" />}
                  <span className={cx('relative', it.pending && 'opacity-90')}>
                    <ToneIcon icon={it.icon} tone={it.tone} />
                    {it.pending && <motion.span className="absolute inset-0 rounded-full ring-2 ring-amber" animate={{ opacity: [0.7, 0.15, 0.7] }} transition={{ duration: 2.4, repeat: Infinity }} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cx('text-[14.5px] font-medium leading-snug', it.pending ? 'text-[#8a5f14]' : 'text-ink')}>{it.title}</span>
                      {!it.pending && <span className="shrink-0 font-display text-[14px] tabular text-stone">{time(it.at)}</span>}
                    </div>
                    <div className="text-[13px] leading-snug text-stone">{it.body}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </MSection>
  )
}

/* ───────── summary tiles ───────── */

function Tiles({ s }: { s: Student }) {
  const { d } = useParentScope()
  const nav = useMobileNav()
  const name = firstName(s.name)
  const rate = attendanceRate(attendanceSeries(d, s))
  const st = streak(d, s)
  const avg = averageMark(s)
  const tr = marksTrend(s)
  const f = feeSummary(s)
  const remark = d.remarks.filter(r => r.studentId === s.id && r.visibleToParent).sort((a, b) => b.at.localeCompare(a.at))[0]
  const TrendIcon = tr.delta >= 3 ? TrendingUp : tr.delta <= -3 ? TrendingDown : Minus
  const trendTone: Tone = tr.delta <= -8 ? 'copper' : 'forest'

  return (
    <MSection title="At a glance">
      <div className="grid grid-cols-2 gap-2.5">
        <MCard onClick={() => nav.push({ title: 'Attendance', render: () => <AttendanceScreen studentId={s.id} /> })} className="!p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-stone">Attendance <CalendarDays size={15} /></div>
          <div className={cx('mt-1 font-display text-[28px] tabular leading-none', rate >= 0.9 ? 'text-ink' : rate >= 0.75 ? 'text-copper-d' : 'text-rust')}>{Math.round(rate * 100)}%</div>
          <div className="mt-1 text-[12.5px] text-stone">{st >= 5 ? <><span className="font-medium text-forest">{st}-day</span> streak</> : `${st} day${st === 1 ? '' : 's'} in a row`}</div>
        </MCard>
        <MCard className="!p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-stone">Average marks <TrendIcon size={15} className={toneClass[trendTone].text} /></div>
          <div className="mt-1 font-display text-[28px] tabular leading-none text-ink">{Math.round(avg)}<span className="text-[15px] text-stone">%</span></div>
          <div className={cx('mt-1 text-[12.5px]', toneClass[trendTone].text)}>{tr.delta >= 0 ? '+' : '−'}{Math.abs(Math.round(tr.delta))} in Unit Test 2</div>
        </MCard>
        <MCard className="!p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-stone">Fees <Wallet size={15} /></div>
          {f.overdue > 0 ? (
            <>
              <div className="mt-1 font-display text-[24px] tabular leading-none text-rust">{rupees(f.overdue)}</div>
              <div className="mt-1 text-[12.5px] text-rust">{f.overdueLabel} overdue</div>
            </>
          ) : (
            <>
              <div className="mt-1 font-display text-[24px] leading-none text-forest">Up to date</div>
              <div className="mt-1 text-[12.5px] text-stone">{f.balance ? `Next ${rupees(f.balance)} · 15 Dec` : 'Year fully paid'}</div>
            </>
          )}
        </MCard>
        <MCard className="!p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-stone">Latest note <Quote size={15} /></div>
          {remark ? (
            <>
              <p className="mt-1 line-clamp-3 font-display text-[14px] leading-snug text-ink">“{remark.text}”</p>
              <div className="mt-1 truncate text-[11.5px] text-stone">{staffName(d, remark.staffId)}</div>
            </>
          ) : <p className="mt-1 text-[13px] text-stone">No notes about {name} yet.</p>}
        </MCard>
      </div>
    </MSection>
  )
}

/* ───────── worth a look ───────── */

function biggestDrop(s: Student): { subject: Subject; drop: number } | null {
  let best: { subject: Subject; drop: number } | null = null
  for (const subj of subjectList) {
    const m = s.marks[subj]
    if (m.unitTest2 === null) continue
    const drop = Math.round((m.unitTest1 + m.term1) / 2 - m.unitTest2)
    if (!best || drop > best.drop) best = { subject: subj, drop }
  }
  return best && best.drop > 0 ? best : null
}

function WorthALook({ s }: { s: Student }) {
  const { d } = useParentScope()
  const nav = useMobileNav()
  const openChat = useOpenChat()
  const [paying, setPaying] = useState(false)
  const risk = studentRisk(d, s)
  const name = firstName(s.name)
  const f = feeSummary(s)
  const cls = d.classes.find(c => c.id === s.classId)
  const pron = s.gender === 'F' ? 'She' : 'He'

  type Line = { key: string; text: string; sub: string; tone: Tone; action: { label: string; run: () => void } }
  const lines: Line[] = []
  const seen = new Set<string>()
  for (const fct of risk.factors) {
    if (seen.has(fct.key)) continue
    seen.add(fct.key)
    if (fct.key === 'marks') {
      const b = biggestDrop(s)
      const subj = b?.subject ?? 'Mathematics'
      const tid = teacherOf(d, s.classId, subj)
      lines.push({
        key: 'marks', tone: 'copper',
        text: b ? `${SUBJECT_SHORT[subj]} dropped ${b.drop} points in Unit Test 2` : fct.label,
        sub: `${staffName(d, tid)} has added a note. A quick chat usually helps.`,
        action: { label: `Message ${staffName(d, tid).replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ')[0]}`, run: () => tid && openChat({ studentId: s.id, staffId: tid, subject: subj }) },
      })
    } else if (fct.key === 'fees') {
      lines.push({
        key: 'fees', tone: 'rust',
        text: `${rupees(f.overdue)} ${f.overdueLabel ?? ''} fee overdue`.replace('  ', ' '),
        sub: 'It was due on 15 September. Paying takes under a minute.',
        action: { label: 'Pay now', run: () => setPaying(true) },
      })
    } else if (fct.key === 'attendance') {
      lines.push({
        key: 'attendance', tone: 'copper',
        text: fct.label.startsWith('Slipping') ? `Attendance is slipping — ${fct.label.split(': ')[1]}` : `${fct.label} this term`,
        sub: `${name} has missed more days lately. Worth a word with ${staffName(d, cls?.classTeacherId)}.`,
        action: { label: 'See calendar', run: () => nav.push({ title: 'Attendance', render: () => <AttendanceScreen studentId={s.id} /> }) },
      })
    } else if (fct.key === 'homework') {
      lines.push({
        key: 'homework', tone: 'amber', text: fct.label, sub: `${pron} has a couple of assignments outstanding.`,
        action: { label: 'Message class teacher', run: () => cls && openChat({ studentId: s.id, staffId: cls.classTeacherId }) },
      })
    } else if (fct.key === 'behaviour') {
      lines.push({
        key: 'behaviour', tone: 'copper', text: fct.label, sub: `${staffName(d, cls?.classTeacherId)} would be glad to talk it through.`,
        action: { label: 'Message class teacher', run: () => cls && openChat({ studentId: s.id, staffId: cls.classTeacherId }) },
      })
    }
  }

  const sheet = <PaySheet student={s} open={paying} onClose={() => setPaying(false)} />
  if (!lines.length) {
    const st = streak(d, s)
    return (
      <>
      <MSection title="Worth a look">
        <MCard tone="forest">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-ivory"><Sparkles size={19} /></span>
            <div>
              <div className="font-display text-[19px] leading-tight text-ink">All is well with {name}.</div>
              <p className="mt-1 text-[13.5px] leading-snug text-charcoal-2">
                {st >= 20 ? `${st} school days without missing one, ` : ''}marks are {marksTrend(s).delta >= 0 ? 'climbing' : 'steady'} and fees are up to date. Nothing needs you today.
              </p>
            </div>
          </div>
        </MCard>
      </MSection>
      {sheet}
      </>
    )
  }

  return (
    <MSection title="Worth a look" action={<span className="text-[12px] text-stone">{lines.length} thing{lines.length > 1 ? 's' : ''}</span>}>
      <motion.div variants={item} className="overflow-hidden rounded-[16px] border border-copper/25 bg-ivory-2 shadow-1">
        <div className="bg-copper-p px-4 py-2.5 text-[13.5px] text-copper-d">Nothing urgent — but these would help {name}.</div>
        <div className="divide-y divide-line-2">
          {lines.map(l => (
            <div key={l.key} className="px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className={cx('mt-[7px] h-2 w-2 shrink-0 rounded-full', toneClass[l.tone].dot)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium leading-snug text-ink">{l.text}</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-stone">{l.sub}</div>
                  <Button className="mt-2.5" size="sm" variant={l.key === 'fees' ? 'primary' : 'outline'} onClick={l.action.run}>{l.action.label}</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      {sheet}
    </MSection>
  )
}
