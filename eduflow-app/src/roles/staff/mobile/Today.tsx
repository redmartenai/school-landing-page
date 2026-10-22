/* Today: the register first, then her day, then the short list of things only she can do. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  ArrowRight, Bell, BellRing, Check, ClipboardCheck, Hourglass, Megaphone, MessageCircle, NotebookPen, Reply, Repeat, TriangleAlert, Users,
} from 'lucide-react'
import { Button, EmptyState, IconButton, LiveDot, Pill, cx, ease, listItem, spring, useToast } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useData, useNotifications, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import type { Notification } from '@/data/types'
import { ago, dateLabel, firstName, greeting, time } from '@/lib/format'
import { RespondSheet } from './Announcements'
import { ClassDetail } from './Classes'
import { ChatScreen } from './Messages'
import { RegisterScreen } from './Register'
import { IconTile, MCard, ME, awaitingReview, myPeriods, useNeedsYou, useTeacher, type Need } from './shared'

export function TodayTab() {
  const now = useNow()
  const me = useTeacher()
  const nav = useMobileNav()
  const notes = useNotifications('staff', ME)
  const unread = notes.filter(n => !n.read).length
  const needs = useNeedsYou()

  const cover = notes.find(n => /covering/i.test(n.body))
  const coverMatch = cover?.body.match(/covering\s+(\w+)\s*·\s*Period\s*(\d+)/i)

  return (
    <MobileScreen
      title={`${greeting(now)}, ${firstName(me.name)}`}
      eyebrow={dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={<IconButton icon={unread ? BellRing : Bell} label="Notifications" badge={unread} onClick={() => nav.push({ title: 'Notifications', render: () => <NotificationsScreen /> })} />}
    >
      {me.classTeacherOf && <RegisterCard classId={me.classTeacherOf} />}

      {cover && (
        <motion.div variants={listItem} className="mt-3 flex items-start gap-3 rounded-[16px] border border-copper/30 bg-copper-p p-3.5">
          <IconTile icon={Repeat} tone="copper" size={36} />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-copper-d">
              {coverMatch ? `Covering ${coverMatch[1]} · Period ${coverMatch[2]}` : cover.title}
            </div>
            <p className="text-[13px] leading-snug text-charcoal-2">{cover.title}. {cover.body}</p>
          </div>
        </motion.div>
      )}

      <DayStrip />

      <MSection title="Needs you" action={needs.length > 0 && <span className="text-[12px] font-medium tabular text-copper-d">{needs.length}</span>}>
        <NeedsList needs={needs} />
      </MSection>
    </MobileScreen>
  )
}

/* ───────────────────────── register card ───────────────────────── */

