import { IndianRupee, Lock, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Ring, Stat, Table, Td, Tr, cx } from '@/components/ui'
import { useData, useNow, usePulse } from '@/store/hooks'
import { RULES, feeStatus } from '@/engine/monitoring'
import { ago, rupees, rupeesShort } from '@/lib/format'
import { TwoCol } from '@/components/shell/Web'
import { BASE, HBar, pct0, useNameOf } from './shared'

export function FeesPage() {
  const d = useData()
  const p = usePulse()
  const now = useNow()
  const nameOf = useNameOf()
  const navigate = useNavigate()

  const defaulters = useMemo(() => d.students.map(s => ({ s, f: feeStatus(s) })).filter(x => x.f.overdue > 0).sort((a, b) => b.f.overdue - a.f.overdue), [d.students])
  const big = defaulters.filter(x => x.f.overdue > RULES.feeOverdue)
  const byClass = useMemo(() => d.classes.map(c => {
    const st = d.students.filter(s => s.classId === c.id)
    const total = st.reduce((a, s) => a + s.feeTotal, 0)
    const paid = st.reduce((a, s) => a + s.feePaid, 0)
    return { id: c.id, ratio: total ? paid / total : 0, overdue: st.reduce((a, s) => a + feeStatus(s).overdue, 0) }
  }), [d.classes, d.students])
  const payments = [...d.feePayments].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  const ratio = p.feeTotal ? p.feeCollected / p.feeTotal : 0

  return (
    <Page>
      <PageHeader eyebrow="Fees · view only"
        title={`${pct0(ratio)} of the year's fees collected`}
        subtitle={`${defaulters.length} families are behind on the 15 September instalment; ${big.length} owe more than ${rupees(RULES.feeOverdue)}.`}
        actions={<Pill tone="slate" icon={Lock}>Managed by Admin · Rakesh Menon</Pill>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <Ring value={ratio} size={78} stroke={7} tone="forest">
            <span className="font-display text-[19px] text-ink">{pct0(ratio)}</span>
          </Ring>
          <div>
            <div className="text-[13px] text-stone">Collected</div>
            <div className="font-display text-[22px] text-ink">{rupeesShort(p.feeCollected)}</div>
            <div className="text-[12px] text-stone">of {rupeesShort(p.feeTotal)}</div>
          </div>
        </Card>
        <Stat label="Overdue" value={p.feeOverdue} format={n => rupeesShort(Math.round(n))} sub={`${defaulters.length} families`} tone="rust" icon={IndianRupee} />
        <Stat label="This month" value={p.collectedThisMonth} format={n => rupeesShort(Math.round(n))} sub="October so far" tone="forest" icon={Wallet} />
        <Stat label="Still to come" value={p.feeTotal - p.feeCollected} format={n => rupeesShort(Math.round(n))} sub="incl. Term 3 instalment" tone="slate" />
      </div>

      <TwoCol
        main={
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="Top defaulters" title="Families most behind" action={<Pill tone="rust">{big.length} over {rupeesShort(RULES.feeOverdue)}</Pill>} />
            {defaulters.length === 0 ? <EmptyState icon={Wallet} title="Every family is up to date" /> : (
              <Table head={['Student', 'Class', 'Paid', 'Overdue', 'Parent']}>
                {defaulters.slice(0, 15).map(({ s, f }) => (
                  <Tr key={s.id} onClick={() => navigate(`${BASE}/students?s=${s.id}`)}>
                    <Td><div className="flex items-center gap-2.5"><Avatar name={s.name} size={28} /><span className="font-medium text-ink">{s.name}</span></div></Td>
                    <Td className="text-charcoal-2">{s.classId}</Td>
                    <Td className="tabular text-charcoal-2">{pct0(f.paidPct)}</Td>
                    <Td className={cx('tabular font-medium', f.overdue > RULES.feeOverdue ? 'text-rust' : 'text-copper-d')}>{rupees(f.overdue)}</Td>
                    <Td className="text-stone">{nameOf(s.parentId)}</Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        }
        side={<>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="By class" title="Collection" />
            <div className="space-y-2.5">
              {byClass.map(c => <HBar key={c.id} label={`Class ${c.id}`} value={c.ratio} max={1} tone={c.ratio >= 0.7 ? 'forest' : c.ratio >= 0.6 ? 'amber' : 'copper'} right={pct0(c.ratio)} sub={c.overdue ? `· ${rupeesShort(c.overdue)} overdue` : undefined} />)}
            </div>
          </Card>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="Recent" title="Payments received" />
            {payments.length === 0 ? <EmptyState icon={Wallet} title="No payments yet" /> : (
              <div className="divide-y divide-line-2">
                {payments.map(pay => (
                  <div key={pay.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] text-ink">{nameOf(pay.studentId)}</div>
                      <div className="text-[11.5px] text-stone">{pay.mode} · {pay.receiptNo} · {ago(pay.at, now)}</div>
                    </div>
                    <span className="tabular font-medium text-forest">{rupees(pay.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>}
      />
    </Page>
  )
}
