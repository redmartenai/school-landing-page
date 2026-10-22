import { useMemo, useState } from 'react'
import { ChevronRight, SearchX } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, Pill, Progress, Table, Td, Tr } from '@/components/ui'
import { useData } from '@/store/hooks'
import { feeStatus } from '@/engine/monitoring'
import { rupees } from '@/lib/format'
import { FEE_STATE, SearchInput, Select, feeState, nameOf, type FeeState } from './shared'
import { StudentFeeSheet } from './StudentFeeSheet'

const PAGE = 40

export function FeeLedger() {
  const d = useData()
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('all')
  const [status, setStatus] = useState<'all' | FeeState>('all')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return d.students
      .filter(s => cls === 'all' || s.classId === cls)
      .filter(s => status === 'all' || feeState(s) === status)
      .filter(s => !needle || s.name.toLowerCase().includes(needle) || s.admissionNo.toLowerCase().includes(needle) || nameOf(d, s.parentId).toLowerCase().includes(needle))
      .map(s => ({ s, f: feeStatus(s), st: feeState(s) }))
      .sort((a, b) => b.f.overdue - a.f.overdue || a.s.classId.localeCompare(b.s.classId, undefined, { numeric: true }) || a.s.rollNo - b.s.rollNo)
  }, [d, q, cls, status])

  const totals = rows.reduce((a, r) => ({ paid: a.paid + r.s.feePaid, total: a.total + r.s.feeTotal, overdue: a.overdue + r.f.overdue }), { paid: 0, total: 0, overdue: 0 })

  return (
    <Card padded={false}>
      <div className="flex flex-col gap-3 border-b border-line-2 p-4 md:flex-row md:items-center md:p-5">
        <SearchInput value={q} onChange={v => { setQ(v); setLimit(PAGE) }} placeholder="Search student, parent or admission no." className="md:max-w-[340px] md:flex-1" />
        <div className="flex flex-wrap gap-2">
          <Select label="Class" value={cls} onChange={v => { setCls(v); setLimit(PAGE) }} options={[{ value: 'all', label: 'All classes' }, ...d.classes.map(c => ({ value: c.id, label: `Class ${c.id}` }))]} />
          <Select<'all' | FeeState> label="Status" value={status} onChange={v => { setStatus(v); setLimit(PAGE) }} options={[
            { value: 'all', label: 'Any status' }, { value: 'overdue', label: 'Overdue' }, { value: 'partial', label: 'Up to date' }, { value: 'paid', label: 'Paid in full' },
          ]} />
        </div>
        <div className="text-[12.5px] text-stone md:ml-auto md:text-right">
          <span className="tabular">{rows.length}</span> students · <span className="tabular text-charcoal">{rupees(totals.paid)}</span> of {rupees(totals.total)}
          {totals.overdue > 0 && <> · <span className="tabular text-rust">{rupees(totals.overdue)} overdue</span></>}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No students match" body="Try a different class, status or spelling." action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setCls('all'); setStatus('all') }}>Clear filters</Button>} />
      ) : (
        <div className="px-4 pb-2 md:px-5">
          <Table head={['Student', 'Class', 'Paid vs annual fee', 'Overdue', 'Status', '']} className="[&_table]:min-w-[760px]">
            {rows.slice(0, limit).map(({ s, f, st }) => (
              <Tr key={s.id} onClick={() => setOpen(s.id)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} size={30} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{s.name}</div>
                      <div className="text-[12px] text-stone">{s.admissionNo}{s.scholarshipPct > 0 ? ` · ${s.scholarshipPct}% scholarship` : ''}</div>
                    </div>
                  </div>
                </Td>
                <Td className="tabular">{s.classId}</Td>
                <Td className="w-[260px]">
                  <div className="flex items-center justify-between text-[12.5px] tabular">
                    <span className="text-charcoal">{rupees(s.feePaid)}</span>
                    <span className="text-stone">{rupees(s.feeTotal)}</span>
                  </div>
                  <Progress value={f.paidPct} tone={st === 'overdue' ? 'rust' : 'forest'} className="mt-1.5" height={5} />
                </Td>
                <Td className={f.overdue ? 'font-semibold tabular text-rust' : 'tabular text-stone-l'}>{f.overdue ? rupees(f.overdue) : '—'}</Td>
                <Td><Pill tone={FEE_STATE[st].tone} dot>{FEE_STATE[st].label}</Pill></Td>
                <Td className="w-8 text-stone"><ChevronRight size={16} /></Td>
              </Tr>
            ))}
          </Table>
          {rows.length > limit && (
            <div className="flex justify-center py-4">
              <Button variant="outline" size="sm" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more · {rows.length - limit} left</Button>
            </div>
          )}
        </div>
      )}

      <StudentFeeSheet studentId={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
