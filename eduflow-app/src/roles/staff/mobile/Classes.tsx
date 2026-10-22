/* Her classes → a class → a child. Homework, remarks and a line to the parent, all within two taps. */
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { BookOpen, Check, ChevronRight, ClipboardCheck, MessageCircle, NotebookPen, PenLine, Plus, Users } from 'lucide-react'
import { Avatar, Button, EmptyState, Pill, Progress, Sheet, Sparkline, Tabs, cx, inputClass, listItem, spring, useToast, type Tone } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import type { Homework, Remark, Student } from '@/data/types'
import { attendanceRate, attendanceSeries, studentRisk, todayMark } from '@/engine/monitoring'
import { ago, dueLabel, firstName, time } from '@/lib/format'
import { ChatScreen } from './Messages'
import { RegisterScreen } from './Register'
import { ChoiceChips, MCard, ME, addDays, awaitingReview, handedIn, myPeriods, nextWeekday, textareaClass, useTeacher } from './shared'

/* ───────────────────────── tab ───────────────────────── */

export function ClassesTab() {
  const d = useData()
  const now = useNow()
  const me = useTeacher()
  const nav = useMobileNav()
  const periods = myPeriods(d, ME, now)

  return (
    <MobileScreen title="Classes" eyebrow={`${me.subjects[0]} · ${me.classIds.length} classes · ${me.classIds.reduce((a, id) => a + (d.classes.find(c => c.id === id)?.studentIds.length ?? 0), 0)} children`}>
      <MSection>
        <MList>
          {me.classIds.map(id => {
            const cls = d.classes.find(c => c.id === id)!
            const p = periods.find(x => x.classId === id)
            const reg = d.registers.find(r => r.classId === id)
            const mine = me.classTeacherOf === id
            const toReview = d.homework.filter(h => h.classId === id && h.teacherId === ME).reduce((a, h) => a + awaitingReview(h), 0)
            const done = p && p.end <= now.slice(11, 16)
            return (
              <motion.button key={id} whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }}
                onClick={() => nav.push({ title: `Class ${id}`, render: () => <ClassDetail classId={id} /> })}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-[13px] font-display text-[18px]', mine ? 'bg-forest text-ivory' : 'bg-paper text-ink')}>{id}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-medium text-ink">Class {id}</span>
                    {mine && <Pill tone="forest">Your class</Pill>}
                  </div>
                  <div className="truncate text-[13px] text-stone">
                    {cls.studentIds.length} children · Room {cls.room}
                    {p ? ` · ${done ? 'Taught' : 'Period'} ${p.period}${done ? '' : ` at ${p.start}`}` : ' · No period today'}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {mine && (reg?.markedAt ? <Pill tone="forest" dot>Register in · {time(reg.markedAt)}</Pill> : <Pill tone="copper" dot>Register not taken</Pill>)}
                    {toReview > 0 && <Pill tone="amber">{toReview} to review</Pill>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-l" />
              </motion.button>
            )
          })}
        </MList>
      </MSection>
    </MobileScreen>
  )
}

/* ───────────────────────── class ───────────────────────── */

const riskTone = { 'at-risk': 'rust', watch: 'amber', ok: 'forest' } as const satisfies Record<string, Tone>

