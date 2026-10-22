import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Card, EmptyState, PageHeader, Page, Pill, Tabs, Table, Td, Tr, cx, inputClass } from '@/components/ui'
import { useData } from '@/store/hooks'
import { attendanceRate, attendanceSeries, averageMark, feeStatus, studentRisk, type StudentRisk } from '@/engine/monitoring'
import { rupees } from '@/lib/format'
import type { Student } from '@/data/types'
import { StudentSheet } from './StudentSheet'
import { pct0, riskLabel, riskTone } from './shared'

type Level = 'all' | StudentRisk['level']
const factorTone = { attendance: 'rust', marks: 'copper', fees: 'amber', behaviour: 'slate', homework: 'stone' } as const

export interface StudentRow { s: Student; risk: StudentRisk; att: number; avg: number; overdue: number }

export function useStudentRows(): StudentRow[] {
  const d = useData()
  return useMemo(() => d.students.map(s => ({ s, risk: studentRisk(d, s), att: attendanceRate(attendanceSeries(d, s)), avg: averageMark(s), overdue: feeStatus(s).overdue }))
    .sort((a, b) => b.risk.score - a.risk.score || a.att - b.att), [d])
}

export function StudentsPage() {
  const d = useData()
  const rows = useStudentRows()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('all')
  const [level, setLevel] = useState<Level>('all')
  const [limit, setLimit] = useState(40)
  const openId = params.get('s')

  const scoped = rows.filter(r => (cls === 'all' || r.s.classId === cls) && (!q.trim() || `${r.s.name} ${r.s.admissionNo} ${r.s.classId}`.toLowerCase().includes(q.trim().toLowerCase())))
  const visible = scoped.filter(r => level === 'all' || r.risk.level === level)
  const count = (l: Level) => scoped.filter(r => l === 'all' || r.risk.level === l).length
  const atRisk = rows.filter(r => r.risk.level === 'at-risk').length

  return (
    <Page>
      <PageHeader eyebrow="Students" title={`${d.students.length} children, sorted by who needs you most`}
        subtitle={`Risk combines attendance, marks, fees, behaviour and homework into one number. ${atRisk} students are at risk today.`} />
      <Card padded={false} className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-[300px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or admission no." className={cx(inputClass, 'pl-9')} />
          </label>
          <select value={cls} onChange={e => setCls(e.target.value)} className={cx(inputClass, 'lg:w-[150px]')} aria-label="Class">
            <option value="all">All classes</option>
            {d.classes.map(c => <option key={c.id} value={c.id}>Class {c.id}</option>)}
          </select>
          <Tabs<Level> size="sm" className="lg:ml-auto" value={level} onChange={setLevel}
            tabs={[{ id: 'all', label: 'All', count: count('all') }, { id: 'at-risk', label: 'At risk', count: count('at-risk') }, { id: 'watch', label: 'Watch', count: count('watch') }, { id: 'ok', label: 'On track', count: count('ok') }]} />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={Users} title="No students match" body="Try another class, risk level or a shorter search." />
        ) : (
          <Table head={['Student', 'Class', 'Attendance', 'Average', 'Fees overdue', 'Risk', 'Why']}>
            {visible.slice(0, limit).map(r => (
              <Tr key={r.s.id} onClick={() => setParams({ s: r.s.id })}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.s.name} size={30} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{r.s.name}</div>
                      <div className="text-[11.5px] text-stone">Roll {r.s.rollNo} · {r.s.admissionNo}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-charcoal-2">{r.s.classId}</Td>
                <Td className={cx('tabular', r.att < 0.75 ? 'font-medium text-rust' : r.att < 0.85 ? 'text-[#8a5f14]' : 'text-charcoal-2')}>{pct0(r.att)}</Td>
                <Td className={cx('tabular', r.avg < 45 ? 'text-copper-d' : 'text-charcoal-2')}>{Math.round(r.avg)}</Td>
                <Td className={cx('tabular', r.overdue > 0 ? 'text-rust' : 'text-stone')}>{r.overdue ? rupees(r.overdue) : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-line-2">
                      <div className={cx('h-full rounded-full', r.risk.level === 'at-risk' ? 'bg-rust' : r.risk.level === 'watch' ? 'bg-amber' : 'bg-forest-l')} style={{ width: `${Math.max(4, r.risk.score)}%` }} />
                    </div>
                    <Pill tone={riskTone[r.risk.level]}>{riskLabel[r.risk.level]} · {r.risk.score}</Pill>
                  </div>
                </Td>
                <Td>
                  <div className="flex max-w-[340px] flex-wrap gap-1">
                    {r.risk.factors.length === 0 && <span className="text-[12px] text-stone">Nothing flagged</span>}
                    {r.risk.factors.slice(0, 3).map((f, i) => <Pill key={i} tone={factorTone[f.key]} className="!text-[11.5px]">{f.label}</Pill>)}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        {visible.length > limit && (
          <div className="mt-4 flex items-center justify-between text-[13px] text-stone">
            <span>Showing {limit} of {visible.length}</span>
            <button onClick={() => setLimit(l => l + 60)} className="font-medium text-forest hover:underline">Show more</button>
          </div>
        )}
      </Card>
      <StudentSheet id={openId} onClose={() => setParams({})} />
    </Page>
  )
}
