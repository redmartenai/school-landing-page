import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BellRing, Check, ChevronDown, ChevronRight, CircleCheck, Hand } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardHeader, EmptyState, Pill, Tabs, cx, ease, listItem, severityTone, toneClass, useToast } from '@/components/ui'
import { useAlerts, useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import type { Alert, AlertItem, Domain } from '@/engine/monitoring'
import { ago } from '@/lib/format'
import { BASE, ME, plural } from './shared'

type Filter = 'all' | Domain
const DOMAINS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'students', label: 'Students' },
  { id: 'staff', label: 'Staff' },
  { id: 'operations', label: 'Operations' },
  { id: 'finance', label: 'Finance' },
]
const SEVERITY_LABEL = { critical: 'Critical', high: 'High', watch: 'Watch' } as const

/** Where an alert item lives in the principal app. */
function itemHref(a: Alert, it: AlertItem): string | null {
  if (a.domain === 'students' || a.domain === 'finance') return `${BASE}/students?s=${it.id}`
  if (a.id === 'staff-registers') return `${BASE}/attendance`
  if (a.domain === 'staff') return `${BASE}/staff?t=${it.id}`
  if (a.id === 'ops-bus') return `${BASE}/transport`
  if (a.id === 'ops-approvals') return `${BASE}/approvals`
  if (a.id === 'ops-complaints') return `${BASE}/communication`
  return null
}

