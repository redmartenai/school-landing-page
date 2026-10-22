/* More: Fees, Notifications, PTM booking, Profile & linked children. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  Bell, BookOpen, BusFront, CalendarCheck, ChevronRight, CircleAlert, CircleCheck, Clock, Heart, IndianRupee,
  Megaphone, MessageCircle, Receipt, ShieldCheck, TrendingUp, User, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { Avatar, Button, EmptyState, Pill, Sheet, Tabs, cx, ease, spring, useToast, type Tone } from '@/components/ui'
import { MList, MRow, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { ago, firstName, rupees } from '@/lib/format'
import type { Notification } from '@/data/types'
import { PARENT_ID, feeSummary, staffName, useParentNotifications, useParentScope } from './data'
import { useParentCtx } from './context'
import { FeesScreen } from './Fees'
import { ToneIcon } from './bits'

export function MoreScreen() {
  const { parent, children } = useParentScope()
  const nav = useMobileNav()
  const notes = useParentNotifications()
  const { bookings } = useParentCtx()
  const unread = notes.filter(n => !n.read).length
  const overdue = children.reduce((a, c) => a + feeSummary(c).overdue, 0)
  const booked = Object.keys(bookings).length

  return (
    <MobileScreen title="More" eyebrow={`${parent.name} · ${parent.relation}`}>
      <MSection>
        <MList>
          <MRow icon={<ToneIcon icon={Wallet} tone={overdue ? 'rust' : 'forest'} />} title="Fees" sub={overdue ? `${rupees(overdue)} overdue` : 'All instalments paid'}
            right={<span className="flex items-center gap-1.5">{overdue > 0 && <Pill tone="rust">Due</Pill>}<ChevronRight size={18} className="text-stone-l" /></span>}
            onClick={() => nav.push({ title: 'Fees', render: () => <FeesScreen /> })} />
          <MRow icon={<ToneIcon icon={Bell} tone="slate" />} title="Notifications" sub={unread ? `${unread} unread` : 'All caught up'}
            right={<span className="flex items-center gap-1.5">{unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1.5 text-[11px] font-semibold text-ivory">{unread}</span>}<ChevronRight size={18} className="text-stone-l" /></span>}
            onClick={() => nav.push({ title: 'Notifications', render: () => <NotificationsScreen /> })} />
          <MRow icon={<ToneIcon icon={CalendarCheck} tone={booked === children.length ? 'forest' : 'amber'} />} title="Parent–teacher meeting"
            sub={booked === children.length ? 'Saturday 17 Oct · all booked' : `Saturday 17 Oct · ${children.length - booked} to book`}
            right={<ChevronRight size={18} className="text-stone-l" />}
            onClick={() => nav.push({ title: 'PTM', render: () => <PtmScreen /> })} />
        </MList>
      </MSection>
      <MSection title="Account">
        <MList>
          <MRow icon={<Avatar name={parent.name} size={36} />} title="Profile" sub={parent.phone} right={<ChevronRight size={18} className="text-stone-l" />}
            onClick={() => nav.push({ title: 'Profile', render: () => <ProfileScreen /> })} />
          <MRow icon={<ToneIcon icon={Users} tone="slate" />} title="Linked children" sub={children.map(c => `${firstName(c.name)} · ${c.classId}`).join('   ')}
            right={<ChevronRight size={18} className="text-stone-l" />} onClick={() => nav.push({ title: 'Profile', render: () => <ProfileScreen /> })} />
        </MList>
      </MSection>
      <p className="mt-6 px-2 text-center text-[12px] text-stone">Greenfield School, Pune · Parent app<br />You see only what concerns your own children.</p>
    </MobileScreen>
  )
}

/* ───────── notifications ───────── */

const kindIcon: Record<Notification['kind'], { icon: LucideIcon; tone: Tone }> = {
  attendance: { icon: CircleCheck, tone: 'forest' }, marks: { icon: TrendingUp, tone: 'slate' }, homework: { icon: BookOpen, tone: 'slate' },
  fees: { icon: IndianRupee, tone: 'rust' }, bus: { icon: BusFront, tone: 'forest' }, announcement: { icon: Megaphone, tone: 'slate' },
  message: { icon: MessageCircle, tone: 'slate' }, remark: { icon: Heart, tone: 'forest' }, approval: { icon: CircleCheck, tone: 'slate' }, alert: { icon: CircleAlert, tone: 'copper' },
}
function iconFor(n: Notification) {
  if (n.kind === 'attendance') return n.title.includes('absent') ? { icon: CircleAlert, tone: 'rust' as Tone } : n.title.includes('late') ? { icon: Clock, tone: 'copper' as Tone } : kindIcon.attendance
  if (n.kind === 'fees' && n.title.startsWith('Payment')) return { icon: Receipt, tone: 'forest' as Tone }
  return kindIcon[n.kind]
}

