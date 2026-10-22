import { motion } from 'framer-motion'
import { Bus, ClipboardCheck, IndianRupee, Inbox, UserCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { AnimatedNumber, Card, Eyebrow, LiveDot, Page, Sparkline, cx, fadeUp, toneClass, type Tone } from '@/components/ui'
import { useAlerts, useData, useNow, usePulse } from '@/store/hooks'
import { morningBrief } from '@/engine/monitoring'
import { dateLabel, greeting, hoursBetween, rupeesShort } from '@/lib/format'
import { TwoCol } from '@/components/shell/Web'
import type { LucideIcon } from 'lucide-react'
import { AlertFeed } from './AlertFeed'
import { Wall } from './Wall'
import { ActivityStream } from './ActivityStream'

export function MonitoringCenter() {
  return (
    <Page>
      <Hero />
      <div className="mt-5">
        <TwoCol main={<AlertFeed />} side={<><Wall /><ActivityStream /></>} />
      </div>
    </Page>
  )
}

function Hero() {
  const d = useData()
  const alerts = useAlerts()
  const p = usePulse()
  const now = useNow()
  const brief = useMemo(() => morningBrief(d, alerts), [d, alerts])
  const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledgedAt).length
  const delayed = d.buses.filter(b => b.status === 'delayed')
  const staleApprovals = d.approvals.filter(a => a.status === 'pending' && hoursBetween(a.at, now) >= 24).length
  const trend = p.attendanceTrend.map(v => v * 100)
  const att = p.attendanceToday

  return (
    <motion.section variants={fadeUp} className="paper-grain relative overflow-hidden rounded-[18px] border border-line bg-ivory-2 p-5 shadow-1 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow>Monitoring Center · {dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
          <h1 className="font-display text-[32px] leading-[1.08] md:text-[42px]">{greeting(now)}, Dr. Iyer.</h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-charcoal-2">{brief.line}</p>
          <motion.p key={brief.focus} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={cx('mt-2 inline-flex items-center gap-2 text-[15px] font-medium', critical ? 'text-copper-d' : 'text-forest')}>
            <span className={cx('h-2 w-2 rounded-full', critical ? 'bg-copper' : 'bg-forest-l')} />
            {brief.focus}
          </motion.p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 rounded-[14px] border border-line bg-ivory/80 px-4 py-3 backdrop-blur">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone"><LiveDot /> Live</span>
          <motion.span key={now.slice(11, 16)} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[34px] leading-none tabular text-ink">{now.slice(11, 16)}</motion.span>
          <span className="text-[12px] text-stone">{d.school.name} · {d.school.city}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <PulseTile icon={Users} label="Children in today" tone={att === null ? 'stone' : att >= 0.9 ? 'forest' : att >= 0.8 ? 'amber' : 'rust'}
          value={att === null ? 0 : Math.round(att * 100)} format={n => (att === null ? '—' : `${Math.round(n)}%`)}
          sub={att === null ? 'No registers yet' : `${p.presentToday} of ${p.markedToday} marked`} trend={trend} />
        <PulseTile icon={ClipboardCheck} label="Registers in" tone={p.registersMarked === p.registersTotal ? 'forest' : 'copper'}
          value={p.registersMarked} format={n => `${Math.round(n)}/${p.registersTotal}`}
          sub={p.registersMarked === p.registersTotal ? 'Every classroom done' : `${p.registersTotal - p.registersMarked} still waiting`} />
        <PulseTile icon={UserCheck} label="Staff in" tone={p.staffIn >= p.staffTotal - 1 ? 'forest' : 'copper'}
          value={p.staffIn} format={n => `${Math.round(n)}/${p.staffTotal}`} sub={`${p.staffTotal - p.staffIn} not checked in`} />
        <PulseTile icon={Bus} label="Buses arrived" tone={delayed.length ? 'rust' : 'forest'}
          value={p.busesArrived} format={n => `${Math.round(n)}/${p.busesTotal}`}
          sub={delayed.length ? delayed.map(b => `Bus ${b.id} +${b.delayMin} min`).join(', ') : 'All on campus'} />
        <PulseTile icon={IndianRupee} label="Fees this month" tone="forest"
          value={p.collectedThisMonth} format={n => rupeesShort(Math.round(n))} sub={`${rupeesShort(p.feeOverdue)} overdue overall`} />
        <PulseTile icon={Inbox} label="Approvals pending" tone={staleApprovals ? 'copper' : p.pendingApprovals ? 'amber' : 'forest'}
          value={p.pendingApprovals} sub={staleApprovals ? `${staleApprovals} waiting over a day` : p.pendingApprovals ? 'All fresh' : 'Queue clear'} />
      </div>
    </motion.section>
  )
}

function PulseTile({ icon: Icon, label, value, format, sub, tone, trend }: {
  icon: LucideIcon; label: string; value: number; format?: (n: number) => string; sub: string; tone: Tone; trend?: number[]
}) {
  return (
    <Card padded={false} className="flex min-w-0 flex-col justify-between gap-2 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] text-stone">{label}</span>
        <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-[7px]', toneClass[tone].bg, toneClass[tone].text)}><Icon size={13} /></span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <AnimatedNumber value={value} format={format} className="font-display text-[26px] leading-none text-ink" />
        {trend && <Sparkline data={trend} tone={tone} width={64} height={24} />}
      </div>
      <div className={cx('truncate text-[12px]', tone === 'rust' || tone === 'copper' ? toneClass[tone].text : 'text-stone')}>{sub}</div>
    </Card>
  )
}
