import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, ScrollText, SearchX } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, Page, PageHeader, Pill, Toggle, listItem } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { dateLabel, time } from '@/lib/format'
import type { RoleId } from '@/data/types'
import { ROLE_LABEL, SearchInput, Segmented, nameOf } from './shared'

const STEP = 60

export function AuditPage() {
  const d = useData()
  const now = useNow()
  const [q, setQ] = useState('')
  const [sensitive, setSensitive] = useState(false)
  const [role, setRole] = useState<'all' | RoleId>('all')
  const [limit, setLimit] = useState(STEP)

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return [...d.audit]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter(e => !sensitive || e.sensitive)
      .filter(e => role === 'all' || e.actorRole === role)
      .filter(e => !n || `${e.action} ${e.target} ${nameOf(d, e.actorId)}`.toLowerCase().includes(n))
  }, [d, q, sensitive, role])

  const today = now.slice(0, 10)
  const todayCount = d.audit.filter(e => e.at.startsWith(today)).length
  const groups = useMemo(() => {
    const m = new Map<string, typeof rows>()
    for (const e of rows.slice(0, limit)) {
      const k = e.at.slice(0, 10)
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return [...m.entries()]
  }, [rows, limit])

  const dayLabel = (k: string) => (k === today ? 'Today' : dateLabel(k, { weekday: 'long', day: 'numeric', month: 'long' }))

  return (
    <Page>
      <PageHeader eyebrow="Audit log" title="Every change, on the record"
        subtitle={`${d.audit.length} entries, ${todayCount} today. Append-only: entries can be read and filtered, never edited or deleted — not even by an administrator.`} />

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line-2 p-4 lg:flex-row lg:items-center md:p-5">
          <SearchInput value={q} onChange={v => { setQ(v); setLimit(STEP) }} placeholder="Search action, record or person" className="lg:max-w-[300px] lg:flex-1" />
          <Segmented id="audit-role" value={role} onChange={v => { setRole(v); setLimit(STEP) }}
            options={[{ value: 'all', label: 'Everyone' }, ...(['principal', 'admin', 'staff', 'parent', 'student'] as RoleId[]).map(r => ({ value: r, label: ROLE_LABEL[r] }))]} />
          <label className="flex items-center gap-2.5 text-[13px] text-charcoal lg:ml-auto">
            <Toggle checked={sensitive} onChange={v => { setSensitive(v); setLimit(STEP) }} label="Sensitive only" /> Sensitive only
          </label>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No entries match" body="Try clearing a filter." action={<Button size="sm" variant="outline" onClick={() => { setQ(''); setRole('all'); setSensitive(false) }}>Clear filters</Button>} />
        ) : (
          <div className="px-4 pb-4 md:px-5">
            {groups.map(([day, entries]) => (
              <section key={day}>
                <div className="sticky top-16 z-[1] -mx-1 bg-ivory-2/95 px-1 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone backdrop-blur">{dayLabel(day)} · {entries.length}</div>
                <AnimatePresence initial={false}>
                  {entries.map(e => (
                    <motion.div key={e.id} layout variants={listItem} initial="hidden" animate="show" exit="exit"
                      className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-line-2 py-3 last:border-0 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
                      <span className="pt-1 text-[12.5px] tabular text-stone">{time(e.at)}</span>
                      <div className="flex min-w-0 gap-2.5">
                        <Avatar name={nameOf(d, e.actorId)} size={28} />
                        <div className="min-w-0">
                          <div className="text-[13.5px] text-charcoal"><span className="font-medium text-ink">{nameOf(d, e.actorId)}</span> <span className="text-stone">·</span> {e.action}</div>
                          <div className="break-words text-[12.5px] text-stone">{e.target}</div>
                        </div>
                      </div>
                      <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-auto sm:justify-end">
                        <Pill tone="stone">{ROLE_LABEL[e.actorRole]}</Pill>
                        {e.sensitive && <Pill tone="copper" icon={Lock}>Sensitive</Pill>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </section>
            ))}
            {rows.length > limit && (
              <div className="flex justify-center pt-4"><Button size="sm" variant="outline" onClick={() => setLimit(l => l + STEP)}>Show older entries · {rows.length - limit} more</Button></div>
            )}
            {rows.length <= limit && rows.length > 0 && (
              <p className="flex items-center justify-center gap-1.5 pt-5 text-[12px] text-stone-l"><ScrollText size={13} /> Start of the log</p>
            )}
          </div>
        )}
      </Card>
    </Page>
  )
}
