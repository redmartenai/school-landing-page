import { motion } from 'framer-motion'
import { Mail, Phone, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { Avatar, Button, Eyebrow, Pill, Ring, Sheet, cx, ease, inputClass, useToast } from '@/components/ui'
import { useData, useNow, useScorecard } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { unansweredThreads } from '@/engine/monitoring'
import { ago, dateLabel, firstName } from '@/lib/format'
import type { StaffDay } from '@/data/types'
import { Legend, ME, Metric, pct0, staffStatusLabel, staffStatusTone, staffToday } from './shared'

const DAY_BG: Record<StaffDay['status'], string> = { present: 'bg-forest-l', late: 'bg-amber', absent: 'bg-rust', leave: 'bg-slate-l' }

export function StaffSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const d = useData()
  const last = useRef(id)
  if (id) last.current = id
  const s = last.current ? d.staff.find(x => x.id === last.current) : undefined
  const open = !!id && d.staff.some(x => x.id === id)
  return (
    <Sheet open={open} onClose={onClose} variant="dialog" title={s?.name ?? ''}>
      {s && <StaffDetail key={s.id} id={s.id} />}
    </Sheet>
  )
}

function StaffDetail({ id }: { id: string }) {
  const d = useData()
  const now = useNow()
  const sc = useScorecard(id)
  const nudge = useSchool(st => st.nudge)
  const toast = useToast()
  const s = d.staff.find(x => x.id === id)!
  const today = staffToday(s, d.school.today)
  const isTeacher = s.role === 'teacher' && s.subjects.length > 0 && sc
  const pendingExams = d.exams.filter(e => e.teacherId === id && e.status === 'pending')
  const waiting = unansweredThreads(d, id)
  const sentNotes = d.events.filter(e => e.kind === 'nudge' && e.actorId === ME && e.text.includes(`nudged ${s.name}:`)).slice(0, 3)
  const late = s.attendance.filter(a => a.status === 'late').length
  const first = firstName(s.name)

  const templates = [
    pendingExams.length ? `Could you submit Unit Test 2 marks for ${pendingExams.map(e => e.classId).join(', ')} today? Report cards are waiting.` : null,
    waiting.length ? `${waiting.length} parent${waiting.length > 1 ? 's are' : ' is'} waiting more than a day for a reply. Could you get back to them before lunch?` : null,
    sc && sc.unreviewed >= 10 ? `There are ${sc.unreviewed} homework submissions waiting for feedback. Please review them this week.` : null,
    today?.status === 'absent' ? 'I noticed you have not checked in today and there is no leave request. Please call the office.' : null,
    `Thank you for your work this week, ${first}. It shows.`,
  ].filter((x): x is string => !!x)
  const [text, setText] = useState(templates[0])

  const send = () => {
    if (!text.trim()) return
    nudge(id, 'A note from Dr. Iyer', text.trim(), ME)
    toast(`Note sent to ${s.name}`)
    setText('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={s.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] text-charcoal-2">{s.designation}{s.classTeacherOf ? ` · Class teacher ${s.classTeacherOf}` : ''}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {today && <Pill tone={staffStatusTone[today.status]} dot>{staffStatusLabel[today.status]}{today.checkIn ? ` · ${today.checkIn}` : ''}</Pill>}
            {s.classIds.length > 0 && <Pill tone="stone">Teaches {s.classIds.length <= 5 ? s.classIds.join(', ') : `${s.classIds.length} classes`}</Pill>}
          </div>
        </div>
        {isTeacher && (
          <Ring value={sc.score / 100} size={58} stroke={5} tone={sc.grade === 'Excellent' ? 'forest' : sc.grade === 'Good' ? 'slate' : 'copper'}>
            <span className="font-display text-[18px] text-ink">{sc.score}</span>
          </Ring>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <Eyebrow className="!mb-0">Check-ins · last {s.attendance.length} working days</Eyebrow>
          <span className={cx('text-[12.5px] tabular', late >= 5 ? 'text-copper-d' : 'text-stone')}>{late} late</span>
        </div>
        <div className="flex flex-wrap gap-[4px]">
          {s.attendance.map((a, i) => (
            <motion.div key={a.date} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.012, duration: 0.25, ease: ease.out }}
              title={`${dateLabel(a.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${staffStatusLabel[a.status]}${a.checkIn ? ` · ${a.checkIn}` : ''}`}
              className={cx('h-7 w-[14px] rounded-[4px]', DAY_BG[a.status], i === s.attendance.length - 1 && 'ring-2 ring-ink/40 ring-offset-1 ring-offset-ivory-2')} />
          ))}
        </div>
        <div className="mt-2"><Legend items={[{ label: 'On time', className: 'bg-forest-l' }, { label: 'Late', className: 'bg-amber' }, { label: 'Leave', className: 'bg-slate-l' }, { label: 'Absent', className: 'bg-rust' }]} /></div>
      </section>

      {isTeacher && (
        <section className="grid grid-cols-3 gap-3 rounded-[12px] bg-paper/60 p-3.5">
          <Metric label="Punctuality" value={pct0(sc.punctuality)} tone={sc.punctuality < 0.8 ? 'copper' : undefined} />
          <Metric label="Marks on time" value={pct0(sc.marksOnTime)} tone={sc.pendingMarks ? 'rust' : undefined} />
          <Metric label="Homework reviewed" value={pct0(sc.reviewRate)} tone={sc.reviewRate < 0.6 ? 'copper' : undefined} />
          <Metric label="Avg parent reply" value={`${sc.replyHours} h`} tone={sc.replyHours >= 24 ? 'rust' : undefined} />
          <Metric label="Class result Δ" value={`${sc.classAvgDelta >= 0 ? '+' : '−'}${Math.abs(sc.classAvgDelta).toFixed(1)} pts`} tone={sc.classAvgDelta < -3 ? 'rust' : undefined} />
          <Metric label="Leave balance" value={`${s.leaveBalance} days`} />
        </section>
      )}

      {(pendingExams.length > 0 || waiting.length > 0 || (sc?.unreviewed ?? 0) > 0) && (
        <section>
          <Eyebrow>Open with {first}</Eyebrow>
          <ul className="space-y-1.5 text-[13.5px]">
            {pendingExams.length > 0 && <li className="flex items-center gap-2 text-rust"><span className="h-1.5 w-1.5 rounded-full bg-rust" />Unit Test 2 marks pending for {pendingExams.map(e => e.classId).join(', ')}</li>}
            {waiting.length > 0 && <li className="flex items-center gap-2 text-copper-d"><span className="h-1.5 w-1.5 rounded-full bg-copper" />{waiting.length} parent message{waiting.length > 1 ? 's' : ''} waiting 24h+</li>}
            {sc && sc.unreviewed > 0 && <li className="flex items-center gap-2 text-charcoal-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" />{sc.unreviewed} homework submissions unreviewed</li>}
          </ul>
        </section>
      )}

      <section className="rounded-[12px] border border-line p-3.5">
        <Eyebrow>Send a note</Eyebrow>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {templates.map(t => (
            <button key={t} onClick={() => setText(t)} className={cx('max-w-full truncate rounded-full border px-2.5 py-1 text-[12px] transition-colors', text === t ? 'border-forest-l bg-forest-p text-forest' : 'border-line text-charcoal-2 hover:bg-paper')}>
              {t.length > 46 ? t.slice(0, 46) + '…' : t}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder={`Write to ${first}…`} className={cx(inputClass, 'h-auto resize-none py-2.5')} />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3 text-[12.5px] text-stone">
            <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-forest"><Phone size={13} />Call</a>
            {s.email && <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 hover:text-forest"><Mail size={13} />Email</a>}
          </div>
          <Button size="sm" icon={Send} disabled={!text.trim()} onClick={send}>Send to {first}</Button>
        </div>
        {sentNotes.length > 0 && (
          <div className="mt-3 border-t border-line-2 pt-2.5 text-[12px] text-stone">
            {sentNotes.map(e => <div key={e.id} className="truncate">Sent {ago(e.at, now)} · {e.text.split(': ').slice(1).join(': ')}</div>)}
          </div>
        )}
      </section>
    </div>
  )
}
