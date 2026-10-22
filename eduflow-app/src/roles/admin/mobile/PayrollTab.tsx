import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, Pill, Sheet } from '@/components/ui'
import { useData } from '@/store/hooks'
import type { Staff, StaffRole } from '@/data/types'
import { monthLabel, rupees, rupeesShort } from '@/lib/format'
import { PayrollCard } from './PayrollCard'
import { currentRun, deductions, grossPay, netPay } from './lib'

const GROUPS: { label: string; roles: StaffRole[] }[] = [
  { label: 'Teaching', roles: ['teacher'] },
  { label: 'Office', roles: ['admin', 'accountant', 'support'] },
  { label: 'Transport', roles: ['driver'] },
]

export function PayrollTab() {
  const d = useData()
  const [openId, setOpenId] = useState<string | null>(null)
  const run = currentRun(d)
  const past = useMemo(() => [...d.payrollRuns].sort((a, b) => b.month.localeCompare(a.month)).filter(r => r.id !== run?.id), [d.payrollRuns, run?.id])
  const open = d.staff.find(s => s.id === openId) ?? null

  return (
    <MobileScreen eyebrow={run ? `${run.staffCount} staff` : 'Payroll'} title="Payroll">
      <PayrollCard detailed />

      {GROUPS.map(g => {
        const people = d.staff.filter(s => g.roles.includes(s.role)).sort((a, b) => netPay(b) - netPay(a))
        if (!people.length) return null
        return (
          <MSection key={g.label} title={g.label} action={<span className="tabular text-[12.5px] text-stone">{rupeesShort(people.reduce((a, s) => a + netPay(s), 0))}</span>}>
            <MList>
              {people.map(s => (
                <MRow key={s.id} onClick={() => setOpenId(s.id)} icon={<Avatar name={s.name} size={34} />} title={s.name} sub={s.designation}
                  right={<span className="flex shrink-0 items-center gap-1"><span className="font-display tabular text-[15px] text-ink">{rupees(netPay(s))}</span><ChevronRight size={15} className="text-stone-l" /></span>} />
              ))}
            </MList>
          </MSection>
        )
      })}

      {past.length > 0 && (
        <MSection title="Earlier runs">
          <MList>
            {past.map(r => (
              <MRow key={r.id} title={monthLabel(r.month)} sub={`${r.staffCount} staff · ${rupees(r.total)}`}
                right={<Pill tone={r.status === 'paid' ? 'forest' : 'amber'}>{r.status === 'paid' ? 'Paid' : r.status === 'processed' ? 'Processed' : 'Draft'}</Pill>} />
            ))}
          </MList>
        </MSection>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? `Payslip · ${run ? monthLabel(run.month) : ''}` : ''}>
        {open && <Payslip s={open} status={run?.status ?? 'draft'} />}
      </Sheet>
    </MobileScreen>
  )
}

function Payslip({ s, status }: { s: Staff; status: 'draft' | 'processed' | 'paid' }) {
  const last30 = s.attendance.slice(-30)
  const count = (k: string) => last30.filter(a => a.status === k).length
  const lines: [string, number][] = [['Basic', s.salary.basic], ['HRA', s.salary.hra], ['Allowances', s.salary.allowances]]
  const deds: [string, number][] = [['Provident fund', s.salary.pf], ['ESI', s.salary.esi], ['TDS', s.salary.tds]]
  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={s.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-medium text-ink">{s.name}</div>
          <div className="truncate text-[12.5px] text-stone">{s.designation} · {s.bank}</div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[16px] bg-forest-p px-4 py-3.5">
        <div className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-forest">Net pay</div>
        <div className="mt-0.5 font-display tabular text-[34px] leading-none text-forest-d">{rupees(netPay(s))}</div>
        <div className="mt-1 text-[12.5px] text-forest">{status === 'paid' ? `Credited to ${s.bank}` : status === 'processed' ? 'Processed · releases with the run' : 'Draft · not yet processed'}</div>
      </motion.div>

      <Block title="Earnings" rows={lines} total={['Gross', grossPay(s)]} />
      <Block title="Deductions" rows={deds} total={['Total deductions', deductions(s)]} negative />

      <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
        {[['Present', count('present'), 'text-forest'], ['Late', count('late'), 'text-[#8a5f14]'], ['Leave', count('leave'), 'text-slate'], ['Absent', count('absent'), 'text-rust']].map(([k, v, c]) => (
          <div key={k as string} className="rounded-[10px] bg-paper/70 py-2">
            <div className={`font-display tabular text-[18px] leading-none ${c}`}>{v}</div>
            <div className="mt-1 text-[11px] text-stone">{k}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-stone">Last 30 working days · {s.leaveBalance} leave days left</p>
    </div>
  )
}

function Block({ title, rows, total, negative }: { title: string; rows: [string, number][]; total: [string, number]; negative?: boolean }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">{title}</div>
      <div className="divide-y divide-line-2 rounded-[14px] border border-line bg-ivory">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-3.5 py-2 text-[14px]">
            <span className="text-charcoal-2">{k}</span>
            <span className="tabular text-ink">{v ? `${negative ? '− ' : ''}${rupees(v)}` : '—'}</span>
          </div>
        ))}
        <div className="flex justify-between px-3.5 py-2 text-[14px] font-medium">
          <span className="text-ink">{total[0]}</span>
          <span className="tabular text-ink">{negative ? '− ' : ''}{rupees(total[1])}</span>
        </div>
      </div>
    </div>
  )
}