function RegisterCard({ classId }: { classId: string }) {
  const d = useData()
  const nav = useMobileNav()
  const reg = d.registers.find(r => r.classId === classId)
  const cls = d.classes.find(c => c.id === classId)
  const count = cls?.studentIds.length ?? 0
  const open = () => nav.push({ title: `${classId} register`, render: () => <RegisterScreen classId={classId} /> })
  const marks = Object.values(reg?.marks ?? {})
  const absent = marks.filter(m => m === 'A').length
  const late = marks.filter(m => m === 'L').length
  const present = marks.length - absent - late

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!reg?.markedAt ? (
        <motion.button key="todo" onClick={open} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: ease.out }}
          className="relative block w-full overflow-hidden rounded-[22px] bg-copper p-5 text-left text-ivory shadow-[0_18px_36px_-18px_rgba(180,118,58,.9)]">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-ivory/85">
            <LiveDot tone="amber" /> Not taken yet · the office is waiting
          </div>
          <div className="mt-2 font-display text-[27px] leading-[1.12] text-ivory">Take the {classId} register</div>
          <div className="mt-1 text-[14.5px] text-ivory/85">{count} children · everyone starts present</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] text-ivory/80">About nine seconds</span>
            <span className="flex h-11 items-center gap-1.5 rounded-full bg-ivory px-4 text-[14.5px] font-semibold text-copper-d">
              Start <ArrowRight size={16} />
            </span>
          </div>
        </motion.button>
      ) : (
        <motion.button key="done" onClick={open} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
          className="block w-full rounded-[22px] bg-forest p-5 text-left text-ivory">
          <div className="flex items-center gap-3">
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.1 }}
              className="grid h-10 w-10 place-items-center rounded-full bg-ivory/15"><Check size={20} strokeWidth={2.8} /></motion.span>
            <div>
              <div className="font-display text-[21px] leading-tight text-ivory">{classId} register sent</div>
              <div className="text-[13px] text-ivory/80">at {time(reg.markedAt)} · {count} families told</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([['Present', present], ['Late', late], ['Absent', absent]] as const).map(([k, v]) => (
              <div key={k} className="rounded-[12px] bg-ivory/10 px-3 py-2">
                <div className="text-[11.5px] text-ivory/75">{k}</div>
                <div className="font-display text-[22px] leading-none tabular text-ivory">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12.5px] text-ivory/70">Tap to correct a mark</div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* ───────────────────────── her day ───────────────────────── */

function DayStrip() {
  const d = useData()
  const now = useNow()
  const nav = useMobileNav()
  const periods = myPeriods(d, ME, now)
  const hm = now.slice(11, 16)
  const current = periods.find(p => p.start <= hm && hm < p.end)
  const next = periods.find(p => p.start > hm)
  const focus = current ?? next
  if (!periods.length) return null

  return (
    <MSection title="Your day" action={<span className="text-[12px] text-stone">{periods.length} periods</span>}>
      {focus && (
        <MCard className="mb-2" onClick={() => nav.push({ title: `Class ${focus.classId}`, render: () => <ClassDetail classId={focus.classId} /> })}>
          <div className="flex items-center justify-between">
            <Pill tone={current ? 'forest' : 'slate'} dot>{current ? 'Teaching now' : `Next · in ${minsUntil(hm, focus.start)}`}</Pill>
            <span className="text-[12.5px] tabular text-stone">{focus.start}–{focus.end}</span>
          </div>
          <div className="mt-2 font-display text-[22px] leading-tight text-ink">{focus.classId} · {focus.subject}</div>
          <div className="text-[13px] text-stone">Period {focus.period} · Room {focus.room}</div>
        </MCard>
      )}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {periods.map(p => {
          const past = p.end <= hm
          const isNow = p === current
          return (
            <motion.button key={`${p.classId}-${p.period}`} whileTap={{ scale: 0.95 }}
              onClick={() => nav.push({ title: `Class ${p.classId}`, render: () => <ClassDetail classId={p.classId} /> })}
              className={cx('min-h-[64px] w-[82px] shrink-0 rounded-[14px] border px-2.5 py-2 text-left', isNow ? 'border-forest bg-forest-p' : past ? 'border-line-2 bg-paper/60 opacity-60' : 'border-line bg-ivory-2')}>
              <div className="text-[11px] tabular text-stone">P{p.period} · {p.start}</div>
              <div className={cx('font-display text-[19px] leading-tight', isNow ? 'text-forest' : 'text-ink')}>{p.classId}</div>
              <div className="text-[11px] text-stone">{past ? 'Done' : `Rm ${p.room}`}</div>
            </motion.button>
          )
        })}
      </div>
    </MSection>
  )
}

const minsUntil = (from: string, to: string) => {
  const m = (Number(to.slice(0, 2)) * 60 + Number(to.slice(3, 5))) - (Number(from.slice(0, 2)) * 60 + Number(from.slice(3, 5)))
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`
}

/* ───────────────────────── needs you ───────────────────────── */

const NEED_ICON = { homework: ClipboardCheck, message: MessageCircle, announcement: Megaphone, marks: Hourglass, attendance: TriangleAlert } as const

function NeedsList({ needs }: { needs: Need[] }) {
  const d = useData()
  const nav = useMobileNav()
  const toast = useToast()
  const review = useSchool(s => s.reviewHomework)
  const ack = useSchool(s => s.acknowledgeAnnouncement)
  const [responding, setResponding] = useState<string | null>(null)

  return (
    <>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {needs.map(n => {
            const Icon = NEED_ICON[n.kind]
            const tap =
              n.kind === 'message' ? () => nav.push({ title: 'Conversation', render: () => <ChatScreen threadId={n.ref} /> })
              : n.kind === 'attendance' ? () => nav.push({ title: `Class ${n.ref}`, render: () => <ClassDetail classId={n.ref} /> })
              : n.kind === 'homework' ? () => { const h = d.homework.find(x => x.id === n.ref); if (h) nav.push({ title: `Class ${h.classId}`, render: () => <ClassDetail classId={h.classId} /> }) }
              : undefined
            return (
              <motion.div key={n.id} layout variants={listItem} initial="hidden" animate="show" exit="exit"
                className={cx('overflow-hidden rounded-[16px] border bg-ivory-2', n.tone === 'copper' ? 'border-copper/35' : n.tone === 'rust' ? 'border-rust/30' : 'border-line')}>
                <motion.button whileTap={tap ? { scale: 0.985 } : undefined} onClick={tap} disabled={!tap} className="flex w-full items-start gap-3 p-3.5 text-left disabled:cursor-default">
                  <IconTile icon={Icon} tone={n.tone} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium leading-snug text-ink">{n.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-stone">{n.sub}</div>
                  </div>
                  {n.kind === 'marks' && n.tone === 'amber' && <Pill tone="amber">Waiting</Pill>}
                </motion.button>
                {n.kind === 'homework' && (
                  <div className="flex gap-2 px-3.5 pb-3.5">
                    <Button block variant="copper" icon={Check} onClick={() => {
                      const h = d.homework.find(x => x.id === n.ref)
                      const c = h ? awaitingReview(h) : 0
                      review(n.ref, ME)
                      toast(`${c} submission${c === 1 ? '' : 's'} reviewed · ${h?.classId ?? ''} will see a tick`)
                    }}>Mark reviewed</Button>
                  </div>
                )}
                {n.kind === 'announcement' && (
                  <div className="flex gap-2 px-3.5 pb-3.5">
                    <Button className="flex-1" variant="copper" icon={Check} onClick={() => { ack(n.ref, ME); toast('Acknowledged · the principal can see it') }}>Acknowledge</Button>
                    <Button className="flex-1" variant="outline" icon={Reply} onClick={() => setResponding(n.ref)}>Respond</Button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        <AnimatePresence>
          {needs.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
              <EmptyState icon={Check} title="Nothing needs you" body="Every family has heard back and every submission is reviewed. Go teach." />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <RespondSheet announcementId={responding} onClose={() => setResponding(null)} />
    </>
  )
}

/* ───────────────────────── notifications ───────────────────────── */

const NOTE_ICON: Record<Notification['kind'], typeof Bell> = {
  attendance: Users, marks: Hourglass, homework: NotebookPen, fees: Bell, bus: Bell, announcement: Megaphone, message: MessageCircle, remark: NotebookPen, approval: Check, alert: TriangleAlert,
}

function NotificationsScreen() {
  const now = useNow()
  const notes = useNotifications('staff', ME)
  const read = useSchool(s => s.readNotifications)
  const unread = notes.filter(n => !n.read).length
  return (
    <MobileScreen title="Notifications" eyebrow={unread ? `${unread} new` : 'All caught up'}
      actions={unread ? <button onClick={() => read('staff', ME)} className="min-h-[36px] px-2 text-[14px] font-medium text-forest">Mark read</button> : undefined}>
      {notes.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" body="Messages from the office and the principal appear here." />
      ) : (
        <MList>
          {notes.map(n => {
            const Icon = NOTE_ICON[n.kind]
            return (
              <div key={n.id} className={cx('flex items-start gap-3 px-4 py-3', !n.read && 'bg-copper-p/40')}>
                <IconTile icon={Icon} tone={n.kind === 'alert' ? 'copper' : n.read ? 'stone' : 'forest'} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx('text-[14.5px] leading-snug text-ink', !n.read && 'font-semibold')}>{n.title}</span>
                    <span className="shrink-0 text-[11.5px] text-stone">{ago(n.at, now)}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-charcoal-2">{n.body}</p>
                </div>
              </div>
            )
          })}
        </MList>
      )}
    </MobileScreen>
  )
}