export function NotificationsScreen() {
  const notes = useParentNotifications()
  const { children } = useParentScope()
  const readNotifications = useSchool(s => s.readNotifications)
  const toast = useToast()
  const [filter, setFilter] = useState<string>('all')
  const unread = notes.filter(n => !n.read).length
  const list = filter === 'all' ? notes : notes.filter(n => n.studentId === filter || (!n.studentId) || (n.kind === 'bus' && n.body.includes(firstName(children.find(c => c.id === filter)?.name ?? '~'))))

  return (
    <MobileScreen title="Notifications" eyebrow={unread ? `${unread} unread` : 'All caught up'}
      actions={unread > 0 ? <button onClick={() => { readNotifications('parent', PARENT_ID); toast('All marked as read') }} className="rounded-lg px-2 py-1 text-[14px] font-medium text-forest">Mark all read</button> : undefined}>
      <Tabs value={filter} onChange={setFilter} size="sm" className="mb-3"
        tabs={[{ id: 'all', label: 'All' }, ...children.map(c => ({ id: c.id, label: firstName(c.name) }))]} />
      {list.length ? (
        <MList>
          <AnimatePresence initial={false}>
            {list.map(n => {
              const ic = iconFor(n)
              return (
                <motion.div key={n.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: ease.out }}
                  className={cx('flex gap-3 px-4 py-3 transition-colors duration-500', !n.read && 'bg-forest-p/35')}>
                  <ToneIcon icon={ic.icon} tone={ic.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cx('text-[14.5px] leading-snug text-ink', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
                      <span className="shrink-0 text-[12px] text-stone">{ago(n.at)}</span>
                    </div>
                    <div className="text-[13px] leading-snug text-stone">{n.body}</div>
                  </div>
                  <AnimatePresence>
                    {!n.read && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} className="mt-2 h-2 w-2 shrink-0 rounded-full bg-copper" />}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </MList>
      ) : <EmptyState icon={Bell} title="Nothing here yet" body="You'll hear about the bus, attendance, homework and notes from teachers here." />}
    </MobileScreen>
  )
}

/* ───────── PTM booking ───────── */

const SLOTS = Array.from({ length: 16 }, (_, i) => {
  const m = 9 * 60 + i * 15
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})
const takenFor = (staffId: string) => new Set(SLOTS.filter((_, i) => ([...staffId].reduce((a, c) => a + c.charCodeAt(0), 0) * (i + 3)) % 7 < 3))

export function PtmScreen() {
  const { d, children } = useParentScope()
  const { bookings, book, cancelBooking } = useParentCtx()
  const toast = useToast()
  const [picking, setPicking] = useState<{ childId: string; slot: string | null } | null>(null)
  const pickChild = children.find(c => c.id === picking?.childId)
  const pickTeacher = pickChild ? d.classes.find(c => c.id === pickChild.classId)?.classTeacherId ?? '' : ''
  const otherSlots = new Set(Object.values(bookings).filter(b => b.childId !== picking?.childId).map(b => b.slot))

  return (
    <MobileScreen title="PTM" eyebrow="Saturday 17 October · 09:00–13:00">
      <p className="mb-1 px-1 text-[13.5px] text-charcoal-2">Ten minutes with each class teacher. Report cards for Unit Test 2 will be ready to discuss.</p>
      {children.map(c => {
        const ct = d.classes.find(x => x.id === c.classId)?.classTeacherId
        const b = bookings[c.id]
        return (
          <MSection key={c.id} title={`${firstName(c.name)} · ${c.classId}`}>
            <div className="rounded-[16px] border border-line bg-ivory-2 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={staffName(d, ct)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-ink">{staffName(d, ct)}</div>
                  <div className="text-[12.5px] text-stone">Class teacher</div>
                </div>
                <AnimatePresence mode="wait">
                  {b ? <motion.span key="b" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}><Pill tone="forest" icon={CircleCheck}>{b.slot}</Pill></motion.span>
                    : <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Pill tone="amber" dot>Not booked</Pill></motion.span>}
                </AnimatePresence>
              </div>
              <div className="mt-3 flex gap-2">
                <Button block variant={b ? 'outline' : 'primary'} onClick={() => setPicking({ childId: c.id, slot: b?.slot ?? null })}>{b ? 'Change time' : 'Book a slot'}</Button>
                {b && <Button variant="ghost" onClick={() => { cancelBooking(c.id); toast(`Cancelled ${firstName(c.name)}'s slot`, 'stone') }}>Cancel</Button>}
              </div>
            </div>
          </MSection>
        )
      })}
      <Sheet open={!!picking} onClose={() => setPicking(null)} title={pickChild ? `${staffName(d, pickTeacher)} · ${firstName(pickChild.name)}` : ''}
        footer={<Button size="lg" block disabled={!picking?.slot} icon={CalendarCheck} onClick={() => {
          if (!picking?.slot || !pickChild) return
          book({ childId: pickChild.id, staffId: pickTeacher, slot: picking.slot })
          toast(`Booked ${picking.slot} with ${staffName(d, pickTeacher)}`)
          setPicking(null)
        }}>{picking?.slot ? `Book ${picking.slot} on Saturday` : 'Choose a time'}</Button>}>
        <div className="mb-2 text-[13px] text-stone">Saturday 17 October · 10-minute meetings</div>
        <div className="grid grid-cols-4 gap-2">
          {SLOTS.map(sl => {
            const taken = takenFor(pickTeacher).has(sl) || otherSlots.has(sl)
            const on = picking?.slot === sl
            return (
              <button key={sl} disabled={taken} onClick={() => setPicking(p => (p ? { ...p, slot: sl } : p))}
                className={cx('relative h-11 rounded-[10px] border text-[14px] tabular transition-colors', taken ? 'border-line-2 bg-paper text-stone-l line-through' : on ? 'border-forest text-ivory' : 'border-line bg-ivory text-ink')}>
                {on && <motion.span layoutId="ptm-slot" className="absolute inset-0 rounded-[9px] bg-forest" transition={spring} />}
                <span className="relative">{sl}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[12.5px] text-stone">Crossed-out times are taken{Object.keys(bookings).length ? ' or clash with your other booking' : ''}.</p>
      </Sheet>
    </MobileScreen>
  )
}

/* ───────── profile ───────── */

export function ProfileScreen() {
  const { d, parent, children } = useParentScope()
  return (
    <MobileScreen title="Profile">
      <div className="flex flex-col items-center pb-2 pt-1 text-center">
        <Avatar name={parent.name} size={72} />
        <div className="mt-2 font-display text-[22px]">{parent.name}</div>
        <div className="text-[13px] text-stone">{parent.relation} · {parent.phone}</div>
        <div className="text-[13px] text-stone">{parent.email}</div>
      </div>
      <MSection title="Linked children">
        <div className="space-y-2.5">
          {children.map(c => {
            const cls = d.classes.find(x => x.id === c.classId)
            const rows: [string, string][] = [
              ['Class', `${c.classId} · Roll ${c.rollNo}`],
              ['Class teacher', staffName(d, cls?.classTeacherId)],
              ['House', `${c.house}`],
              ['Bus', c.busId ? `Bus ${c.busId} · ${d.buses.find(b => b.id === c.busId)?.route ?? ''}` : 'Not on a bus'],
              ['Admission no.', c.admissionNo],
            ]
            return (
              <div key={c.id} className="rounded-[16px] border border-line bg-ivory-2 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={44} />
                  <div>
                    <div className="font-display text-[18px] leading-tight text-ink">{c.name}</div>
                    <div className="text-[12.5px] text-stone">Greenfield School</div>
                  </div>
                </div>
                <dl className="mt-3 divide-y divide-line-2 text-[13.5px]">
                  {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-stone">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>)}
                </dl>
              </div>
            )
          })}
        </div>
      </MSection>
      <div className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-slate-p px-4 py-3 text-[13px] text-slate">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <span>Only {children.map(c => firstName(c.name)).join(' and ')} are linked to your account. To add a child or change details, contact the school office.</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-stone"><User size={13} /> Signed in as {parent.email}</div>
    </MobileScreen>
  )
}
