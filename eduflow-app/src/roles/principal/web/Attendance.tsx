import { motion } from 'framer-motion'
import { BellRing, CalendarCheck, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Stat, cx, ease, useToast } from '@/components/ui'
import { useData, usePulse } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { RULES, attendanceRate, attendanceSeries } from '@/engine/monitoring'
import { dateLabel } from '@/lib/format'
import { TwoCol } from '@/components/shell/Web'
import { BASE, HEX, ME, pct0, useNameOf } from './shared'

export function AttendancePage() {
  const d = useData()
  const p = usePulse()
  const nameOf = useNameOf()
  const navigate = useNavigate()
  const nudge = useSchool(s => s.nudge)
  const toast = useToast()

  const byClass = d.classes.map(c => {
    const r = d.registers.find(x => x.classId === c.id)
    const v = r ? Object.values(r.marks) : []
    return { c, r, present: v.filter(m => m === 'P').length, late: v.filter(m => m === 'L').length, absent: v.filter(m => m === 'A').length, total: c.studentIds.length }
  })

  const below = useMemo(() => d.students.map(s => ({ s, r: attendanceRate(attendanceSeries(d, s)) })).filter(x => x.r < RULES.attendanceRisk).sort((a, b) => a.r - b.r), [d])
  const slipping = useMemo(() => d.students
    .map(s => ({ s, recent: attendanceRate(s.attendance.slice(-15)), prior: attendanceRate(s.attendance.slice(0, -15)) }))
    .filter(x => x.prior - x.recent >= RULES.slipDrop && attendanceRate(attendanceSeries(d, x.s)) >= RULES.attendanceRisk)
    .sort((a, b) => (b.prior - b.recent) - (a.prior - a.recent)), [d])

  const avg60 = p.attendanceTrend.reduce((a, b) => a + b, 0) / (p.attendanceTrend.length || 1)
  const absentToday = byClass.reduce((a, b) => a + b.absent, 0)

  const remind = (classId: string, tid: string) => {
    nudge(tid, `Register for ${classId}`, `Class ${classId} hasn't taken the register yet. — Dr. Iyer`, ME)
    toast(`Reminded ${nameOf(tid)}`)
  }

  return (
    <Page>
      <PageHeader eyebrow="Attendance" title={p.attendanceToday === null ? 'No registers yet today' : `${pct0(p.attendanceToday)} of children are in school`}
        subtitle={`${p.registersMarked} of ${p.registersTotal} registers taken. ${below.length} students are below ${RULES.attendanceRisk * 100}% for the term and ${slipping.length} have started slipping.`} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Present today" value={p.presentToday} sub={`of ${p.markedToday} marked`} tone="forest" />
        <Stat label="Absent today" value={absentToday} sub="across marked classes" tone={absentToday > 20 ? 'rust' : 'amber'} />
        <Stat label="60-day average" value={avg60 * 100} format={n => `${n.toFixed(1)}%`} tone="slate" trend={p.attendanceTrend.map(x => x * 100)} />
        <Stat label="Below 75%" value={below.length} sub="exam eligibility at risk" tone="rust" />
      </div>

      <TwoCol
        main={<>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="Today" title="By classroom" />
            <div className="divide-y divide-line-2">
              {byClass.map(({ c, r, present, late, absent, total }) => (
                <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
                  <span className="w-12 font-display text-[19px] text-ink">{c.id}</span>
                  <div className="min-w-0 flex-1">
                    {r?.markedAt ? (
                      <>
                        <div className="mb-1.5 flex h-2.5 overflow-hidden rounded-full bg-line-2">
                          <motion.div className="bg-forest-l" initial={{ width: 0 }} animate={{ width: `${(present / total) * 100}%` }} transition={{ duration: 0.8, ease: ease.out }} />
                          <motion.div className="bg-amber" initial={{ width: 0 }} animate={{ width: `${(late / total) * 100}%` }} transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }} />
                          <motion.div className="bg-rust" initial={{ width: 0 }} animate={{ width: `${(absent / total) * 100}%` }} transition={{ duration: 0.8, ease: ease.out, delay: 0.2 }} />
                        </div>
                        <div className="text-[12px] text-stone">{present} present{late ? `, ${late} late` : ''}, {absent} absent · {nameOf(r.markedBy)} at {r.markedAt.slice(11, 16)}</div>
                      </>
                    ) : (
                      <div className="text-[13px] text-copper-d">Not marked yet · {nameOf(c.classTeacherId)}</div>
                    )}
                  </div>
                  {r?.markedAt
                    ? <span className="w-12 text-right tabular font-medium text-ink">{pct0((present + late) / total)}</span>
                    : <Button size="sm" variant="outline" icon={BellRing} onClick={() => remind(c.id, c.classTeacherId)}>Remind</Button>}
                </div>
              ))}
            </div>
          </Card>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="Last 60 school days" title="School-wide attendance" action={<Pill tone="slate">avg {pct0(avg60)}</Pill>} />
            <TrendChart data={p.attendanceTrend} dates={d.school.schoolDays} />
          </Card>
        </>}
        side={<>
          <StudentList title={`Below ${RULES.attendanceRisk * 100}%`} eyebrow="Term attendance" tone="rust" empty="Every child is above the line."
            rows={below.map(({ s, r }) => ({ id: s.id, name: s.name, sub: `${s.classId} · Roll ${s.rollNo}`, value: pct0(r) }))} onOpen={id => navigate(`${BASE}/students?s=${id}`)} />
          <StudentList title="Starting to slip" eyebrow="Last 3 weeks vs before" tone="copper" icon empty="Nobody has dropped sharply."
            rows={slipping.map(({ s, recent, prior }) => ({ id: s.id, name: s.name, sub: `${s.classId} · was ${pct0(prior)}`, value: pct0(recent) }))} onOpen={id => navigate(`${BASE}/students?s=${id}`)} />
        </>}
      />
    </Page>
  )
}

