import { motion } from 'framer-motion'
import { useRef } from 'react'
import { Bus, Mail, MessageSquare, Phone } from 'lucide-react'
import { Avatar, Eyebrow, Pill, Progress, Ring, Sheet, cx, ease, toneClass } from '@/components/ui'
import { useData, useNow, useStudentRisk } from '@/store/hooks'
import { attendanceRate, attendanceSeries, feeStatus, marksTrend, streak } from '@/engine/monitoring'
import { ago, dateLabel, rupees } from '@/lib/format'
import type { Subject } from '@/data/types'
import { AttendanceStrip, Legend, Metric, pct0, riskLabel, riskTone, useNameOf } from './shared'

const SHORT: Record<Subject, string> = { Mathematics: 'Maths', Science: 'Science', English: 'English', Hindi: 'Hindi', 'Social Studies': 'SST', 'Computer Science': 'CS' }

export function StudentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const d = useData()
  const last = useRef(id)
  if (id) last.current = id // keep content while the dialog animates out
  const s = last.current ? d.students.find(x => x.id === last.current) : undefined
  const open = !!id && d.students.some(x => x.id === id)
  return (
    <Sheet open={open} onClose={onClose} variant="dialog" title={s ? s.name : ''}>
      {s && <StudentDetail id={s.id} />}
    </Sheet>
  )
}

