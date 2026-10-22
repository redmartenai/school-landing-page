/* Me: how her week looks to the school (supportively), announcements, leave and pay. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CalendarDays, Check, Megaphone, Pin, Reply, Wallet } from 'lucide-react'
import { Avatar, Button, Pill, Progress, Ring, Sheet, cx, spring, useToast, type Tone } from '@/components/ui'
import { MList, MSection, MobileScreen } from '@/components/shell/Mobile'
import { useData, useNow, useScorecard } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago, dateLabel, dueLabel, monthLabel, rupees } from '@/lib/format'
import { RespondSheet } from './Announcements'
import { ChoiceChips, MCard, ME, addDays, nextWeekday, textareaClass, useTeacher } from './shared'

export function MeTab() {
  const d = useData()
  const me = useTeacher()
  const sc = useScorecard(ME)
  const ack = useSchool(s => s.acknowledgeAnnouncement)
  const toast = useToast()
  const [responding, setResponding] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const announcements = d.announcements.filter(a => a.audience.includes('staff')).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at))
  const leaves = d.approvals.filter(a => a.kind === 'leave' && a.requestedBy === ME).sort((a, b) => b.at.localeCompare(a.at))
  const run = [...d.payrollRuns].filter(r => r.status === 'paid').sort((a, b) => b.month.localeCompare(a.month))[0]
  const sal = me.salary
  const gross = sal.basic + sal.hra + sal.allowances
  const deductions = sal.pf + sal.esi + sal.tds
  const days = me.attendance.slice(-30)
  const onTime = days.filter(x => x.status === 'present').length
  const today = me.attendance[me.attendance.length - 1]

  const metrics: { label: string; value: number; display: string; note: string; tone: Tone }[] = sc ? [
    { label: 'On time', value: sc.punctuality, display: `${Math.round(sc.punctuality * 100)}%`, note: 'days checked in by 08:00', tone: sc.punctuality >= 0.9 ? 'forest' : 'amber' },
    { label: 'Marks on time', value: sc.marksOnTime, display: `${Math.round(sc.marksOnTime * 100)}%`, note: sc.pendingMarks ? `${sc.pendingMarks} still pending` : 'every Unit Test 2 submitted', tone: sc.marksOnTime >= 1 ? 'forest' : 'copper' },
    { label: 'Homework reviewed', value: sc.reviewRate, display: `${Math.round(sc.reviewRate * 100)}%`, note: sc.unreviewed ? `${sc.unreviewed} past-due submissions waiting` : 'nothing waiting', tone: sc.reviewRate >= 0.8 ? 'forest' : 'amber' },
    { label: 'Parent replies', value: Math.max(0, 1 - sc.replyHours / 36), display: `${sc.replyHours}h`, note: 'average reply · school asks for under 24h', tone: sc.replyHours <= 12 ? 'forest' : 'amber' },
    { label: 'Class results', value: Math.max(0, Math.min(1, 0.6 + sc.classAvgDelta / 20)), display: `${sc.classAvgDelta >= 0 ? '+' : '−'}${Math.abs(sc.classAvgDelta).toFixed(1)}`, note: 'UT2 vs earlier tests, your classes', tone: sc.classAvgDelta >= 0 ? 'forest' : 'amber' },
  ] : []
  const weakest = [...metrics].sort((a, b) => a.value - b.value)[0]

  return (
    <MobileScreen title="Me" eyebrow={me.designation}>
      <MCard className="flex items-center gap-3">
        <Avatar name={me.name} size={52} />
        <div className="min-w-0">
          <div className="font-display text-[20px] leading-tight text-ink">{me.name}</div>
          <div className="truncate text-[13px] text-stone">{me.email}</div>
          {today?.checkIn && <div className="mt-0.5 text-[12.5px] text-forest">Checked in today at {today.checkIn}</div>}
        </div>
      </MCard>

      {sc && (
        <MSection title="How your week looks to the school">
          <MCard>
            <div className="flex items-center gap-4">
              <Ring value={sc.score / 100} size={92} stroke={8} tone={sc.score >= 80 ? 'forest' : sc.score >= 65 ? 'amber' : 'copper'}>
                <span className="font-display text-[28px] leading-none tabular text-ink">{sc.score}</span>
              </Ring>
              <div className="min-w-0">
                <Pill tone={sc.score >= 80 ? 'forest' : sc.score >= 65 ? 'amber' : 'copper'}>{sc.grade}</Pill>
                <p className="mt-1.5 text-[13.5px] leading-snug text-charcoal-2">
                  {sc.score >= 80 ? 'Families and the office notice the difference. Thank you.' : 'A good week with one thing that would lift it.'}
                  {weakest && weakest.value < 0.85 && <> The easiest win: <b className="font-semibold text-ink">{weakest.label.toLowerCase()}</b>.</>}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {metrics.map(m => (
                <div key={m.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] text-ink">{m.label}</span>
                    <span className="font-display text-[17px] tabular text-ink">{m.display}</span>
                  </div>
                  <Progress value={m.value} tone={m.tone} className="mt-1" height={5} />
                  <div className="mt-0.5 text-[12px] text-stone">{m.note}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-line-2 pt-3 text-[12px] text-stone">Your principal sees the same numbers. They’re here so nothing is a surprise.</p>
          </MCard>
        </MSection>
      )}

      <MSection title="Last 30 days" action={<span className="text-[12px] text-stone">{onTime} on time</span>}>
        <MCard>
          <div className="grid grid-cols-10 gap-1.5">
            {days.map((x, i) => (
              <motion.div key={x.date} title={`${dateLabel(x.date)} · ${x.status}${x.checkIn ? ` · ${x.checkIn}` : ''}`}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.012, ...spring }}
                className={cx('aspect-square rounded-[5px]', x.status === 'present' ? 'bg-forest-l' : x.status === 'late' ? 'bg-amber' : x.status === 'leave' ? 'bg-slate-l' : 'bg-rust', i === days.length - 1 && 'ring-2 ring-ink/70 ring-offset-1 ring-offset-ivory-2')} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-stone">
            {([['bg-forest-l', 'On time'], ['bg-amber', 'Late'], ['bg-slate-l', 'Leave'], ['bg-rust', 'Absent']] as const).map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-[3px]', c)} />{l}</span>
            ))}
          </div>
        </MCard>
      </MSection>

      <MSection title="From the principal">
        <div className="space-y-2.5">
          {announcements.map(a => {
            const acked = a.acknowledgedBy.includes(ME)
            const mine = a.responses.filter(r => r.staffId === ME)
            return (
              <MCard key={a.id} className={cx(!acked && 'border-copper/35')}>
                <div className="flex items-center gap-2 text-[12px] text-stone">
                  {a.pinned ? <Pin size={13} className="text-copper" /> : <Megaphone size={13} />}
                  <span>{d.staff.find(s => s.id === a.fromId)?.name} · {ago(a.at)}</span>
                </div>
                <div className="mt-1 font-display text-[17px] leading-snug text-ink">{a.title}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal-2">{a.body}</p>
                {mine.map(r => <div key={r.id} className="mt-2 rounded-[10px] bg-forest-p px-3 py-2 text-[13px] text-forest">You replied: {r.text}</div>)}
                <div className="mt-3 flex items-center gap-2">
                  <AnimatePresence mode="wait" initial={false}>
                    {acked ? (
                      <motion.span key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}
                        className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-forest-p px-3 text-[13.5px] font-medium text-forest">
                        <Check size={15} strokeWidth={2.6} /> Acknowledged
                      </motion.span>
                    ) : (
                      <motion.span key="ack" exit={{ scale: 0.9, opacity: 0 }}>
                        <Button variant="copper" icon={Check} onClick={() => { ack(a.id, ME); toast('The principal can see you’ve read it') }}>Acknowledge</Button>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Button variant="outline" icon={Reply} onClick={() => setResponding(a.id)}>Respond</Button>
                  {a.responses.length > 0 && <span className="ml-auto text-[12px] text-stone">{a.responses.length} repl{a.responses.length === 1 ? 'y' : 'ies'}</span>}
                </div>
              </MCard>
            )
          })}
        </div>
      </MSection>

      <MSection title="Leave" action={<span className="text-[12px] text-stone">{me.leaveBalance} days left</span>}>
        <MList>
          <AnimatePresence initial={false}>
            {leaves.map(l => (
              <motion.div key={l.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 px-4 py-3">
                <CalendarDays size={18} className="shrink-0 text-stone" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-ink">{l.title}</div>
                  <div className="truncate text-[12.5px] text-stone">{l.from && dateLabel(l.from)}{l.to && l.to !== l.from ? ` – ${dateLabel(l.to)}` : ''} · {l.detail}</div>
                </div>
                <Pill tone={l.status === 'approved' ? 'forest' : l.status === 'rejected' ? 'rust' : 'amber'} dot>{l.status === 'pending' ? 'With principal' : l.status === 'approved' ? 'Approved' : 'Declined'}</Pill>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="p-3"><Button block variant="soft" size="lg" icon={CalendarDays} onClick={() => setLeaveOpen(true)}>Request leave</Button></div>
        </MList>
      </MSection>

      {run && (
        <MSection title="Payslip">
          <MCard>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12.5px] text-stone">{monthLabel(run.month)} · credited {run.processedAt ? dateLabel(run.processedAt) : ''}</div>
                <div className="mt-0.5 font-display text-[30px] leading-tight tabular text-ink">{rupees(gross - deductions)}</div>
                <div className="text-[12.5px] text-stone">to {me.bank}</div>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-forest-p text-forest"><Wallet size={19} /></span>
            </div>
            <div className="mt-4 space-y-1.5 text-[13.5px]">
              {([['Basic', sal.basic], ['HRA', sal.hra], ['Allowances', sal.allowances]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-charcoal-2">{k}</span><span className="tabular text-ink">{rupees(v)}</span></div>
              ))}
              <div className="flex justify-between border-t border-line-2 pt-1.5"><span className="text-charcoal-2">Gross</span><span className="tabular font-medium text-ink">{rupees(gross)}</span></div>
              {([['Provident fund', sal.pf], ['ESI', sal.esi], ['TDS', sal.tds]] as const).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-stone">{k}</span><span className="tabular text-stone">−{rupees(v)}</span></div>
              ))}
            </div>
          </MCard>
        </MSection>
      )}

      <RespondSheet announcementId={responding} onClose={() => setResponding(null)} />
      <LeaveSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} />
    </MobileScreen>
  )
}

type Start = 'tomorrow' | 'friday' | 'monday'

function LeaveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = useNow()
  const me = useTeacher()
  const request = useSchool(s => s.requestLeave)
  const toast = useToast()
  const [start, setStart] = useState<Start>('tomorrow')
  const [len, setLen] = useState<'1' | '2' | '3'>('1')
  const [reason, setReason] = useState('')
  const today = now.slice(0, 10)
  const starts: Record<Start, string> = { tomorrow: addDays(today, 1), friday: nextWeekday(today, 5), monday: nextWeekday(today, 1) }
  const from = starts[start]
  const to = addDays(from, Number(len) - 1)

  const submit = () => {
    if (!reason.trim()) return
    request(ME, from, to, reason.trim())
    toast('Sent to Dr. Iyer for approval')
    setReason(''); setLen('1'); setStart('tomorrow')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Request leave"
      footer={<Button block size="lg" disabled={!reason.trim()} onClick={submit}>Send for approval · {len} day{len === '1' ? '' : 's'}</Button>}>
      <span className="mb-2 block text-[12.5px] font-medium text-charcoal-2">From</span>
      <ChoiceChips group="leave-start" value={start} onChange={setStart}
        options={[{ id: 'tomorrow', label: 'Tomorrow' }, { id: 'friday', label: 'Friday' }, { id: 'monday', label: 'Next Monday' }]} />
      <span className="mb-2 mt-4 block text-[12.5px] font-medium text-charcoal-2">How long</span>
      <ChoiceChips group="leave-len" value={len} onChange={setLen} options={(['1', '2', '3'] as const).map(n => ({ id: n, label: `${n} day${n === '1' ? '' : 's'}` }))} />
      <p className="mt-2 text-[12.5px] text-stone">{dueLabel(from, now)} {dateLabel(from)}{to !== from ? ` → ${dateLabel(to)}` : ''} · {me.leaveBalance} days in your balance</p>
      <ChoiceChips group="leave-reason" className="mt-4" value={reason} onChange={setReason}
        options={['Unwell', 'Family function', 'Medical appointment'].map(r => ({ id: r, label: r }))} />
      <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="A line for the principal — and who can cover your periods" className={cx(textareaClass, 'mt-3')} />
    </Sheet>
  )
}
