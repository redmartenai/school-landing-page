import { Printer } from 'lucide-react'
import { Avatar, Button, Pill, Sheet } from '@/components/ui'
import { useData } from '@/store/hooks'
import { dateLabel, monthLabel, rupees } from '@/lib/format'
import type { PayrollRun } from '@/data/types'
import { deductions, deptOf, gross, net } from './shared'

const words = (n: number) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ' ' + a[x % 10] : ''}`)
  const three = (x: number) => (x >= 100 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' + two(x % 100) : ''}` : two(x))
  const parts: string[] = []
  const lakh = Math.floor(n / 1e5), thousand = Math.floor((n % 1e5) / 1e3), rest = n % 1e3
  if (lakh) parts.push(`${two(lakh)} Lakh`)
  if (thousand) parts.push(`${two(thousand)} Thousand`)
  if (rest) parts.push(three(rest))
  return parts.join(' ') || 'Zero'
}

export function Payslip({ staffId, month, status, onClose }: { staffId: string | null; month: string; status: PayrollRun['status']; onClose: () => void }) {
  const d = useData()
  const s = staffId ? d.staff.find(x => x.id === staffId) : null
  const days = s?.attendance ?? []
  const present = days.filter(x => x.status === 'present' || x.status === 'late').length
  const leave = days.filter(x => x.status === 'leave').length
  const absent = days.filter(x => x.status === 'absent').length

  return (
    <Sheet open={!!s} onClose={onClose} title="Payslip"
      footer={<div className="flex items-center justify-between gap-3">
        <Pill tone={status === 'paid' ? 'forest' : status === 'processed' ? 'amber' : 'copper'} dot>{status === 'paid' ? 'Credited' : status === 'processed' ? 'Generated · awaiting release' : 'Draft preview'}</Pill>
        <Button size="sm" variant="outline" icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>}>
      {s && (
        <div className="rounded-[12px] border border-line bg-ivory p-5 font-sans">
          <div className="flex items-start justify-between gap-4 border-b border-ink/80 pb-3">
            <div>
              <div className="font-display text-[19px] text-ink">{d.school.name}</div>
              <div className="text-[12px] text-stone">{d.school.city} · {d.school.board}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.14em] text-stone">Payslip</div>
              <div className="font-display text-[16px] text-ink">{monthLabel(month)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-4">
            <Avatar name={s.name} size={42} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink">{s.name}</div>
              <div className="text-[12.5px] text-stone">{s.designation} · {deptOf(s)}</div>
            </div>
            <div className="text-right text-[12px] text-stone">
              <div>Emp. ID <span className="tabular text-charcoal">{s.id.toUpperCase()}</span></div>
              <div>Joined {dateLabel(s.joinDate, { month: 'short', year: 'numeric' })}</div>
              <div>{s.bank}</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[['Days worked', present], ['Leave', leave], ['Absent', absent]].map(([k, v]) => (
              <div key={k} className="rounded-[9px] bg-paper/70 py-2">
                <div className="font-display text-[18px] tabular text-ink">{v}</div>
                <div className="text-[11px] text-stone">{k} · 30 days</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 border-b border-line pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest">Earnings</div>
              <Line k="Basic" v={s.salary.basic} />
              <Line k="House rent allowance" v={s.salary.hra} />
              <Line k="Other allowances" v={s.salary.allowances} />
              <Line k="Gross earnings" v={gross(s.salary)} strong />
            </div>
            <div>
              <div className="mb-1 border-b border-line pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-copper-d">Deductions</div>
              <Line k="Provident fund (12%)" v={s.salary.pf} />
              <Line k="ESI" v={s.salary.esi} />
              <Line k="TDS" v={s.salary.tds} />
              <Line k="Total deductions" v={deductions(s.salary)} strong />
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3 rounded-[10px] bg-forest-p px-4 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-forest">Net pay</div>
              <div className="text-[11.5px] text-forest/80">Rupees {words(net(s.salary))} only</div>
            </div>
            <div className="font-display text-[28px] leading-none tabular text-forest">{rupees(net(s.salary))}</div>
          </div>
          <p className="mt-3 text-center text-[11px] text-stone-l">Computer-generated payslip · no signature required</p>
        </div>
      )}
    </Sheet>
  )
}

const Line = ({ k, v, strong }: { k: string; v: number; strong?: boolean }) => (
  <div className={`flex justify-between py-1 text-[13px] ${strong ? 'mt-1 border-t border-line-2 pt-1.5 font-semibold text-ink' : 'text-charcoal'}`}>
    <span className={strong ? '' : 'text-stone'}>{k}</span>
    <span className="tabular">{v ? rupees(v) : '—'}</span>
  </div>
)