export function ClassDetail({ classId }: { classId: string }) {
  const d = useData()
  const me = useTeacher()
  const nav = useMobileNav()
  const toast = useToast()
  const review = useSchool(s => s.reviewHomework)
  const [view, setView] = useState<'students' | 'homework'>('students')
  const [setting, setSetting] = useState(false)

  const cls = d.classes.find(c => c.id === classId)!
  const reg = d.registers.find(r => r.classId === classId)
  const subject = me.subjects[0]
  const kids = useMemo(() => cls.studentIds
    .map(id => d.students.find(s => s.id === id)!)
    .map(s => ({ s, r: studentRisk(d, s) }))
    .sort((a, b) => b.r.score - a.r.score || a.s.rollNo - b.s.rollNo), [cls, d])
  const hw = d.homework.filter(h => h.classId === classId && h.teacherId === ME).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
  const atRisk = kids.filter(k => k.r.level === 'at-risk').length
  const ut2 = kids.map(k => k.s.marks[subject]?.unitTest2).filter((x): x is number => typeof x === 'number')
  const avg = ut2.length ? Math.round(ut2.reduce((a, b) => a + b, 0) / ut2.length) : null
  const present = reg?.markedAt ? Object.values(reg.marks).filter(m => m !== 'A').length : null
  const isMine = me.classTeacherOf === classId

  return (
    <MobileScreen title={`Class ${classId}`} eyebrow={`${cls.studentIds.length} children · Room ${cls.room}${isMine ? ' · your class' : ''}`}
      footer={view === 'homework' ? <Button block size="lg" icon={Plus} onClick={() => setSetting(true)}>Set homework for {classId}</Button> : undefined}>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="In today" value={present === null ? '—' : `${present}/${cls.studentIds.length}`} tone={present === null ? 'copper' : 'forest'} sub={present === null ? 'Not marked' : `at ${time(reg!.markedAt!)}`} />
        <Tile label={`UT2 ${subject === 'Mathematics' ? 'maths' : subject}`} value={avg === null ? '—' : `${avg}%`} tone="slate" sub="class average" />
        <Tile label="Need care" value={String(atRisk)} tone={atRisk ? 'rust' : 'forest'} sub={atRisk ? 'at risk' : 'all steady'} />
      </div>

      {isMine && !reg?.markedAt && (
        <MCard className="mt-3 flex items-center justify-between border-copper/30 bg-copper-p" onClick={() => nav.push({ title: `${classId} register`, render: () => <RegisterScreen classId={classId} /> })}>
          <span className="text-[14.5px] font-medium text-copper-d">The {classId} register isn’t in yet</span>
          <span className="text-[13.5px] font-semibold text-copper-d">Take it</span>
        </MCard>
      )}

      <Tabs className="mt-4" value={view} onChange={setView}
        tabs={[{ id: 'students', label: 'Children', count: kids.length }, { id: 'homework', label: 'Homework', count: hw.length }]} />

      <AnimatePresence mode="wait" initial={false}>
        {view === 'students' ? (
          <motion.div key="students" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <MList className="mt-3">
              {kids.map(({ s, r }) => {
                const today = todayMark(d, s)
                return (
                  <motion.button key={s.id} whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }}
                    onClick={() => nav.push({ title: s.name, render: () => <StudentDetail studentId={s.id} /> })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="relative">
                      <Avatar name={s.name} size={40} />
                      {r.level !== 'ok' && <span className={cx('absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-ivory-2', r.level === 'at-risk' ? 'bg-rust' : 'bg-amber')} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium text-ink">{s.name}</span>
                        {today === 'A' && <span className="text-[11.5px] font-medium text-rust">Absent</span>}
                        {today === 'L' && <span className="text-[11.5px] font-medium text-[#8a5f14]">Late</span>}
                      </div>
                      {r.factors.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.factors.slice(0, 2).map(f => <Pill key={f.label} tone={riskTone[r.level]} className="text-[11.5px]!">{f.label}</Pill>)}
                        </div>
                      ) : (
                        <div className="text-[12.5px] text-stone">Roll {s.rollNo} · {s.house} · steady</div>
                      )}
                    </div>
                    <ChevronRight size={17} className="shrink-0 text-stone-l" />
                  </motion.button>
                )
              })}
            </MList>
          </motion.div>
        ) : (
          <motion.div key="homework" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="mt-3 space-y-2.5">
            {hw.length === 0 && <EmptyState icon={NotebookPen} title={`No homework set for ${classId}`} body="Set something small — the families hear about it straight away." />}
            <AnimatePresence initial={false}>
              {hw.map(h => <HomeworkCard key={h.id} h={h} total={cls.studentIds.length} onReview={() => { const n = awaitingReview(h); review(h.id, ME); toast(`${n} submission${n === 1 ? '' : 's'} reviewed · ${classId} will see a tick`) }} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <SetHomeworkSheet open={setting} classId={classId} onClose={() => setSetting(false)} onDone={() => setView('homework')} />
    </MobileScreen>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: Tone }) {
  return (
    <div className="rounded-[14px] border border-line bg-ivory-2 px-3 py-2.5">
      <div className="truncate text-[11.5px] text-stone">{label}</div>
      <div className={cx('font-display text-[22px] leading-tight tabular', tone === 'rust' ? 'text-rust' : tone === 'copper' ? 'text-copper-d' : 'text-ink')}>{value}</div>
      <div className="truncate text-[11.5px] text-stone">{sub}</div>
    </div>
  )
}

function HomeworkCard({ h, total, onReview }: { h: Homework; total: number; onReview: () => void }) {
  const now = useNow()
  const waiting = awaitingReview(h)
  const inn = handedIn(h)
  const reviewed = Object.values(h.submissions).filter(v => v === 'reviewed').length
  const overdue = h.dueDate < now.slice(0, 10)
  return (
    <motion.div layout variants={listItem} initial="hidden" animate="show" exit="exit" className="rounded-[16px] border border-line bg-ivory-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium leading-snug text-ink">{h.title}</div>
          <div className="mt-0.5 text-[12.5px] text-stone">Set {ago(h.assignedAt + 'T15:00:00', now)} · due {dueLabel(h.dueDate, now).toLowerCase()}</div>
        </div>
        <Pill tone={overdue ? 'stone' : 'slate'}>{overdue ? 'Closed' : 'Open'}</Pill>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12.5px]">
        <span className="text-charcoal-2"><b className="font-semibold text-ink tabular">{inn}</b> of {total} handed in</span>
        <span className="text-stone tabular">{reviewed} reviewed</span>
      </div>
      <Progress className="mt-1.5" value={inn / Math.max(1, total)} tone={waiting ? 'amber' : 'forest'} />
      <AnimatePresence mode="wait" initial={false}>
        {waiting > 0 ? (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -4 }} className="mt-3">
            <Button block variant="copper" icon={ClipboardCheck} onClick={onReview}>Review {waiting} submission{waiting === 1 ? '' : 's'}</Button>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-forest">
            <Check size={15} strokeWidth={2.6} /> Everything handed in has been reviewed
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ───────────────────────── set homework ───────────────────────── */

type Due = 'tomorrow' | 'friday' | 'next'

export function SetHomeworkSheet({ open, classId, onClose, onDone }: { open: boolean; classId: string; onClose: () => void; onDone?: () => void }) {
  const now = useNow()
  const me = useTeacher()
  const create = useSchool(s => s.createHomework)
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState<Due>('friday')
  const today = now.slice(0, 10)
  const dates: Record<Due, string> = { tomorrow: addDays(today, 1), friday: nextWeekday(today, 5), next: addDays(today, 7) }
  const subject = me.subjects[0] ?? 'Mathematics'

  const submit = () => {
    if (!title.trim()) return
    create({ classId, subject, title: title.trim(), description: desc.trim() || 'Complete in your notebook and upload a clear photo of each page. Show all working.', dueDate: dates[due] }, ME)
    toast(`Homework sent to ${classId} and their families`)
    setTitle(''); setDesc(''); setDue('friday')
    onDone?.()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Set homework · ${classId}`}
      footer={<Button block size="lg" disabled={!title.trim()} onClick={submit}>Send to {classId}</Button>}>
      <div className="mb-3 flex items-center gap-2 text-[13px] text-stone"><BookOpen size={15} /> {subject}</div>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">What should they do?</span>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Exercise 4.4 — questions 1 to 6" className={cx(inputClass, 'h-12 text-[15px]')} />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">A line of help (optional)</span>
        <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Show all working. Upload a clear photo of each page." className={textareaClass} />
      </label>
      <div className="mt-4">
        <span className="mb-2 block text-[12.5px] font-medium text-charcoal-2">Due</span>
        <ChoiceChips group={`due-${classId}`} value={due} onChange={setDue}
          options={[{ id: 'tomorrow', label: 'Tomorrow' }, { id: 'friday', label: 'Friday' }, { id: 'next', label: 'Next week' }]} />
        <p className="mt-2 text-[12.5px] text-stone">Due {dueLabel(dates[due], now)} · {dates[due].slice(8)}/{dates[due].slice(5, 7)}</p>
      </div>
    </Sheet>
  )
}

/* ───────────────────────── student ───────────────────────── */

const toneOf: Record<Remark['tone'], Tone> = { praise: 'forest', note: 'slate', concern: 'copper' }

export function StudentDetail({ studentId }: { studentId: string }) {
  const d = useData()
  const me = useTeacher()
  const nav = useMobileNav()
  const [remarking, setRemarking] = useState(false)
  const [composing, setComposing] = useState(false)
  const s = d.students.find(x => x.id === studentId)
  if (!s) return <MobileScreen title="Student"><EmptyState icon={Users} title="Not found" /></MobileScreen>

  const series = attendanceSeries(d, s)
  const att = attendanceRate(series)
  const risk = studentRisk(d, s)
  const subject = me.subjects[0] ?? 'Mathematics'
  const m = s.marks[subject]
  const parent = d.parents.find(p => p.id === s.parentId)
  const remarks = d.remarks.filter(r => r.studentId === s.id).sort((a, b) => b.at.localeCompare(a.at))
  const thread = d.threads.find(t => t.studentId === s.id && t.staffId === ME && t.parentId === s.parentId)
  const weekly = Array.from({ length: Math.ceil(series.length / 5) }, (_, i) => attendanceRate(series.slice(i * 5, i * 5 + 5)) * 100)
  const points = [{ k: 'UT1', v: m.unitTest1 }, { k: 'Term 1', v: m.term1 }, { k: 'UT2', v: m.unitTest2 }]
  const delta = m.unitTest2 === null ? null : m.unitTest2 - (m.unitTest1 + m.term1) / 2

  const messageParent = () => {
    if (thread) nav.push({ title: parent?.name ?? 'Parent', render: () => <ChatScreen threadId={thread.id} /> })
    else setComposing(true)
  }

  return (
    <MobileScreen title={s.name} eyebrow={`${s.classId} · Roll ${s.rollNo} · ${s.house} House`}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="lg" icon={PenLine} className="flex-1" onClick={() => setRemarking(true)}>Add remark</Button>
          <Button size="lg" icon={MessageCircle} className="flex-1" onClick={messageParent}>Message {parent ? firstName(parent.name) : 'parent'}</Button>
        </div>
      }>
      {risk.factors.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {risk.factors.map(f => <Pill key={f.label} tone={riskTone[risk.level]} dot>{f.label}</Pill>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <MCard>
          <div className="text-[12px] text-stone">Attendance</div>
          <div className={cx('font-display text-[30px] leading-tight tabular', att < 0.75 ? 'text-rust' : 'text-ink')}>{Math.round(att * 100)}%</div>
          <Sparkline data={weekly} width={130} height={30} tone={att < 0.75 ? 'rust' : att < 0.85 ? 'amber' : 'forest'} />
          <div className="mt-1 text-[11.5px] text-stone">last 12 weeks</div>
        </MCard>
        <MCard>
          <div className="text-[12px] text-stone">{subject}</div>
          <div className="font-display text-[30px] leading-tight tabular text-ink">{m.unitTest2 ?? '—'}<span className="text-[15px] text-stone">/100</span></div>
          <div className={cx('text-[12.5px] font-medium', delta === null ? 'text-stone' : delta <= -8 ? 'text-rust' : delta >= 4 ? 'text-forest' : 'text-stone')}>
            {delta === null ? 'UT2 not entered' : `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta))} vs earlier`}
          </div>
          <div className="mt-2 flex h-[38px] items-end gap-1.5">
            {points.map((p, i) => (
              <div key={p.k} className="flex flex-1 flex-col items-center gap-0.5">
                <motion.div initial={{ height: 0 }} animate={{ height: `${((p.v ?? 0) / 100) * 30}px` }} transition={{ delay: i * 0.08, duration: 0.6 }}
                  className={cx('w-full rounded-t-[4px]', i === 2 ? (delta !== null && delta <= -8 ? 'bg-rust' : 'bg-forest') : 'bg-stone-p')} />
                <span className="text-[9.5px] text-stone">{p.k}</span>
              </div>
            ))}
          </div>
        </MCard>
      </div>

      <MSection title="Last 20 school days">
        <div className="flex gap-[3px] rounded-[14px] border border-line bg-ivory-2 p-3">
          {series.slice(-20).map((mk, i) => (
            <motion.span key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.015 }}
              className={cx('h-7 flex-1 origin-bottom rounded-[3px]', mk === 'A' ? 'bg-rust' : mk === 'L' ? 'bg-amber' : 'bg-forest-l/70')} />
          ))}
        </div>
      </MSection>

      <MSection title="Remarks" action={<span className="text-[12px] text-stone">Parents see these</span>}>
        {remarks.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line px-4 py-5 text-center text-[13.5px] text-stone">No remarks yet. A short note of praise goes a long way.</div>
        ) : (
          <MList>
            <AnimatePresence initial={false}>
              {remarks.map(r => (
                <motion.div key={r.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Pill tone={toneOf[r.tone]}>{r.tone === 'praise' ? 'Praise' : r.tone === 'concern' ? 'Concern' : 'Note'}</Pill>
                    <span className="text-[12px] text-stone">{r.staffId === ME ? 'You' : d.staff.find(x => x.id === r.staffId)?.name} · {ago(r.at)}</span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-snug text-ink">{r.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </MList>
        )}
      </MSection>

      <MSection title="Family">
        <MList>
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar name={parent?.name ?? 'Parent'} size={38} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium text-ink">{parent?.name ?? '—'}</div>
              <div className="text-[12.5px] text-stone">{parent?.relation} · {parent?.phone}</div>
            </div>
          </div>
        </MList>
      </MSection>

      <RemarkSheet open={remarking} student={s} onClose={() => setRemarking(false)} />
      <ComposeSheet open={composing} student={s} onClose={() => setComposing(false)} />
    </MobileScreen>
  )
}

function RemarkSheet({ open, student, onClose }: { open: boolean; student: Student; onClose: () => void }) {
  const me = useTeacher()
  const add = useSchool(s => s.addRemark)
  const toast = useToast()
  const [tone, setTone] = useState<Remark['tone']>('praise')
  const [text, setText] = useState('')
  const first = firstName(student.name)
  const starters: Record<Remark['tone'], string[]> = {
    praise: [`${first} explained a solution to the class today — clear and confident.`, `Very neat, complete work this week.`],
    note: [`${first} could use a little more practice with word problems.`, `Please check the Learn tab together this weekend.`],
    concern: [`${first} seems distracted in class lately. Could we check in at home?`, `Two homework submissions are missing this month.`],
  }
  const submit = () => {
    if (!text.trim()) return
    add(student.id, ME, me.subjects[0] ?? 'General', text.trim(), tone)
    toast(`Remark shared with ${first}’s family`)
    setText(''); setTone('praise')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`A note about ${first}`}
      footer={<Button block size="lg" variant={tone === 'concern' ? 'copper' : 'primary'} disabled={!text.trim()} onClick={submit}>Share with family</Button>}>
      <ChoiceChips group={`tone-${student.id}`} value={tone} onChange={t => { setTone(t); setText('') }}
        options={[{ id: 'praise', label: 'Praise' }, { id: 'note', label: 'Note' }, { id: 'concern', label: 'Concern' }]} />
      <div className="mt-3 space-y-2">
        {starters[tone].map(st => (
          <motion.button key={st} whileTap={{ scale: 0.98 }} onClick={() => setText(st)}
            className={cx('block min-h-[44px] w-full rounded-[12px] border px-3 py-2 text-left text-[13.5px]', text === st ? 'border-forest bg-forest-p text-forest' : 'border-line bg-paper/50 text-charcoal-2')}>{st}</motion.button>
        ))}
      </div>
      <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Or write your own…" className={cx(textareaClass, 'mt-3')} />
      <p className="mt-2 text-[12px] text-stone">{student.name}’s parents get this as a notification.</p>
    </Sheet>
  )
}

function ComposeSheet({ open, student, onClose }: { open: boolean; student: Student; onClose: () => void }) {
  const d = useData()
  const me = useTeacher()
  const start = useSchool(s => s.startThread)
  const nav = useMobileNav()
  const parent = d.parents.find(p => p.id === student.parentId)
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    const id = start({ kind: me.classTeacherOf === student.classId ? 'parent-class-teacher' : 'parent-subject-teacher', parentId: student.parentId, studentId: student.id, staffId: ME, subject: me.subjects[0] }, ME, text.trim())
    setText('')
    onClose()
    nav.push({ title: parent?.name ?? 'Parent', render: () => <ChatScreen threadId={id} /> })
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Message ${parent?.name ?? 'parent'}`}
      footer={<Button block size="lg" disabled={!text.trim()} onClick={submit}>Send</Button>}>
      <p className="mb-3 text-[13.5px] text-stone">About {student.name} · {student.classId}</p>
      <textarea autoFocus rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={`Hello, this is ${me.name} — ${firstName(student.name)}’s ${me.subjects[0] ?? ''} teacher…`} className={textareaClass} />
    </Sheet>
  )
}
