import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { ArrowRight, BellRing, Check, ChevronDown, ChevronRight, Hand, Leaf } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow, useMobileNav } from '@/components/shell/Mobile'
import { Button, Pill, ease, fadeUp, severityTone, toneClass, useToast } from '@/components/ui'
import { useAlerts, useData, useMe, useNow, usePulse, DEMO } from '@/store/hooks'
import { morningBrief, RULES, type Alert } from '@/engine/monitoring'
import { dateLabel, greeting, time, weekday } from '@/lib/format'
import { MetricChip } from '@/roles/_shared/MetricChip'
import { OPEN_TAB, alertRecipients, nudgeForAlert, recipientsNoun } from './lib'

const SEVERITY_LABEL = { critical: 'Critical', high: 'High', watch: 'Watch' } as const

/** Primary + "I'm on it" behaviour for one alert, shared by the card and the detail screen. */
function useAlertActions(alert: Alert) {
  const d = useData()
  const nav = useMobileNav()
  const toast = useToast()
  const [reminded, setReminded] = useState(false)
  const recipients = alertRecipients(d, alert)
  const canNudge = alert.action.kind === 'nudge' && recipients.length > 0

  const primary = () => {
    if (canNudge) {
      const people = nudgeForAlert(d, alert, DEMO.principalId)
      setReminded(true)
      toast(`Reminded ${recipientsNoun(people)}`)
      return
    }
    const tab = alert.action.to ? OPEN_TAB[alert.action.to] : undefined
    if (tab) { nav.popToRoot(); nav.setTab(tab) }
    else nav.push({ title: alert.rule, render: () => <AlertDetailScreen alertId={alert.id} /> })
  }
  const ack = () => {
    d.acknowledgeAlert(alert.id)
    toast('Noted — it stays on your radar until it clears', 'slate')
  }
  return { primary, ack, reminded, canNudge, recipients }
}