export function AlertFeed() {
  const alerts = useAlerts()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAcked, setShowAcked] = useState(false)

  const active = alerts.filter(a => !a.acknowledgedAt)
  const acked = alerts.filter(a => a.acknowledgedAt)
  const count = (f: Filter) => active.filter(a => f === 'all' || a.domain === f).length
  const visible = active.filter(a => filter === 'all' || a.domain === filter)
  const visibleAcked = acked.filter(a => filter === 'all' || a.domain === filter)

  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader
        eyebrow="Monitoring Intelligence"
        title="Needs attention now"
        action={<Pill tone={active.some(a => a.severity === 'critical') ? 'rust' : 'forest'} dot>{plural(active.length, 'open signal')}</Pill>}
      />
      <Tabs tabs={DOMAINS.map(d => ({ ...d, count: count(d.id) }))} value={filter} onChange={setFilter} size="sm" className="mb-4" />

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map(a => (
            <motion.div key={a.id} layout variants={listItem} initial="hidden" animate="show" exit="exit">
              <AlertCard alert={a} />
            </motion.div>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <EmptyState icon={CircleCheck} title={filter === 'all' ? 'Nothing needs you right now' : `All quiet in ${filter}`}
            body="Every rule is green. EduFlow keeps watching and will surface anything new here." />
        )}
      </motion.div>

      {visibleAcked.length > 0 && (
        <motion.div layout className="mt-4 rounded-[12px] border border-dashed border-line">
          <button onClick={() => setShowAcked(o => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13.5px] text-stone hover:text-ink">
            <motion.span animate={{ rotate: showAcked ? 90 : 0 }}><ChevronRight size={15} /></motion.span>
            <Hand size={14} />
            <span className="flex-1"><span className="font-medium text-charcoal">Acknowledged</span> · you're on {visibleAcked.length === 1 ? 'this one' : `these ${visibleAcked.length}`}</span>
          </button>
          <AnimatePresence initial={false}>
            {showAcked && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: ease.out }} className="overflow-hidden">
                <div className="space-y-2.5 px-3 pb-3">
                  {visibleAcked.map(a => <AlertCard key={a.id} alert={a} dimmed />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </Card>
  )
}

function AlertCard({ alert: a, dimmed }: { alert: Alert; dimmed?: boolean }) {
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const nudge = useSchool(s => s.nudge)
  const ack = useSchool(s => s.acknowledgeAlert)
  const events = useData().events
  const now = useNow()
  const toast = useToast()
  const navigate = useNavigate()
  const tone = severityTone[a.severity]
  const t = toneClass[tone]

  const staffIds = useMemo(() => [...new Set(a.items.map(i => i.staffId).filter((x): x is string => !!x))], [a.items])
  const lastNudge = events.find(e => e.kind === 'nudge' && e.actorId === ME && e.text.endsWith(`: ${a.rule}`))
  const nudgedCount = events.filter(e => e.kind === 'nudge' && e.actorId === ME && e.text.endsWith(`: ${a.rule}`)).length

  const primary = () => {
    if (a.action.kind === 'open') { navigate(`${BASE}/${a.action.to ?? ''}`); return }
    if (!staffIds.length) return
    for (const sid of staffIds) {
      const mine = a.items.filter(i => i.staffId === sid)
      const list = mine.slice(0, 4).map(i => `${i.label} (${i.value})`).join(', ')
      nudge(sid, a.rule, `${a.headline}. Yours: ${list}${mine.length > 4 ? ` and ${mine.length - 4} more` : ''}. — Dr. Iyer`, ME)
    }
    const who = a.domain === 'staff' || a.owner.toLowerCase().includes('teacher') ? 'teacher' : 'person'
    toast(`Reminded ${plural(staffIds.length, who)}`)
  }

  const shown = all ? a.items : a.items.slice(0, 8)

  return (
    <div className={cx('relative overflow-hidden rounded-[13px] border bg-ivory-2 transition-opacity', dimmed ? 'border-line-2 opacity-60' : 'border-line shadow-1')}>
      <span className={cx('absolute inset-y-0 left-0 w-[3px]', t.dot)} />
      <div className="py-3.5 pl-5 pr-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={tone} dot>{SEVERITY_LABEL[a.severity]}</Pill>
          <Pill tone="stone">{a.rule}</Pill>
          {a.acknowledgedAt && <Pill tone="slate" icon={Hand}>You're on it · {ago(a.acknowledgedAt, now)}</Pill>}
        </div>
        <button onClick={() => setOpen(o => !o)} className="mt-2 flex w-full items-start gap-3 text-left">
          <h4 className="flex-1 font-display text-[17.5px] leading-snug text-ink">{a.headline}</h4>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="mt-1 text-stone"><ChevronDown size={17} /></motion.span>
        </button>
        <div className="mt-1 text-[12.5px] text-stone">
          Owner: <span className="text-charcoal-2">{a.owner}</span> · {plural(a.items.length, 'item')}
          {lastNudge && <span className="text-forest"> · Reminded {nudgedCount > 1 ? `${nudgedCount}×` : ''} {ago(lastNudge.at, now)}</span>}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: ease.out }} className="overflow-hidden">
              <div className="pt-3">
                <p className="text-[13.5px] leading-relaxed text-charcoal-2">{a.why}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="text-stone">Escalation</span>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-charcoal">{a.owner}</span>
                  <ArrowRight size={12} className="text-stone-l" />
                  <span className={cx('rounded-full px-2.5 py-0.5', t.bg, t.text)}>{a.escalatesTo}</span>
                </div>
                <div className="mt-3 divide-y divide-line-2 overflow-hidden rounded-[10px] border border-line-2">
                  {shown.map(it => {
                    const href = itemHref(a, it)
                    return (
                      <button key={it.id} disabled={!href} onClick={() => href && navigate(href)}
                        className="flex w-full items-center gap-3 bg-ivory-2 px-3 py-2 text-left transition-colors enabled:hover:bg-paper/70 disabled:cursor-default">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium text-ink">{it.label}</div>
                          <div className="truncate text-[12px] text-stone">{it.sub}</div>
                        </div>
                        <span className={cx('shrink-0 tabular text-[13px] font-medium', t.text)}>{it.value}</span>
                      </button>
                    )
                  })}
                </div>
                {a.items.length > 8 && (
                  <button onClick={() => setAll(v => !v)} className="mt-2 text-[12.5px] font-medium text-forest hover:underline">
                    {all ? 'Show fewer' : `Show all ${a.items.length}`}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!dimmed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={a.severity === 'critical' ? 'primary' : 'soft'}
              icon={a.action.kind === 'nudge' ? BellRing : ArrowRight}
              disabled={a.action.kind === 'nudge' && !staffIds.length} onClick={primary}>
              {a.action.label}{a.action.kind === 'nudge' && staffIds.length > 0 ? ` · ${staffIds.length}` : ''}
            </Button>
            <Button size="sm" variant="ghost" icon={Check} onClick={() => { ack(a.id); toast('Noted — it moves to your list', 'slate') }}>I'm on it</Button>
          </div>
        )}
      </div>
    </div>
  )
}
