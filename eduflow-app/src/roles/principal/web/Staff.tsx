import { UserCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Ring, Tabs, cx, type Tone } from '@/components/ui'
import { useData } from '@/store/hooks'
import { teacherScorecard, type Scorecard } from '@/engine/monitoring'
import type { Staff } from '@/data/types'
import { Metric, pct0, staffStatusLabel, staffStatusTone, staffToday } from './shared'
import { StaffSheet } from './StaffSheet'

export const gradeTone: Record<Scorecard['grade'], Tone> = { Excellent: 'forest', Good: 'slate', 'Needs support': 'copper' }
const GRADE_RANK: Record<Scorecard['grade'], number> = { 'Needs support': 0, Good: 1, Excellent: 2 }

type TodayFilter = 'all' | 'present' | 'late' | 'leave' | 'absent'

export function StaffPage() {
  const d = useData()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<TodayFilter>('all')
  const today = d.school.today
  const openId = params.get('t')

  const cards = useMemo(() => d.staff.filter(s => s.role === 'teacher' && s.subjects.length)
    .map(t => ({ t, sc: teacherScorecard(d, t), day: staffToday(t, today) }))
    .sort((a, b) => GRADE_RANK[a.sc.grade] - GRADE_RANK[b.sc.grade] || (a.sc.grade === 'Needs support' ? a.sc.score - b.sc.score : b.sc.score - a.sc.score)), [d, today])

  const roster = d.staff.map(s => ({ s, day: staffToday(s, today) }))
  const counts = { all: roster.length, present: 0, late: 0, leave: 0, absent: 0 } as Record<TodayFilter, number>
  for (const r of roster) if (r.day) counts[r.day.status]++
  const visibleRoster = roster.filter(r => filter === 'all' || r.day?.status === filter)
    .sort((a, b) => ['absent', 'leave', 'late', 'present'].indexOf(a.day?.status ?? 'present') - ['absent', 'leave', 'late', 'present'].indexOf(b.day?.status ?? 'present'))
  const needs = cards.filter(c => c.sc.grade === 'Needs support').length

  return (
    <Page>
      <PageHeader eyebrow="Staff" title={needs ? `${needs} teachers could use your support` : 'Your teachers are doing well'}
        subtitle="Scorecards blend punctuality, marks on time, homework reviewed, parent reply time and how their classes moved in Unit Test 2." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {cards.map(({ t, sc, day }) => <ScoreCard key={t.id} t={t} sc={sc} status={day?.status} onOpen={() => setParams({ t: t.id })} />)}
          {cards.length === 0 && <Card className="sm:col-span-2"><EmptyState icon={Users} title="No teachers on record" /></Card>}
        </div>

        <Card padded={false} className="h-fit p-4 md:p-5">
          <CardHeader eyebrow="Today" title="Who is in" action={<Pill tone="forest" icon={UserCheck}>{counts.present + counts.late}/{roster.length}</Pill>} />
          <Tabs<TodayFilter> size="sm" className="mb-3" value={filter} onChange={setFilter}
            tabs={[{ id: 'all', label: 'All', count: counts.all }, { id: 'absent', label: 'Absent', count: counts.absent }, { id: 'leave', label: 'Leave', count: counts.leave }, { id: 'late', label: 'Late', count: counts.late }, { id: 'present', label: 'In', count: counts.present }]} />
          <div className="divide-y divide-line-2">
            {visibleRoster.map(({ s, day }) => (
              <button key={s.id} onClick={() => setParams({ t: s.id })} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/40">
                <Avatar name={s.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-ink">{s.name}</div>
                  <div className="truncate text-[11.5px] text-stone">{s.designation}</div>
                </div>
                <div className="text-right">
                  {day ? <Pill tone={staffStatusTone[day.status]} dot>{staffStatusLabel[day.status]}</Pill> : <Pill>—</Pill>}
                  <div className="mt-0.5 tabular text-[11px] text-stone">{day?.checkIn ?? 'No check-in'}</div>
                </div>
              </button>
            ))}
            {visibleRoster.length === 0 && <EmptyState icon={UserCheck} title="Nobody in this group" body="That's good news for this filter." />}
          </div>
        </Card>
      </div>
      <StaffSheet id={openId} onClose={() => setParams({})} />
    </Page>
  )
}

function ScoreCard({ t, sc, status, onOpen }: { t: Staff; sc: Scorecard; status?: 'present' | 'late' | 'absent' | 'leave'; onOpen: () => void }) {
  const tone = gradeTone[sc.grade]
  return (
      <Card interactive onClick={onOpen} className={cx('h-full', sc.grade === 'Needs support' && 'border-copper/40')}>
        <div className="flex items-start gap-3">
          <Ring value={sc.score / 100} size={58} stroke={5} tone={tone}>
            <span className="font-display text-[19px] text-ink">{sc.score}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ink">{t.name}</div>
            <div className="truncate text-[12px] text-stone">{t.subjects[0]}{t.classTeacherOf ? ` · Class teacher ${t.classTeacherOf}` : ''}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Pill tone={tone}>{sc.grade}</Pill>
              {status && status !== 'present' && <Pill tone={staffStatusTone[status]} dot>{staffStatusLabel[status]} today</Pill>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2.5">
          <Metric label="On time" value={pct0(sc.punctuality)} tone={sc.punctuality < 0.8 ? 'copper' : undefined} />
          <Metric label="Marks on time" value={pct0(sc.marksOnTime)} tone={sc.pendingMarks ? 'rust' : undefined} />
          <Metric label="HW reviewed" value={pct0(sc.reviewRate)} tone={sc.reviewRate < 0.6 ? 'copper' : undefined} />
          <Metric label="Parent reply" value={`${sc.replyHours}h`} tone={sc.replyHours >= 24 ? 'rust' : undefined} />
          <Metric label="Class result" value={`${sc.classAvgDelta >= 0 ? '+' : '−'}${Math.abs(sc.classAvgDelta).toFixed(1)}`} tone={sc.classAvgDelta < -3 ? 'rust' : sc.classAvgDelta > 0 ? 'forest' : undefined} />
          <Metric label="Waiting" value={sc.unanswered ? `${sc.unanswered} parents` : '—'} tone={sc.unanswered ? 'copper' : undefined} />
        </div>
      </Card>
  )
}
