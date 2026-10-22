/* Learning: Marks · Homework · Remarks · Timetable for the selected child, plus the attendance calendar. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { BookOpen, CalendarDays, ChevronRight, Clock, NotebookPen, Quote, TrendingDown, TrendingUp } from 'lucide-react'
import { EmptyState, LiveDot, Pill, Tabs, cx, ease, type Tone } from '@/components/ui'
import { MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useNow } from '@/store/hooks'
import { attendanceRate, attendanceSeries, averageMark, marksTrend, streak } from '@/engine/monitoring'
import { ago, dueLabel, firstName } from '@/lib/format'
import type { Homework, Remark, Student, Subject } from '@/data/types'
import { staffName, subjectList, teacherOf, toMin, useParentScope } from './data'
import { useChild } from './context'
import { ChildFade, ChildSwitcher, MCard, ToneIcon } from './bits'
import { AttendanceScreen } from './Attendance'

type Seg = 'marks' | 'homework' | 'remarks' | 'timetable'

export function LearningScreen() {
  const child = useChild()
  const [seg, setSeg] = useState<Seg>('marks')
  return (
    <MobileScreen title="Learning" eyebrow={`${firstName(child.name)} · Class ${child.classId}`}>
      <ChildSwitcher />
      <ChildFade>
        <AttendanceEntry s={child} />
        <Tabs<Seg> className="mt-4" value={seg} onChange={setSeg}
          tabs={[{ id: 'marks', label: 'Marks' }, { id: 'homework', label: 'Homework' }, { id: 'remarks', label: 'Remarks' }, { id: 'timetable', label: 'Today' }]} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={seg} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22, ease: ease.out }}>
            {seg === 'marks' && <Marks s={child} />}
            {seg === 'homework' && <HomeworkList s={child} />}
            {seg === 'remarks' && <Remarks s={child} />}
            {seg === 'timetable' && <TodayTimetable s={child} />}
          </motion.div>
        </AnimatePresence>
      </ChildFade>
    </MobileScreen>
  )
}

function AttendanceEntry({ s }: { s: Student }) {
  const { d } = useParentScope()
  const nav = useMobileNav()
  const rate = attendanceRate(attendanceSeries(d, s))
  const st = streak(d, s)
  const tone: Tone = rate >= 0.9 ? 'forest' : rate >= 0.75 ? 'copper' : 'rust'
  return (
    <MCard className="mt-3" onClick={() => nav.push({ title: 'Attendance', render: () => <AttendanceScreen studentId={s.id} /> })}>
      <div className="flex items-center gap-3">
        <ToneIcon icon={CalendarDays} tone={tone} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-ink">Attendance calendar</div>
          <div className="text-[13px] text-stone">{Math.round(rate * 100)}% this term · {st}-day streak</div>
        </div>
        <ChevronRight size={18} className="text-stone-l" />
      </div>
    </MCard>
  )
}

/* ───────── Marks ───────── */

function Marks({ s }: { s: Student }) {
  const { d } = useParentScope()
  const t = marksTrend(s)
  const avg = averageMark(s)
  const up = t.delta >= 0
  return (
    <div className="mt-4 space-y-3">
      <MCard>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[13px] text-stone">Average across all tests</div>
            <div className="font-display text-[32px] tabular leading-none text-ink">{Math.round(avg)}<span className="text-[18px] text-stone">%</span></div>
          </div>
          <Pill tone={t.delta <= -8 ? 'copper' : 'forest'} icon={up ? TrendingUp : TrendingDown}>
            {up ? '+' : '−'}{Math.abs(Math.round(t.delta))} pts in Unit Test 2
          </Pill>
        </div>
      </MCard>
      {subjectList.map((subj, i) => <SubjectCard key={subj} s={s} subject={subj} teacher={staffName(d, teacherOf(d, s.classId, subj))} index={i} />)}
    </div>
  )
}