export function TodayTab() {
  const d = useData()
  const alerts = useAlerts()
  const pulse = usePulse()
  const now = useNow()
  const me = useMe('principal')
  const nav = useMobileNav()
  const brief = useMemo(() => morningBrief(d, alerts), [d, alerts])

  const stack = alerts.filter(a => (a.severity === 'critical' || a.severity === 'high') && !a.acknowledgedAt)
  const radar = alerts.filter(a => a.acknowledgedAt || a.severity === 'watch')
  const delayed = d.buses.filter(b => b.status === 'delayed')
  const lateForRegister = time(now) >= RULES.registerBy
  const salutation = me.name.replace(/^(Dr\.)\s+\S+\s+/, '$1 ')
  const allIn = pulse.registersMarked === pulse.registersTotal

  return (
    <MobileScreen
      eyebrow={`${weekday(now)} ${dateLabel(now, { day: 'numeric', month: 'long' })} · ${time(now)}`}
      title={`${greeting(now)}, ${salutation}`}>
      <motion.div variants={fadeUp} className="px-1">
        <p className="text-[15px] leading-relaxed text-charcoal-2">{brief.line}</p>
        <p className={clsx('mt-1.5 font-display text-[17px] leading-snug', stack.some(a => a.severity === 'critical') ? 'text-rust' : 'text-forest')}>{brief.focus}</p>
      </motion.div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MetricChip label="In" tone={pulse.attendanceToday === null ? 'amber' : pulse.attendanceToday >= 0.9 ? 'forest' : 'copper'}
          value={pulse.attendanceToday === null ? '—' : `${Math.round(pulse.attendanceToday * 100)}%`} sub={`${pulse.presentToday} kids`} />
        <MetricChip label="Registers" tone={allIn ? 'forest' : lateForRegister ? 'copper' : 'amber'}
          value={`${pulse.registersMarked}/${pulse.registersTotal}`} sub={allIn ? 'All in' : `${pulse.registersTotal - pulse.registersMarked} waiting`} onClick={() => nav.setTab('wall')} />
        <MetricChip label="Staff" tone={pulse.staffIn === pulse.staffTotal ? 'forest' : 'copper'}
          value={`${pulse.staffIn}/${pulse.staffTotal}`} sub={`${pulse.staffTotal - pulse.staffIn} away`} onClick={() => nav.setTab('people')} />
        <MetricChip label="Buses" tone={delayed.length ? 'rust' : 'forest'}
          value={`${pulse.busesArrived}/${pulse.busesTotal}`} sub={delayed.length ? `Bus ${delayed[0].id} late` : 'All in'} onClick={() => nav.setTab('wall')} />
      </div>

      <MSection title={`Needs you${stack.length ? ` · ${stack.length}` : ''}`} className="!mt-6">
        <AnimatePresence initial={false} mode="popLayout">
          {stack.map(a => <AlertCard key={a.id} alert={a} />)}
        </AnimatePresence>
        <AnimatePresence>
          {stack.length === 0 && (
            <motion.div key="calm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: ease.out }}
              className="flex items-center gap-3 rounded-[16px] border border-forest/15 bg-forest-p px-4 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ivory-2 text-forest"><Leaf size={18} /></span>
              <div>
                <div className="font-display text-[17px] text-ink">Nothing urgent. A calm morning.</div>
                <div className="text-[13px] text-forest">Everything else is being watched for you.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MSection>

      {radar.length > 0 && (
        <MSection title="On your radar">
          <MList>
            {radar.map(a => (
              <MRow key={a.id}
                icon={<span className={clsx('h-2 w-2 shrink-0 rounded-full', a.acknowledgedAt ? 'bg-stone-l' : toneClass[severityTone[a.severity]].dot)} />}
                title={a.headline}
                sub={a.acknowledgedAt ? `You're on it since ${time(a.acknowledgedAt)} · ${a.owner}` : `${a.owner} · ${a.items.length} item${a.items.length > 1 ? 's' : ''}`}
                right={<ChevronRight size={16} className="shrink-0 text-stone-l" />}
                onClick={() => nav.push({ title: a.rule, render: () => <AlertDetailScreen alertId={a.id} /> })} />
            ))}
          </MList>
        </MSection>
      )}
    </MobileScreen>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false)
  const nav = useMobileNav()
  const { primary, ack, reminded, canNudge, recipients } = useAlertActions(alert)
  const tone = severityTone[alert.severity]

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 120, scale: 0.96, transition: { duration: 0.32, ease: ease.ez } }}
      transition={{ duration: 0.4, ease: ease.out }}
      className="mb-3 last:mb-0">
      <article className="relative overflow-hidden rounded-[16px] border border-line bg-ivory-2 shadow-1">
        <span className={clsx('absolute inset-y-0 left-0 w-[5px]', toneClass[tone].dot)} />
        <button onClick={() => setOpen(o => !o)} className="block w-full py-3.5 pl-5 pr-4 text-left" aria-expanded={open}>
          <div className="flex items-center justify-between gap-2">
            <span className={clsx('text-[11px] font-semibold uppercase tracking-[0.12em]', toneClass[tone].text)}>{SEVERITY_LABEL[alert.severity]} · {alert.domain}</span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="text-stone"><ChevronDown size={16} /></motion.span>
          </div>
          <h3 className="mt-1 font-display text-[18px] leading-snug text-ink">{alert.headline}</h3>
          <div className="mt-1 text-[12.5px] text-stone">Owner: {alert.owner} · then {alert.escalatesTo}</div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: ease.out }} className="overflow-hidden">
              <div className="pb-1 pl-5 pr-4">
                <p className="text-[13.5px] leading-relaxed text-charcoal-2">{alert.why}</p>
                <div className="mt-2.5 divide-y divide-line-2 rounded-[12px] bg-paper/60">
                  {alert.items.slice(0, 4).map(i => (
                    <div key={i.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-ink">{i.label}</div>
                        <div className="truncate text-[12px] text-stone">{i.sub}</div>
                      </div>
                      <span className={clsx('shrink-0 tabular text-[13px] font-medium', toneClass[tone].text)}>{i.value}</span>
                    </div>
                  ))}
                </div>
                {alert.items.length > 4 && (
                  <button onClick={() => nav.push({ title: alert.rule, render: () => <AlertDetailScreen alertId={alert.id} /> })}
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-forest">
                    See all {alert.items.length} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 px-4 pb-3.5 pl-5 pt-2.5">
          <Button size="sm" className="flex-1" variant={reminded ? 'soft' : 'primary'} icon={reminded ? Check : canNudge ? BellRing : ArrowRight}
            disabled={reminded} onClick={primary}>
            {reminded ? `Reminded ${recipients.length}` : alert.action.label}
          </Button>
          <Button size="sm" variant="outline" icon={Hand} onClick={ack}>I'm on it</Button>
        </div>
      </article>
    </motion.div>
  )
}

/** Pushed screen: every item behind an alert, with the same two actions in the thumb zone. */
export function AlertDetailScreen({ alertId }: { alertId: string }) {
  const alerts = useAlerts()
  const alert = alerts.find(a => a.id === alertId)
  if (!alert) {
    return (
      <MobileScreen title="All clear" large>
        <p className="px-1 text-[15px] text-charcoal-2">This alert has cleared. Nothing left to do here.</p>
      </MobileScreen>
    )
  }
  return <AlertDetail alert={alert} />
}

function AlertDetail({ alert }: { alert: Alert }) {
  const { primary, ack, reminded, canNudge } = useAlertActions(alert)
  const tone = severityTone[alert.severity]
  return (
    <MobileScreen eyebrow={`${SEVERITY_LABEL[alert.severity]} · ${alert.owner}`} title={alert.rule}
      footer={
        <div className="flex gap-2">
          <Button block size="lg" variant={reminded ? 'soft' : 'primary'} disabled={reminded} icon={reminded ? Check : canNudge ? BellRing : ArrowRight} onClick={primary}>
            {reminded ? 'Reminded' : alert.action.label}
          </Button>
          {!alert.acknowledgedAt && <Button size="lg" variant="outline" icon={Hand} onClick={ack}>I'm on it</Button>}
        </div>
      }>
      <motion.div variants={fadeUp} className="rounded-[16px] border border-line bg-ivory-2 p-4">
        <h3 className="font-display text-[19px] leading-snug">{alert.headline}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-charcoal-2">{alert.why}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone={tone} dot>{SEVERITY_LABEL[alert.severity]}</Pill>
          <Pill tone="slate">Escalates to {alert.escalatesTo}</Pill>
          {alert.acknowledgedAt && <Pill tone="stone" icon={Hand}>On it since {time(alert.acknowledgedAt)}</Pill>}
        </div>
      </motion.div>
      <MSection title={`${alert.items.length} item${alert.items.length > 1 ? 's' : ''}`}>
        <MList>
          {alert.items.map(i => (
            <MRow key={i.id} title={i.label} sub={i.sub}
              right={<span className={clsx('shrink-0 tabular text-[14px] font-medium', toneClass[tone].text)}>{i.value}</span>} />
          ))}
        </MList>
      </MSection>
    </MobileScreen>
  )
}
