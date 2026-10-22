import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, Check, Clock, Megaphone, MessageCircle, MessageSquare, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, AvatarStack, Button, Card, CardHeader, EmptyState, Field, Page, PageHeader, Pill, Progress, cx, inputClass, listItem, spring, useToast } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { unansweredThreads } from '@/engine/monitoring'
import { ago, hoursBetween } from '@/lib/format'
import type { Announcement, Complaint } from '@/data/types'
import { TwoCol } from '@/components/shell/Web'
import { HBar, ME, plural, useNameOf } from './shared'

type Audience = Announcement['audience'][number]
const AUDIENCES: { id: Audience; label: string }[] = [{ id: 'staff', label: 'Staff' }, { id: 'parents', label: 'Parents' }, { id: 'students', label: 'Students' }]

export function CommunicationPage() {
  const d = useData()
  const openComplaints = d.complaints.filter(c => c.status !== 'resolved').length
  const waiting = unansweredThreads(d).length
  return (
    <Page>
      <PageHeader eyebrow="Communication" title="What the school is saying, and hearing"
        subtitle={`${openComplaints} parent concerns are open and ${plural(waiting, 'parent has', 'parents have')} waited more than a day for a teacher's reply.`} />
      <TwoCol
        main={<><Composer /><AnnouncementList /></>}
        side={<><Sentiment /><WaitingParents /></>}
      />
    </Page>
  )
}

function Composer() {
  const create = useSchool(s => s.createAnnouncement)
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [aud, setAud] = useState<Audience[]>(['staff'])
  const toggle = (a: Audience) => setAud(x => (x.includes(a) ? x.filter(y => y !== a) : [...x, a]))
  const ok = title.trim() && body.trim() && aud.length
  const send = () => {
    if (!ok) return
    create({ title: title.trim(), body: body.trim(), audience: aud }, ME)
    const names = aud.map(a => AUDIENCES.find(x => x.id === a)!.label.toLowerCase())
    toast(`Sent to ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}`)
    setTitle(''); setBody('')
  }
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="New announcement" title="Say it once, to everyone who needs it" />
      <div className="space-y-3">
        <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Early dismissal on Friday" className={inputClass} /></Field>
        <Field label="Message"><textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Keep it short and specific. Name the day, the time and what people should do." className={cx(inputClass, 'h-auto resize-none py-2.5')} /></Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map(a => {
              const on = aud.includes(a.id)
              return (
                <motion.button key={a.id} whileTap={{ scale: 0.96 }} onClick={() => toggle(a.id)} aria-pressed={on}
                  className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-forest bg-forest text-ivory' : 'border-line bg-ivory-2 text-charcoal-2 hover:bg-paper')}>
                  <AnimatePresence initial={false}>{on && <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}><Check size={13} strokeWidth={2.6} /></motion.span>}</AnimatePresence>
                  {a.label}
                </motion.button>
              )
            })}
          </div>
          <Button icon={Send} disabled={!ok} onClick={send}>Publish</Button>
        </div>
      </div>
    </Card>
  )
}