function StudentDetail({ id }: { id: string }) {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const risk = useStudentRisk(id)!
  const s = d.students.find(x => x.id === id)!
  const parent = d.parents.find(p => p.id === s.parentId)
  const cls = d.classes.find(c => c.id === s.classId)
  const series = attendanceSeries(d, s)
  const rate = attendanceRate(series)
  const fee = feeStatus(s)
  const trend = marksTrend(s)
  const remarks = d.remarks.filter(r => r.studentId === s.id).sort((a, b) => b.at.localeCompare(a.at))
  const dates = [...d.school.schoolDays, d.school.today]
  const subjects = Object.keys(s.marks) as Subject[]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={s.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] text-charcoal-2">Class {s.classId} · Roll {s.rollNo} · {s.house} House</div>
          <div className="text-[12.5px] text-stone">Class teacher {nameOf(cls?.classTeacherId)} {s.busId && <>· <Bus size={12} className="inline" /> Bus {s.busId}</>}</div>
        </div>
        <Ring value={risk.score / 100} size={58} stroke={5} tone={riskTone[risk.level]}>
          <div className="leading-none"><div className="font-display text-[18px] text-ink">{risk.score}</div><div className="text-[9.5px] text-stone">risk</div></div>
        </Ring>
      </div>

      <section className={cx('rounded-[12px] p-3.5', toneClass[riskTone[risk.level]].bg)}>
        <div className={cx('mb-2 text-[13px] font-medium', toneClass[riskTone[risk.level]].text)}>{riskLabel[risk.level]}{risk.factors.length ? ' — here is why' : ' — nothing flagged'}</div>
        <div className="flex flex-wrap gap-1.5">
          {risk.factors.map((f, i) => <span key={i} className="rounded-full bg-ivory-2/80 px-2.5 py-1 text-[12px] text-charcoal">{f.label} <span className="text-stone">+{f.weight}</span></span>)}
          {risk.factors.length === 0 && <span className="text-[12.5px] text-charcoal-2">Attendance, marks, fees and homework are all on track.</span>}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <Eyebrow className="!mb-0">Attendance · last {series.length} school days</Eyebrow>
          <span className={cx('tabular text-[13px] font-medium', rate < 0.75 ? 'text-rust' : 'text-forest')}>{pct0(rate)} · {streak(d, s)}-day streak</span>
        </div>
        <AttendanceStrip marks={series} dates={dates} todayIndex={series.length > s.attendance.length ? series.length - 1 : undefined} size={12} />
        <div className="mt-2"><Legend items={[{ label: 'Present', className: 'bg-forest-l' }, { label: 'Late', className: 'bg-amber' }, { label: 'Absent', className: 'bg-rust' }]} /></div>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <Eyebrow className="!mb-0">Marks · UT1 / Term 1 / UT2</Eyebrow>
          <span className={cx('tabular text-[13px] font-medium', trend.delta <= -12 ? 'text-rust' : trend.delta < 0 ? 'text-copper-d' : 'text-forest')}>
            {trend.delta >= 0 ? '+' : '−'}{Math.abs(Math.round(trend.delta))} pts vs before
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {subjects.map(k => {
            const m = s.marks[k]
            const vals: [string, number | null, string][] = [['UT1', m.unitTest1, 'bg-stone-p'], ['T1', m.term1, 'bg-stone-l'], ['UT2', m.unitTest2, m.unitTest2 === null ? '' : m.unitTest2 < (m.unitTest1 + m.term1) / 2 - 10 ? 'bg-rust' : 'bg-forest-l']]
            return (
              <div key={k} className="rounded-[10px] border border-line-2 p-2">
                <div className="flex h-[62px] items-end justify-center gap-1">
                  {vals.map(([lbl, v, c], i) => v === null ? (
                    <div key={lbl} title="UT2 not entered" className="flex h-full w-3 items-end"><div className="h-[10px] w-3 rounded-t-[3px] border border-dashed border-amber" /></div>
                  ) : (
                    <motion.div key={lbl} title={`${lbl}: ${v}`} className={cx('w-3 rounded-t-[3px]', c)} initial={{ height: 0 }} animate={{ height: `${(v / 100) * 62}px` }} transition={{ duration: 0.6, delay: i * 0.06, ease: ease.out }} />
                  ))}
                </div>
                <div className="mt-1.5 text-center text-[11.5px] font-medium text-charcoal">{SHORT[k]}</div>
                <div className="text-center text-[11px] tabular text-stone">{m.unitTest2 ?? 'pending'}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-line-2 p-3.5">
          <Eyebrow>Fees · managed by Admin</Eyebrow>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-[20px] text-ink">{rupees(s.feePaid)}</span>
            <span className="text-[12px] text-stone">of {rupees(s.feeTotal)}</span>
          </div>
          <Progress value={fee.paidPct} tone={fee.overdue ? 'rust' : 'forest'} />
          <div className={cx('mt-2 text-[12.5px]', fee.overdue ? 'text-rust' : 'text-forest')}>{fee.overdue ? `${rupees(fee.overdue)} overdue since 15 Sep` : 'Up to date'}{s.scholarshipPct ? ` · ${s.scholarshipPct}% scholarship` : ''}</div>
        </div>
        <div className="rounded-[12px] border border-line-2 p-3.5">
          <Eyebrow>Parent</Eyebrow>
          {parent ? (
            <>
              <div className="font-medium text-ink">{parent.name} <span className="font-normal text-stone">· {parent.relation}</span></div>
              <a href={`tel:${parent.phone.replace(/\s/g, '')}`} className="mt-1.5 flex items-center gap-2 text-[13px] text-charcoal-2 hover:text-forest"><Phone size={13} /> {parent.phone}</a>
              <a href={`mailto:${parent.email}`} className="mt-1 flex items-center gap-2 truncate text-[13px] text-charcoal-2 hover:text-forest"><Mail size={13} /> {parent.email}</a>
              {parent.childIds.length > 1 && <div className="mt-1.5 text-[12px] text-stone">Also parent of {parent.childIds.filter(c => c !== s.id).map(c => nameOf(c)).join(', ')}</div>}
            </>
          ) : <div className="text-[13px] text-stone">No parent on record.</div>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 rounded-[12px] bg-paper/60 p-3.5">
        <Metric label="Behaviour notes" value={s.behaviourIncidents} tone={s.behaviourIncidents >= 3 ? 'rust' : undefined} />
        <Metric label="House points" value={s.housePoints} />
        <Metric label="Date of birth" value={dateLabel(s.dob, { day: 'numeric', month: 'short', year: 'numeric' })} />
      </section>

      <section>
        <Eyebrow>Remarks</Eyebrow>
        {remarks.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-line px-3 py-4 text-[13px] text-stone"><MessageSquare size={14} /> No remarks yet this term.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-line-2 pl-4">
            {remarks.map(r => (
              <li key={r.id} className="relative">
                <span className={cx('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-ivory-2', r.tone === 'praise' ? 'bg-forest-l' : r.tone === 'concern' ? 'bg-rust' : 'bg-slate-l')} />
                <div className="text-[13.5px] text-ink">{r.text}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-stone">
                  {nameOf(r.staffId)} · {r.subject} · {ago(r.at, now)}
                  <Pill tone={r.tone === 'praise' ? 'forest' : r.tone === 'concern' ? 'rust' : 'slate'} className="!py-0 !text-[10.5px]">{r.tone}</Pill>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