function SubjectCard({ s, subject, teacher, index }: { s: Student; subject: Subject; teacher: string; index: number }) {
  const m = s.marks[subject]
  const before = (m.unitTest1 + m.term1) / 2
  const delta = m.unitTest2 === null ? null : m.unitTest2 - before
  const rows: { label: string; value: number | null; tone: Tone }[] = [
    { label: 'Unit Test 1', value: m.unitTest1, tone: 'slate' },
    { label: 'Term 1', value: m.term1, tone: 'slate' },
    { label: 'Unit Test 2', value: m.unitTest2, tone: delta !== null && delta <= -10 ? 'copper' : 'forest' },
  ]
  const bar: Record<Tone, string> = { slate: 'bg-slate-l/60', copper: 'bg-copper', forest: 'bg-forest-l', amber: 'bg-amber', rust: 'bg-rust', stone: 'bg-stone-l', ink: 'bg-ink' }
  return (
    <MCard>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-[18px] leading-tight text-ink">{subject}</div>
          <div className="text-[12.5px] text-stone">{teacher}</div>
        </div>
        {delta === null ? <Pill tone="amber" dot>Awaiting teacher</Pill>
          : Math.abs(delta) >= 5 ? <Pill tone={delta < 0 ? 'copper' : 'forest'}>{delta > 0 ? '+' : '−'}{Math.abs(Math.round(delta))}</Pill>
          : <Pill tone="stone">Steady</Pill>}
      </div>
      <div className="space-y-2">
        {rows.map((r, j) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-[74px] shrink-0 text-[12px] text-stone">{r.label}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line-2">
              {r.value !== null ? (
                <motion.div className={cx('h-full rounded-full', bar[r.tone])} initial={{ width: 0 }} animate={{ width: `${r.value}%` }}
                  transition={{ duration: 0.9, delay: index * 0.05 + j * 0.08, ease: ease.out }} />
              ) : <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(224,165,63,.25)_5px_8px)]" />}
            </div>
            <span className={cx('w-9 shrink-0 text-right font-display text-[16px] tabular', r.value === null ? 'text-stone-l' : 'text-ink')}>{r.value ?? '—'}</span>
          </div>
        ))}
      </div>
      {delta === null && <div className="mt-2 text-[12.5px] text-[#8a5f14]">Unit Test 2 marks haven't been entered yet. You'll be notified the moment they are.</div>}
    </MCard>
  )
}

/* ───────── Homework ───────── */

const hwState: Record<Homework['submissions'][string], { label: string; tone: Tone }> = {
  pending: { label: 'Not submitted', tone: 'amber' },
  submitted: { label: 'Submitted', tone: 'forest' },
  reviewed: { label: 'Reviewed', tone: 'forest' },
  late: { label: 'Submitted late', tone: 'copper' },
}

function HomeworkList({ s }: { s: Student }) {
  const { d } = useParentScope()
  const now = useNow()
  const today = now.slice(0, 10)
  const list = d.homework.filter(h => h.classId === s.classId && h.submissions[s.id] !== undefined).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  if (!list.length) return <EmptyState icon={NotebookPen} title="No homework right now" body={`Nothing set for ${firstName(s.name)} this week.`} />
  return (
    <div className="mt-4 space-y-2.5">
      {list.map(h => {
        const st = h.submissions[s.id]
        const missed = st === 'pending' && h.dueDate < today
        const info = missed ? { label: 'Missed', tone: 'rust' as Tone } : hwState[st]
        return (
          <MCard key={h.id}>
            <div className="flex items-start gap-3">
              <ToneIcon icon={BookOpen} tone={info.tone} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-stone">{h.subject}</div>
                <div className="text-[15px] font-medium leading-snug text-ink">{h.title}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Pill tone={info.tone} dot>{info.label}</Pill>
                  <span className={cx('text-[12.5px]', h.dueDate >= today && st === 'pending' ? 'font-medium text-charcoal' : 'text-stone')}>
                    {h.dueDate >= today ? `Due ${dueLabel(h.dueDate, now)}` : `Was due ${dueLabel(h.dueDate, now).replace(' late', ' ago')}`}
                  </span>
                </div>
              </div>
            </div>
          </MCard>
        )
      })}
    </div>
  )
}