function AnnouncementList() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const teachers = d.staff.filter(s => s.role === 'teacher')
  const list = [...d.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at))
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="Announcements" title="Who has read what" action={<Pill>{list.length}</Pill>} />
      {list.length === 0 ? <EmptyState icon={Megaphone} title="No announcements yet" body="Anything you publish above appears here with read receipts." /> : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map(a => {
              const toStaff = a.audience.includes('staff')
              const acked = teachers.filter(t => a.acknowledgedBy.includes(t.id))
              const notYet = teachers.filter(t => !a.acknowledgedBy.includes(t.id))
              const ratio = teachers.length ? acked.length / teachers.length : 0
              return (
                <motion.article key={a.id} layout variants={listItem} initial="hidden" animate="show" className="rounded-[13px] border border-line p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.pinned && <Pill tone="copper">Pinned</Pill>}
                    {a.audience.map(x => <Pill key={x} tone="stone">{x}</Pill>)}
                    <span className="ml-auto text-[12px] text-stone">{ago(a.at, now)}</span>
                  </div>
                  <h4 className="mt-2 font-display text-[17px] text-ink">{a.title}</h4>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal-2">{a.body}</p>
                  {toStaff && (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="text-stone">Acknowledged by staff</span>
                        <span className={cx('tabular font-medium', ratio >= 0.9 ? 'text-forest' : ratio >= 0.5 ? 'text-[#8a5f14]' : 'text-copper-d')}>{acked.length}/{teachers.length}</span>
                      </div>
                      <Progress value={ratio} tone={ratio >= 0.9 ? 'forest' : ratio >= 0.5 ? 'amber' : 'copper'} />
                      {notYet.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-stone">
                          <AvatarStack names={notYet.map(t => t.name)} max={5} size={22} />
                          <span className="truncate">Not yet: {notYet.slice(0, 3).map(t => t.name).join(', ')}{notYet.length > 3 ? ` +${notYet.length - 3}` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {a.responses.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-line-2 pt-3">
                      {a.responses.map(r => (
                        <div key={r.id} className="flex gap-2.5">
                          <Avatar name={nameOf(r.staffId)} size={26} />
                          <div className="min-w-0 rounded-[10px] rounded-tl-[3px] bg-paper/70 px-3 py-2">
                            <div className="text-[12px] font-medium text-ink">{nameOf(r.staffId)} <span className="font-normal text-stone">· {ago(r.at, now)}</span></div>
                            <div className="text-[13px] text-charcoal-2">{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}

const STATUS: { id: Complaint['status']; label: string }[] = [{ id: 'open', label: 'Open' }, { id: 'in-progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' }]

function Sentiment() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const update = useSchool(s => s.updateComplaint)
  const toast = useToast()
  const cats = useMemo(() => {
    const m = new Map<string, { total: number; open: number; neg: number }>()
    for (const c of d.complaints) {
      const x = m.get(c.category) ?? { total: 0, open: 0, neg: 0 }
      x.total++
      if (c.status !== 'resolved') x.open++
      if (c.sentiment === 'negative') x.neg++
      m.set(c.category, x)
    }
    return [...m.entries()].sort((a, b) => b[1].open - a[1].open || b[1].total - a[1].total)
  }, [d.complaints])
  const total = d.complaints.length || 1
  const split = { negative: 0, neutral: 0, positive: 0 }
  for (const c of d.complaints) split[c.sentiment]++
  const open = d.complaints.filter(c => c.status !== 'resolved').sort((a, b) => Number(a.sentiment !== 'negative') - Number(b.sentiment !== 'negative') || b.at.localeCompare(a.at))
  const maxCat = Math.max(1, ...cats.map(c => c[1].total))

  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="Parent sentiment" title="What parents are telling us" />
      <div className="mb-1.5 flex h-3 overflow-hidden rounded-full">
        <motion.div className="bg-rust" initial={{ width: 0 }} animate={{ width: `${(split.negative / total) * 100}%` }} transition={{ duration: 0.8 }} />
        <motion.div className="bg-stone-p" initial={{ width: 0 }} animate={{ width: `${(split.neutral / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
        <motion.div className="bg-forest-l" initial={{ width: 0 }} animate={{ width: `${(split.positive / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
      </div>
      <div className="mb-4 flex justify-between text-[12px]">
        <span className="text-rust">{split.negative} unhappy</span><span className="text-stone">{split.neutral} neutral</span><span className="text-forest">{split.positive} happy</span>
      </div>
      <div className="space-y-2.5">
        {cats.map(([cat, x]) => <HBar key={cat} label={cat} value={x.total} max={maxCat} tone={x.open >= 2 ? 'rust' : x.open ? 'copper' : 'forest'} right={`${x.open} open / ${x.total}`} />)}
      </div>

      <div className="mt-5 mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">Open concerns</div>
      {open.length === 0 ? <EmptyState icon={MessageCircle} title="No open concerns" body="Every parent concern has been resolved." /> : (
        <div className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {open.map(c => (
              <motion.div key={c.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" className="rounded-[11px] border border-line-2 p-3">
                <div className="flex items-center gap-1.5">
                  <Pill tone={c.sentiment === 'negative' ? 'rust' : c.sentiment === 'positive' ? 'forest' : 'stone'} dot>{c.category}</Pill>
                  <span className="ml-auto text-[11.5px] text-stone">{ago(c.at, now)}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-ink">“{c.text}”</p>
                <div className="mt-0.5 text-[11.5px] text-stone">{nameOf(c.parentId)} · parent of {nameOf(c.studentId)}</div>
                <StatusSwitch id={c.id} value={c.status} onChange={s => { update(c.id, s); toast(s === 'resolved' ? 'Marked resolved' : `Moved to ${s.replace('-', ' ')}`, s === 'resolved' ? 'forest' : 'amber') }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}

function StatusSwitch({ id, value, onChange }: { id: string; value: Complaint['status']; onChange: (s: Complaint['status']) => void }) {
  return (
    <div className="mt-2 inline-flex rounded-[9px] bg-paper p-0.5">
      {STATUS.map(s => (
        <button key={s.id} onClick={() => s.id !== value && onChange(s.id)} className={cx('relative rounded-[7px] px-2.5 py-1 text-[12px] font-medium', value === s.id ? 'text-ink' : 'text-stone hover:text-charcoal')}>
          {value === s.id && <motion.span layoutId={`cs-${id}`} transition={spring} className={cx('absolute inset-0 rounded-[7px] shadow-1', s.id === 'open' ? 'bg-rust-p' : s.id === 'in-progress' ? 'bg-amber-p' : 'bg-forest-p')} />}
          <span className="relative">{s.label}</span>
        </button>
      ))}
    </div>
  )
}

function WaitingParents() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const nudge = useSchool(s => s.nudge)
  const toast = useToast()
  const threads = unansweredThreads(d).map(t => ({ t, last: t.messages[t.messages.length - 1] })).sort((a, b) => a.last.at.localeCompare(b.last.at))
  const remind = (staffId: string, parent: string) => {
    nudge(staffId, 'Parent waiting for a reply', `${parent} has been waiting more than a day. Could you reply before lunch? — Dr. Iyer`, ME)
    toast(`Reminded ${nameOf(staffId)}`)
  }
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="Waiting 24h+" title="Parents without a reply" action={<Pill tone={threads.length ? 'copper' : 'forest'}>{threads.length}</Pill>} />
      {threads.length === 0 ? <EmptyState icon={MessageSquare} title="Every parent has a reply" body="Teachers are answering within a day." /> : (
        <div className="divide-y divide-line-2">
          {threads.map(({ t, last }) => {
            const h = Math.round(hoursBetween(last.at, now))
            return (
              <div key={t.id} className="py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={nameOf(t.parentId ?? t.studentId)} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">{nameOf(t.parentId ?? t.studentId)}</div>
                    <div className="truncate text-[11.5px] text-stone">to {nameOf(t.staffId)} · about {nameOf(t.studentId)}</div>
                  </div>
                  <span className={cx('inline-flex items-center gap-1 tabular text-[12.5px] font-medium', h >= 48 ? 'text-rust' : 'text-copper-d')}><Clock size={12} />{h}h</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] text-charcoal-2">“{last.text}”</p>
                <button onClick={() => remind(t.staffId, nameOf(t.parentId ?? t.studentId))} className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-forest hover:underline">
                  <BellRing size={12} /> Nudge {nameOf(t.staffId)}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