function StudentList({ title, eyebrow, rows, tone, empty, onOpen, icon }: {
  title: string; eyebrow: string; rows: { id: string; name: string; sub: string; value: string }[]; tone: 'rust' | 'copper'; empty: string; onOpen: (id: string) => void; icon?: boolean
}) {
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow={eyebrow} title={title} action={<Pill tone={tone}>{rows.length}</Pill>} />
      {rows.length === 0 ? <EmptyState icon={CalendarCheck} title="All clear" body={empty} /> : (
        <div className="scroll-quiet max-h-[380px] divide-y divide-line-2 overflow-y-auto">
          {rows.map(r => (
            <button key={r.id} onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/40">
              <Avatar name={r.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div>
                <div className="truncate text-[11.5px] text-stone">{r.sub}</div>
              </div>
              <span className={cx('inline-flex items-center gap-1 tabular text-[13px] font-medium', tone === 'rust' ? 'text-rust' : 'text-copper-d')}>
                {icon && <TrendingDown size={13} />}{r.value}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function TrendChart({ data, dates }: { data: number[]; dates: string[] }) {
  const W = 640, H = 200, L = 34, R = 8, T = 10, B = 24
  const lo = Math.min(0.7, Math.floor(Math.min(...data) * 20) / 20)
  const hi = 1
  const x = (i: number) => L + (i / Math.max(1, data.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const path = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks = [lo, 0.75, 0.9, 1].filter((v, i, a) => v >= lo && a.indexOf(v) === i)
  const labels = [0, Math.floor(data.length / 2), data.length - 1]
  if (data.length < 2) return <EmptyState icon={CalendarCheck} title="Not enough days yet" />
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="School attendance over the last 60 school days">
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0.75 ? HEX.rust : HEX.line2} strokeDasharray={t === 0.75 ? '4 4' : undefined} strokeWidth={1} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill={t === 0.75 ? HEX.rust : HEX.stone}>{Math.round(t * 100)}%</text>
        </g>
      ))}
      <motion.path d={`${path} L${x(data.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill={HEX.forestP} initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ duration: 0.8, delay: 0.4 }} />
      <motion.path d={path} fill="none" stroke={HEX.forestL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: ease.out }} />
      {data.map((v, i) => v < 0.85 && <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={HEX.copper}><title>{`${dateLabel(dates[i] ?? '')} · ${Math.round(v * 100)}%`}</title></circle>)}
      {labels.map(i => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill={HEX.stone}>{dates[i] ? dateLabel(dates[i]) : ''}</text>)}
    </svg>
  )
}
