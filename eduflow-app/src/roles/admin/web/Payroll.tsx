import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, CalendarClock, ChevronRight, FileText, Users, Wallet } from 'lucide-react'
import { Avatar, Card, CardHeader, Page, PageHeader, Pill, Stat, Table, Td, Tr, cx, ease, toneClass } from '@/components/ui'
import { TwoCol } from '@/components/shell/Web'
import { useData } from '@/store/hooks'
import { dateLabel, monthLabel, rupees, rupeesShort, time } from '@/lib/format'
import { DEPT_TONE, deptOf, gross, net, type Dept } from './shared'
import { RunAction, RunStepper } from './PayrollStatus'
import { Payslip } from './Payslip'

const DEPTS: Dept[] = ['Teaching', 'Administration', 'Support', 'Drivers']

export function PayrollPage() {
  const d = useData()
  const [slip, setSlip] = useState<string | null>(null)
  const month = d.school.today.slice(0, 7)
  const run = d.payrollRuns.find(r => r.month === month) ?? d.payrollRuns[d.payrollRuns.length - 1]
  const past = d.payrollRuns.filter(r => r.id !== run.id).sort((a, b) => b.month.localeCompare(a.month))

  const rows = useMemo(() => [...d.staff].sort((a, b) => DEPTS.indexOf(deptOf(a)) - DEPTS.indexOf(deptOf(b)) || gross(b.salary) - gross(a.salary)), [d.staff])
  const tot = rows.reduce((a, s) => ({
    basic: a.basic + s.salary.basic, hra: a.hra + s.salary.hra, allow: a.allow + s.salary.allowances, gross: a.gross + gross(s.salary),
    pf: a.pf + s.salary.pf, esi: a.esi + s.salary.esi, tds: a.tds + s.salary.tds, net: a.net + net(s.salary),
  }), { basic: 0, hra: 0, allow: 0, gross: 0, pf: 0, esi: 0, tds: 0, net: 0 })

  const byDept = DEPTS.map(dep => {
    const ss = rows.filter(s => deptOf(s) === dep)
    return { dep, count: ss.length, gross: ss.reduce((a, s) => a + gross(s.salary), 0) }
  }).filter(x => x.count)

  const statusLine = run.status === 'draft'
    ? `Draft is ready for review. Processing generates ${run.staffCount} payslips and tells Dr. Iyer.`
    : run.status === 'processed' ? 'Payslips are generated. Release salaries once the bank file is uploaded.' : 'Salaries are credited. Every payslip is in the staff app.'

  return (
    <Page>
      <PageHeader eyebrow="Payroll" title={`${monthLabel(run.month)} payroll`} subtitle={statusLine} actions={<RunAction run={run} />} />

      <Card className="mb-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <div className="text-[13px] text-stone">Net payout</div>
            <motion.div key={run.status} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-display text-[40px] leading-none text-ink tabular">{rupees(tot.net)}</motion.div>
            <div className="mt-1.5 text-[13px] text-stone">{run.staffCount} staff · gross {rupees(tot.gross)} · deductions {rupees(tot.gross - tot.net)}</div>
            {run.processedAt && <div className="mt-1 text-[12px] text-stone-l">Processed {dateLabel(run.processedAt)} at {time(run.processedAt)}</div>}
          </div>
          <RunStepper run={run} />
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Gross salaries" value={tot.gross} format={rupeesShort} tone="slate" icon={Wallet} sub={`Basic ${rupeesShort(tot.basic)} · HRA ${rupeesShort(tot.hra)}`} />
        <Stat label="Statutory deductions" value={tot.pf + tot.esi + tot.tds} format={rupeesShort} tone="copper" icon={FileText} sub={`PF ${rupeesShort(tot.pf)} · ESI ${rupeesShort(tot.esi)} · TDS ${rupeesShort(tot.tds)}`} />
        <Stat label="Staff on payroll" value={rows.length} tone="forest" icon={Users} sub={byDept.map(x => `${x.count} ${x.dep.toLowerCase()}`).join(' · ')} />
      </div>

      <TwoCol
        main={
          <Card padded={false}>
            <div className="px-5 pt-5"><CardHeader eyebrow="Salary register" title="Every salary, line by line" action={<span className="text-[12px] text-stone">Tap a row for the payslip</span>} /></div>
            <div className="px-5 pb-3">
              <Table head={['Staff', 'Basic', 'HRA', 'Allow.', 'Gross', 'PF', 'ESI', 'TDS', 'Net']} className="[&_table]:min-w-[860px]">
                {rows.map(s => (
                  <Tr key={s.id} onClick={() => setSlip(s.id)}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size={28} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{s.name}</div>
                          <div className="flex items-center gap-1.5 text-[11.5px] text-stone"><span className={cx('h-1.5 w-1.5 rounded-full', toneClass[DEPT_TONE[deptOf(s)]].dot)} />{s.designation.split(' · ')[0]}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="tabular">{rupees(s.salary.basic)}</Td>
                    <Td className="tabular">{rupees(s.salary.hra)}</Td>
                    <Td className="tabular">{rupees(s.salary.allowances)}</Td>
                    <Td className="tabular font-medium text-ink">{rupees(gross(s.salary))}</Td>
                    <Td className="tabular text-stone">{rupees(s.salary.pf)}</Td>
                    <Td className="tabular text-stone">{s.salary.esi ? rupees(s.salary.esi) : '—'}</Td>
                    <Td className="tabular text-stone">{s.salary.tds ? rupees(s.salary.tds) : '—'}</Td>
                    <Td className="tabular font-semibold text-forest">
                      <span className="inline-flex items-center gap-1">{rupees(net(s.salary))}<ChevronRight size={14} className="text-stone-l" /></span>
                    </Td>
                  </Tr>
                ))}
                <tr className="bg-paper/60 font-semibold text-ink">
                  <td className="px-3 py-3 pl-0 text-[12px] uppercase tracking-[0.08em]">Total · {rows.length}</td>
                  {[tot.basic, tot.hra, tot.allow, tot.gross, tot.pf, tot.esi, tot.tds].map((v, i) => <td key={i} className="px-3 py-3 tabular">{rupees(v)}</td>)}
                  <td className="px-3 py-3 tabular text-forest">{rupees(tot.net)}</td>
                </tr>
              </Table>
            </div>
          </Card>
        }
        side={<>
          <Card>
            <CardHeader eyebrow="Cost by department" title={`${rupees(tot.gross)} a month`} />
            <div className="space-y-4">
              {byDept.map((x, i) => (
                <div key={x.dep}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="text-charcoal">{x.dep} <span className="text-stone">· {x.count}</span></span>
                    <span className="tabular text-ink">{rupees(x.gross)} <span className="text-stone">· {Math.round((x.gross / tot.gross) * 100)}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line-2">
                    <motion.div className={cx('h-full rounded-full', toneClass[DEPT_TONE[x.dep]].dot)} initial={{ width: 0 }} animate={{ width: `${(x.gross / tot.gross) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.08, ease: ease.out }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="History" title="Previous runs" />
            {past.map(r => (
              <div key={r.id} className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', r.status === 'paid' ? 'bg-forest-p text-forest' : 'bg-amber-p text-[#8a5f14]')}>
                  {r.status === 'paid' ? <BadgeCheck size={17} /> : <CalendarClock size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink">{monthLabel(r.month)}</div>
                  <div className="text-[12px] text-stone">{r.staffCount} staff{r.processedAt ? ` · processed ${dateLabel(r.processedAt)}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] tabular text-ink">{rupees(r.total)}</div>
                  <Pill tone={r.status === 'paid' ? 'forest' : 'amber'}>{r.status === 'paid' ? 'Paid' : r.status === 'processed' ? 'Processed' : 'Draft'}</Pill>
                </div>
              </div>
            ))}
            {past.length === 0 && <p className="py-6 text-center text-[13px] text-stone">This is the first payroll run.</p>}
          </Card>
        </>}
      />

      <Payslip staffId={slip} month={run.month} status={run.status} onClose={() => setSlip(null)} />
    </Page>
  )
}

