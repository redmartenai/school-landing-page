/* Results — attendance, marks and a report-card summary. Only her own numbers; class figures are averages. */
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'
import { AnimatedNumber, Ring, Sparkline, cx } from '@/components/ui'
import { MSection, MobileScreen } from '@/components/shell/Mobile'
import { attendanceRate, attendanceSeries, streak } from '@/engine/monitoring'
import type { Subject } from '@/data/types'
import { MARK_STYLE, Panel, SUBJECT_STYLE, SubjectGlyph, grade, staffName, teacherShort, useAttendanceWeeks, useStudent } from './shared'

const EXAMS = [
  { key: 'unitTest1', label: 'UT 1' },
  { key: 'term1', label: 'Term 1' },
  { key: 'unitTest2', label: 'UT 2' },
] as const

export function ResultsTab() {
  const { d, s, cls } = useStudent()
  const series = attendanceSeries(d, s)
  const rate = attendanceRate(series)
  const run = streak(d, s)
  const weeks = useAttendanceWeeks(4)
  const absences = series.filter(m => m === 'A').length

  /** UT2 is only hers to see once the school has published it. */
  const rows = useMemo(() => (Object.keys(s.marks) as Subject[]).map(subject => {
    const m = s.marks[subject]
    const exam = d.exams.find(e => e.classId === s.classId && e.subject === subject)
    const ut2Published = exam?.status === 'published' && m.unitTest2 !== null
    const ut2State = ut2Published ? 'published' : exam?.status === 'pending' || m.unitTest2 === null ? 'awaiting-marks' : 'awaiting-release'
    const vals = [m.unitTest1, m.term1, ...(ut2Published ? [m.unitTest2!] : [])]
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return { subject, m, ut2Published, ut2State, avg, latest: vals[vals.length - 1], delta: vals[vals.length - 1] - m.unitTest1 }
  }), [d.exams, s])

  const overall = rows.reduce((a, r) => a + r.avg, 0) / rows.length
  const best = [...rows].sort((a, b) => b.avg - a.avg)[0]
  const improved = [...rows].sort((a, b) => b.delta - a.delta)[0]
  const trend = [
    rows.reduce((a, r) => a + r.m.unitTest1, 0) / rows.length,
    rows.reduce((a, r) => a + r.m.term1, 0) / rows.length,
    ...(rows.some(r => r.ut2Published) ? [rows.filter(r => r.ut2Published).reduce((a, r) => a + r.m.unitTest2!, 0) / rows.filter(r => r.ut2Published).length] : []),
  ]
  const ctRemark = d.remarks.filter(r => r.studentId === s.id && r.tone !== 'concern').sort((a, b) => b.at.localeCompare(a.at))[0]
  const classTeacher = staffName(d, cls.classTeacherId)

  return (
    <MobileScreen title="Results" eyebrow={`${d.school.academicYear} · Grade ${s.classId}`}>
      {/* attendance */}
      <Panel className="p-4">
        <div className="flex items-center gap-4">
          <Ring value={rate} size={92} stroke={8} tone={rate >= 0.9 ? 'forest' : rate >= 0.75 ? 'amber' : 'rust'}>
            <div><div className="font-display text-[24px] leading-none text-ink"><AnimatedNumber value={rate * 100} format={n => `${Math.round(n)}`} /><span className="text-[14px]">%</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-stone">present</div></div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Attendance</div>
            <div className="mt-0.5 font-display text-[21px] leading-tight text-ink">{run} days in a row</div>
            <div className="mt-0.5 text-[13px] text-stone">{absences === 0 ? 'Not a single day missed.' : `${absences} day${absences > 1 ? 's' : ''} missed in the last ${series.length} school days.`}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 grid grid-cols-5 gap-1.5 text-center text-[10.5px] font-medium uppercase tracking-[0.08em] text-stone">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(x => <span key={x}>{x}</span>)}</div>
          <div className="space-y-1.5">
            {weeks.map((row, w) => (
              <div key={w} className="grid grid-cols-5 gap-1.5">
                {row.map((c, i) => (
                  <motion.div key={c.date} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 + (w * 5 + i) * 0.018, type: 'spring', stiffness: 400, damping: 26 }}
                    className={cx('grid h-8 place-items-center rounded-[8px] text-[12px] font-semibold tabular', MARK_STYLE[c.mark])}
                    title={c.date}>
                    {Number(c.date.slice(8))}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-stone">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-forest-l" /> Present</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-amber" /> Late</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-rust" /> Absent</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm border border-dashed border-copper" /> Today, register not in yet</span>
          </div>
        </div>
      </Panel>

      {/* insight */}
      <MSection>
        <Panel className="flex gap-3 border-copper/20 bg-copper-p/60 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-copper text-ivory"><Sparkles size={17} /></span>
          <div>
            <div className="font-display text-[17px] leading-snug text-ink">{best.subject} is your best subject</div>
            <div className="mt-0.5 text-[13.5px] leading-snug text-charcoal-2">
              {Math.round(best.avg)} average across {best.ut2Published ? 'three' : 'two'} papers.
              {improved.delta > 2 && improved.subject !== best.subject ? ` ${improved.subject} is climbing too — up ${Math.round(improved.delta)} since Unit Test 1.` : ''}
            </div>
          </div>
        </Panel>
      </MSection>

      {/* subjects */}
      <MSection title="Marks by subject" action={<span className="text-[12px] text-stone">out of 100</span>}>
        <div className="space-y-2.5">
          {rows.map((r, ri) => (
            <Panel key={r.subject} className="p-4">
              <div className="flex items-center gap-2.5">
                <SubjectGlyph subject={r.subject} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink">{r.subject}</div>
                  <div className="text-[12px] text-stone">{teacherShort(staffName(d, d.exams.find(e => e.classId === s.classId && e.subject === r.subject)?.teacherId ?? null))}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[22px] leading-none text-ink tabular">{Math.round(r.avg)}</div>
                  <div className="text-[11px] text-stone">grade {grade(r.avg)}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {EXAMS.map((e, ei) => {
                  const v = r.m[e.key]
                  const hidden = e.key === 'unitTest2' && !r.ut2Published
                  return (
                    <div key={e.key} className="flex items-center gap-2.5">
                      <span className="w-11 shrink-0 text-[11.5px] text-stone">{e.label}</span>
                      <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-line-2">
                        {!hidden && v !== null && (
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: SUBJECT_STYLE[r.subject].fg, opacity: 0.55 + ei * 0.2 }}
                            initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.9, delay: 0.15 + ri * 0.06 + ei * 0.08, ease: [0.16, 1, 0.3, 1] }} />
                        )}
                      </div>
                      <span className={cx('w-[74px] shrink-0 text-right text-[12.5px] tabular', hidden ? 'text-[#8a5f14]' : 'font-medium text-ink')}>
                        {hidden ? (r.ut2State === 'awaiting-marks' ? 'Being marked' : 'Out soon') : v}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          ))}
        </div>
      </MSection>

      {/* report card */}
      <MSection title="Report card · so far">
        <Panel className="overflow-hidden">
          <div className="flex items-end justify-between gap-3 border-b border-line-2 px-4 pb-3 pt-4">
            <div>
              <div className="text-[12px] text-stone">Overall</div>
              <div className="font-display text-[40px] leading-none text-ink"><AnimatedNumber value={overall} format={n => n.toFixed(1)} /><span className="text-[18px] text-stone">%</span></div>
              <div className="mt-1 text-[13px] text-forest">Grade {grade(overall)} · {d.school.board}</div>
            </div>
            <div className="text-right">
              <Sparkline data={trend} width={120} height={40} tone="forest" />
              <div className="mt-1 flex items-center justify-end gap-1 text-[11.5px] text-stone"><TrendingUp size={12} /> {trend.length === 3 ? 'UT1 → Term 1 → UT2' : 'UT1 → Term 1'}</div>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-line-2 text-center">
            {[
              { k: 'Attendance', v: `${Math.round(rate * 100)}%` },
              { k: 'House points', v: String(s.housePoints) },
              { k: 'Behaviour', v: s.behaviourIncidents === 0 ? 'Exemplary' : 'Good' },
            ].map(x => (
              <div key={x.k} className="px-2 py-3"><dt className="text-[11px] text-stone">{x.k}</dt><dd className="mt-0.5 font-display text-[16px] text-ink">{x.v}</dd></div>
            ))}
          </dl>
          {ctRemark && (
            <div className="border-t border-line-2 bg-paper/50 px-4 py-3.5">
              <p className="font-display text-[15.5px] italic leading-snug text-charcoal">“{ctRemark.text}”</p>
              <div className="mt-1.5 text-[12px] text-stone">{staffName(d, ctRemark.staffId)} · {ctRemark.subject}</div>
            </div>
          )}
          <div className="border-t border-line-2 px-4 py-2.5 text-[12px] text-stone">Class teacher: {classTeacher} · Term 2 report card on 14 December</div>
        </Panel>
      </MSection>
    </MobileScreen>
  )
}
