import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleCheck, IndianRupee, Lock, ShieldAlert, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Stat, listItem, severityTone, toneClass, cx } from '@/components/ui'
import { TwoCol } from '@/components/shell/Web'
import { useAlerts, useData, useMe, useNow, usePulse } from '@/store/hooks'
import { ago, dateLabel, firstName, greeting, monthLabel, rupees, rupeesShort } from '@/lib/format'
import { ADMIN_APPROVAL_KINDS, gross, nameOf, net } from './shared'
import { ApprovalList } from './ApprovalList'
import { RunAction, RunStepper } from './PayrollStatus'
import { FunnelBars, funnelStats } from './AdmissionFunnel'

export function Overview() {
  const d = useData()
  const me = useMe('admin')
  const now = useNow()
  const pulse = usePulse()
  const alerts = useAlerts()
  const nav = useNavigate()
  const today = now.slice(0, 10)

  const money = useMemo(() => {
    const todays = d.feePayments.filter(p => p.at.startsWith(today))
    const month = d.feePayments.filter(p => p.at.startsWith(today.slice(0, 7)))
    // last 14 days of collections for the sparkline
    const days = Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(today + 'T00:00:00')
      dt.setDate(dt.getDate() - 13 + i)
      const key = dt.toLocaleDateString('en-CA')
      return d.feePayments.filter(p => p.at.startsWith(key)).reduce((a, p) => a + p.amount, 0)
    })
    return {
      today: todays.reduce((a, p) => a + p.amount, 0),
      todayCount: todays.length,
      month: month.reduce((a, p) => a + p.amount, 0),
      monthCount: month.length,
      trend: days,
    }
  }, [d.feePayments, today])

  const overdueFamilies = d.students.filter(s => Math.round((s.feeTotal * 2) / 3) - s.feePaid > 0).length
  const run = d.payrollRuns.find(r => r.month === today.slice(0, 7)) ?? d.payrollRuns[d.payrollRuns.length - 1]
  const grossTotal = d.staff.reduce((a, s) => a + gross(s.salary), 0)
  const netTotal = d.staff.reduce((a, s) => a + net(s.salary), 0)
  const desk = d.approvals.filter(a => a.status === 'pending' && (ADMIN_APPROVAL_KINDS as readonly string[]).includes(a.kind)).length
  const finance = alerts.filter(a => a.domain === 'finance')
  const sensitive = d.audit.filter(a => a.sensitive).slice(0, 6)
  const funnel = funnelStats(d.admissions)

  const focus = [
    money.today > 0 ? `${rupees(money.today)} collected so far today` : 'No fee collections yet today',
    `${overdueFamilies} families are behind on fees`,
    run.status === 'draft' ? `${monthLabel(run.month).split(' ')[0]} payroll is still a draft` : run.status === 'processed' ? `${monthLabel(run.month).split(' ')[0]} salaries are ready to release` : `${monthLabel(run.month).split(' ')[0]} salaries are paid`,
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={`Admin office · ${dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        title={`${greeting(now)}, ${firstName(me.name)}.`}
        subtitle={`${focus.join(', ')}.`}
        actions={<>
          <Button variant="outline" icon={IndianRupee} onClick={() => nav('/admin/fees')}>Record a payment</Button>
          <Button icon={Wallet} onClick={() => nav('/admin/payroll')}>Open payroll</Button>
        </>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected today" value={money.today} format={rupees} tone="forest" icon={IndianRupee} sub={`${money.todayCount} receipt${money.todayCount === 1 ? '' : 's'} issued`} trend={money.trend} />
        <Stat label={`Collected in ${monthLabel(today.slice(0, 7)).split(' ')[0]}`} value={money.month} format={rupeesShort} tone="forest" icon={TrendingUp} sub={`${money.monthCount} payments this month`} />
        <Stat label="Overdue fees" value={pulse.feeOverdue} format={rupeesShort} tone="rust" icon={TriangleAlert} sub={`${overdueFamilies} families · due since 15 Sep`} />
        <Stat label="Waiting on you" value={desk} tone={desk ? 'copper' : 'forest'} icon={CircleCheck} sub="Refunds, expenses & admissions" />
      </div>

      <TwoCol
        main={<>
          <Card>
            <CardHeader eyebrow="Payroll" title={`${monthLabel(run.month)} salaries`}
              action={<Pill tone={run.status === 'paid' ? 'forest' : run.status === 'processed' ? 'amber' : 'copper'} dot>{run.status === 'draft' ? 'Draft' : run.status === 'processed' ? 'Awaiting release' : 'Paid'}</Pill>} />
            <div className="grid gap-5 md:grid-cols-[1fr_1.3fr] md:items-center">
              <div>
                <div className="font-display text-[34px] leading-none text-ink tabular">{rupees(netTotal)}</div>
                <div className="mt-1.5 text-[13px] text-stone">Net pay for {run.staffCount} staff · gross {rupees(grossTotal)}</div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <RunAction run={run} />
                  <Link to="/admin/payroll" className="inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">Review salaries <ArrowRight size={14} /></Link>
                </div>
              </div>
              <RunStepper run={run} />
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Your desk" title={desk ? `${desk} decision${desk === 1 ? '' : 's'} waiting on you` : 'Nothing waiting on you'} />
            <ApprovalList kinds={ADMIN_APPROVAL_KINDS} emptyTitle="Desk is clear" emptyBody="Refunds, expenses and admission approvals will land here." />
          </Card>

          <Card>
            <CardHeader eyebrow="Admissions 2027–28" title={`${funnel.total} families in the pipeline`}
              action={<Link to="/admin/admissions" className="inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">Open pipeline <ArrowRight size={14} /></Link>} />
            <FunnelBars list={d.admissions} compact />
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px] text-stone">
              <Pill tone="forest">{funnel.enrolled} enrolled</Pill>
              <Pill tone="slate">{Math.round(funnel.conversion * 100)}% enquiry → enrolment</Pill>
              {funnel.dropped > 0 && <Pill tone="stone">{funnel.dropped} dropped</Pill>}
            </div>
          </Card>
        </>}
        side={<>
          <Card>
            <CardHeader eyebrow="Finance watch" title="What the engine flagged" />
            {finance.length === 0 && <EmptyState icon={CircleCheck} title="No finance alerts" body="Every family is within the overdue threshold." />}
            {finance.map(a => (
              <div key={a.id}>
                <div className="flex items-start gap-2.5">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneClass[severityTone[a.severity]].dot)} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-ink">{a.headline}</div>
                    <p className="mt-0.5 text-[12.5px] text-stone">{a.why}</p>
                    <div className="mt-1 text-[11.5px] text-stone-l">Owner: {a.owner} · escalates to {a.escalatesTo}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {a.items.slice(0, 5).map(it => (
                    <div key={it.id} className="flex items-center justify-between gap-3 rounded-[9px] px-2 py-1.5 hover:bg-paper/70">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-charcoal">{it.label}</div>
                        <div className="text-[11.5px] text-stone">{it.sub}</div>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold tabular text-rust">{it.value}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="danger" className="mt-3" block iconRight={ArrowRight} onClick={() => nav('/admin/fees?tab=defaulters')}>
                  {a.items.length > 5 ? `See all ${a.items.length} and send reminders` : 'Send reminders'}
                </Button>
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader eyebrow="Audit" title="Recent sensitive actions"
              action={<Link to="/admin/audit" className="inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">Full log <ArrowRight size={14} /></Link>} />
            {sensitive.length === 0 && <EmptyState icon={Lock} title="Nothing sensitive yet" />}
            <AnimatePresence initial={false}>
              {sensitive.map(e => (
                <motion.div key={e.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" className="flex gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <Avatar name={nameOf(d, e.actorId)} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-charcoal"><span className="font-medium text-ink">{nameOf(d, e.actorId)}</span> · {e.action.toLowerCase()}</div>
                    <div className="truncate text-[12px] text-stone">{e.target}</div>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-stone-l">{ago(e.at, now)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-paper/70 px-3 py-2 text-[12px] text-stone">
              <ShieldAlert size={14} className="shrink-0 text-copper" /> Entries are append-only. Nobody — including you — can edit them.
            </div>
          </Card>
        </>}
      />
    </Page>
  )
}
