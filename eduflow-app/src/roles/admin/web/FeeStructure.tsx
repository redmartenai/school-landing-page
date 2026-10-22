import { useMemo } from 'react'
import { Award } from 'lucide-react'
import { Avatar, Card, CardHeader, EmptyState, Pill, Table, Td, Tr } from '@/components/ui'
import { useData } from '@/store/hooks'
import { dateLabel, rupees } from '@/lib/format'
import { INSTALMENTS, annualFee } from './shared'

export function FeeStructure() {
  const d = useData()
  const grades = useMemo(() => [...new Set(d.classes.map(c => c.grade))].sort((a, b) => a - b).map(g => {
    const kids = d.students.filter(s => d.classes.find(c => c.id === s.classId)?.grade === g)
    return { grade: g, fee: annualFee(g), students: kids.length, billed: kids.reduce((a, s) => a + s.feeTotal, 0), sections: d.classes.filter(c => c.grade === g).map(c => c.section).join(', ') }
  }), [d.classes, d.students])

  const scholars = useMemo(() => d.students.filter(s => s.scholarshipPct > 0).map(s => {
    const g = d.classes.find(c => c.id === s.classId)?.grade ?? 0
    return { s, full: annualFee(g), waived: annualFee(g) - s.feeTotal }
  }).sort((a, b) => b.s.scholarshipPct - a.s.scholarshipPct || b.waived - a.waived), [d.students, d.classes])
  const waived = scholars.reduce((a, x) => a + x.waived, 0)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader eyebrow="2026–27 schedule" title="Annual fee by grade" />
        <Table head={['Grade', 'Annual fee', ...INSTALMENTS.map(i => `${i.label} · ${dateLabel(i.due)}`), 'Students']}>
          {grades.map(g => (
            <Tr key={g.grade}>
              <Td><span className="font-medium text-ink">Grade {g.grade}</span> <span className="text-[12px] text-stone">· {g.sections}</span></Td>
              <Td className="font-display text-[16px] tabular text-ink">{rupees(g.fee)}</Td>
              {INSTALMENTS.map(i => <Td key={i.label} className="tabular text-charcoal">{rupees(Math.round(g.fee / 3))}</Td>)}
              <Td className="tabular text-stone">{g.students}</Td>
            </Tr>
          ))}
        </Table>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {INSTALMENTS.map(i => {
            const past = i.due <= d.school.today
            return (
              <div key={i.label} className="rounded-[10px] border border-line bg-paper/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">{i.label}</span>
                  <Pill tone={past ? 'forest' : 'amber'} dot>{past ? 'Billed' : 'Upcoming'}</Pill>
                </div>
                <div className="mt-1 text-[12px] text-stone">Due {dateLabel(i.due, { day: 'numeric', month: 'long', year: 'numeric' })} · one third of the annual fee</div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[12px] text-stone">Transport is billed separately per route.</p>
      </Card>

      <Card>
        <CardHeader eyebrow="Scholarships" title={`${scholars.length} students · ${rupees(waived)} waived`} />
        {scholars.length === 0 ? <EmptyState icon={Award} title="No scholarships this year" /> : (
          <div className="scroll-quiet max-h-[440px] overflow-y-auto pr-1">
            {scholars.map(({ s, full, waived: w }) => (
              <div key={s.id} className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0">
                <Avatar name={s.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-ink">{s.name}</div>
                  <div className="text-[12px] text-stone">{s.classId} · pays {rupees(s.feeTotal)} of {rupees(full)}</div>
                </div>
                <div className="text-right">
                  <Pill tone="copper">{s.scholarshipPct}%</Pill>
                  <div className="mt-0.5 text-[11.5px] tabular text-stone">−{rupees(w)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