/* ───────── Remarks ───────── */

const toneOf: Record<Remark['tone'], { tone: Tone; label: string }> = {
  praise: { tone: 'forest', label: 'Praise' },
  concern: { tone: 'copper', label: 'Worth a look' },
  note: { tone: 'slate', label: 'Note' },
}

function Remarks({ s }: { s: Student }) {
  const { d } = useParentScope()
  const list = d.remarks.filter(r => r.studentId === s.id && r.visibleToParent).sort((a, b) => b.at.localeCompare(a.at))
  if (!list.length) return <EmptyState icon={Quote} title="No remarks yet" body="Notes from teachers will appear here." />
  return (
    <div className="mt-4 space-y-2.5">
      <AnimatePresence initial={false}>
        {list.map(r => (
          <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <MCard className={cx('border-l-4', r.tone === 'praise' ? '!border-l-forest-l' : r.tone === 'concern' ? '!border-l-copper' : '!border-l-slate-l')}>
              <div className="flex items-center justify-between gap-2">
                <Pill tone={toneOf[r.tone].tone}>{toneOf[r.tone].label}</Pill>
                <span className="text-[12px] text-stone">{ago(r.at)}</span>
              </div>
              <p className="mt-2 font-display text-[17px] leading-snug text-ink">“{r.text}”</p>
              <div className="mt-2 text-[12.5px] text-stone">{staffName(d, r.staffId)} · {r.subject}</div>
            </MCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ───────── Today's timetable ───────── */

function TodayTimetable({ s }: { s: Student }) {
  const { d } = useParentScope()
  const now = useNow()
  const wd = (new Date(d.school.today + 'T00:00:00').getDay() + 6) % 7
  const slots = wd < 5 ? d.timetable[s.classId]?.[wd] ?? [] : []
  const nowMin = toMin(now.slice(11, 16))
  if (!slots.length) return <EmptyState icon={Clock} title="No classes today" body="Enjoy the day off." />
  return (
    <MSection title="Wednesday" className="!mt-4">
      <div className="relative overflow-hidden rounded-[16px] border border-line bg-ivory-2">
        {slots.map(sl => {
          const start = toMin(sl.start), end = toMin(sl.end)
          const live = nowMin >= start && nowMin < end
          const done = nowMin >= end
          const isBreak = sl.subject === 'Break' || sl.subject === 'Lunch'
          return (
            <div key={sl.period} className={cx('relative flex items-center gap-3 border-b border-line-2 px-4 last:border-b-0', isBreak ? 'py-2' : 'py-3', live && 'bg-forest-p/60')}>
              {live && <motion.span layoutId="now-bar" className="absolute inset-y-0 left-0 w-1 bg-forest" />}
              <div className={cx('w-12 shrink-0 text-[12.5px] tabular', done ? 'text-stone-l' : 'text-stone')}>{sl.start}</div>
              <div className="min-w-0 flex-1">
                <div className={cx(isBreak ? 'text-[13px] text-stone' : 'text-[15px] font-medium', done && !isBreak ? 'text-stone' : !isBreak && 'text-ink')}>
                  {sl.subject}
                </div>
                {!isBreak && <div className="truncate text-[12.5px] text-stone">{sl.teacherId ? staffName(d, sl.teacherId) : ''}{sl.room ? ` · ${sl.room}` : ''}</div>}
                {live && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-forest/15">
                    <motion.div className="h-full bg-forest" initial={{ width: 0 }} animate={{ width: `${((nowMin - start) / (end - start)) * 100}%` }} transition={{ duration: 0.8, ease: ease.out }} />
                  </div>
                )}
              </div>
              {live && <span className="flex items-center gap-1.5 text-[12px] font-medium text-forest"><LiveDot />Now</span>}
            </div>
          )
        })}
      </div>
      {nowMin < toMin(slots[0].start) && <div className="mt-2 px-1 text-[12.5px] text-stone">School starts at {slots[0].start}.</div>}
    </MSection>
  )
}
