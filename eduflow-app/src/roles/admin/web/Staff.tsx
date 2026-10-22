import { useMemo, useState } from 'react'
import { CalendarDays, SearchX, UserCheck, Users } from 'lucide-react'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Stat, Table, Td, Tr, cx, toneClass, type Tone } from '@/components/ui'
import { TwoCol } from '@/components/shell/Web'
import { useData } from '@/store/hooks'
import { dateLabel } from '@/lib/format'
import type { Staff } from '@/data/types'
import { DEPT_TONE, SearchInput, Segmented, deptOf, type Dept } from './shared'
import { ApprovalList } from './ApprovalList'

type Today = { label: string; tone: Tone; sub?: string }

export function StaffPage() {
  const d = useData()
  const today = d.school.today
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'all' | Dept>('all')

  const todayOf = (s: Staff): Today => {
    const leave = d.approvals.find(a => a.kind === 'leave' && a.requestedBy === s.id && a.from && a.to && a.from <= today && a.to >= today && a.status !== 'rejected')
    if (leave?.status === 'approved') return { label: 'On leave', tone: 'amber', sub: leave.title }
    if (leave) return { label: 'Leave requested', tone: 'amber', sub: 'Awaiting decision' }
    const last = s.attendance[s.attendance.length - 1]
    if (last?.date === today) {
      if (last.status === 'absent') return { label: 'Absent', tone: 'rust', sub: 'No check-in, no leave' }
      if (last.status === 'leave') return { label: 'On leave', tone: 'amber' }
      if (last.status === 'late') return { label: 'Late', tone: 'copper', sub: `In at ${last.checkIn}` }
      return { label: 'In', tone: 'forest', sub: `In at ${last.checkIn}` }
    }
    return { label: 'On duty', tone: 'forest', sub: last?.checkIn ? `Last in ${last.checkIn} · ${dateLabel(last.date)}` : undefined }
  }

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return d.staff
      .filter(s => dept === 'all' || deptOf(s) === dept)
      .filter(s => !n || s.name.toLowerCase().includes(n) || s.designation.toLowerCase().includes(n))
      .map(s => {
        const on = s.attendance.filter(a => a.status === 'present').length
        const worked = s.attendance.filter(a => a.status === 'present' || a.status === 'late').length
        return { s, punctual: worked ? on / worked : 1, late: s.attendance.filter(a => a.status === 'late').length }
      })
  }, [d.staff, q, dept])

  const onLeave = d.staff.filter(s => todayOf(s).label === 'On leave').length
  const pendingLeave = d.approvals.filter(a => a.kind === 'leave' && a.status === 'pending').length
  const lowBalance = d.staff.filter(s => s.leaveBalance <= 5).length

  return (
    <Page>
      <PageHeader eyebrow="Staff & HR" title="Your people"
        subtitle={`${d.staff.length} on the rolls — teachers, office, support and drivers. ${onLeave ? `${onLeave} on leave today. ` : ''}${pendingLeave} leave request${pendingLeave === 1 ? '' : 's'} need a decision.`} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="On the rolls" value={d.staff.length} icon={Users} tone="slate" sub={(['Teaching', 'Administration', 'Support', 'Drivers'] as Dept[]).map(x => `${d.staff.filter(s => deptOf(s) === x).length} ${x.toLowerCase()}`).join(' · ')} />
        <Stat label="On leave today" value={onLeave} icon={CalendarDays} tone="amber" sub={`${pendingLeave} requests waiting`} />
        <Stat label="Low leave balance" value={lowBalance} icon={UserCheck} tone={lowBalance ? 'copper' : 'forest'} sub="5 days or fewer left" />
      </div>

      <TwoCol
        main={
          <Card padded={false}>
            <div className="flex flex-col gap-3 border-b border-line-2 p-4 md:flex-row md:items-center md:p-5">
              <SearchInput value={q} onChange={setQ} placeholder="Search name or designation" className="md:max-w-[300px] md:flex-1" />
              <Segmented id="staff-dept" value={dept} onChange={setDept} options={[{ value: 'all', label: 'All' }, { value: 'Teaching', label: 'Teaching' }, { value: 'Administration', label: 'Office' }, { value: 'Support', label: 'Support' }, { value: 'Drivers', label: 'Drivers' }]} />
            </div>
            {rows.length === 0 ? <EmptyState icon={SearchX} title="Nobody matches" body="Try another name or department." /> : (
              <div className="px-4 pb-2 md:px-5">
                <Table head={['Name', 'Department', 'Joined', 'Leave left', 'Punctual · 30d', 'Today']} className="[&_table]:min-w-[780px]">
                  {rows.map(({ s, punctual, late }) => {
                    const t = todayOf(s)
                    const dep = deptOf(s)
                    return (
                      <Tr key={s.id}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.name} size={30} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-ink">{s.name}</div>
                              <div className="truncate text-[12px] text-stone">{s.designation}</div>
                            </div>
                          </div>
                        </Td>
                        <Td><span className="inline-flex items-center gap-1.5 text-[13px]"><span className={cx('h-1.5 w-1.5 rounded-full', toneClass[DEPT_TONE[dep]].dot)} />{dep}</span></Td>
                        <Td className="text-[13px] tabular text-stone">{dateLabel(s.joinDate, { month: 'short', year: 'numeric' })}</Td>
                        <Td className={cx('tabular', s.leaveBalance <= 5 ? 'font-medium text-copper-d' : 'text-charcoal')}>{s.leaveBalance} days</Td>
                        <Td>
                          <span className={cx('tabular', punctual < 0.8 ? 'font-medium text-copper-d' : 'text-charcoal')}>{Math.round(punctual * 100)}%</span>
                          {late > 0 && <span className="text-[12px] text-stone"> · {late} late</span>}
                        </Td>
                        <Td>
                          <Pill tone={t.tone} dot>{t.label}</Pill>
                          {t.sub && <div className="mt-0.5 text-[11.5px] text-stone">{t.sub}</div>}
                        </Td>
                      </Tr>
                    )
                  })}
                </Table>
              </div>
            )}
          </Card>
        }
        side={
          <Card>
            <CardHeader eyebrow="Leave requests" title={pendingLeave ? `${pendingLeave} waiting for you` : 'All decided'} />
            <ApprovalList kinds={['leave']} emptyTitle="No leave requests" emptyBody="New requests from the staff app land here instantly." />
          </Card>
        }
      />
    </Page>
  )
}
