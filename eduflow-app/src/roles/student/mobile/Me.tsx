/* Me — profile, timetable, the certificates she has earned, and her doubts. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Award, BadgeCheck, Bus, GraduationCap, Hash, Leaf, Medal, MessageCirclePlus, UserRound } from 'lucide-react'
import { Avatar, Button, Sheet, Tabs, cx } from '@/components/ui'
import { MList, MRow, MSection, MobileScreen } from '@/components/shell/Mobile'
import { useNow } from '@/store/hooks'
import { time } from '@/lib/format'
import { AskDoubtSheet, ThreadList } from './Messages'
import { ACHIEVEMENTS, HOUSE_STYLE, SubjectChip, isSubject, staffName, teacherShort, useStudent, weekdayIndex, type Achievement } from './shared'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

export function MeTab() {
  const { d, s, cls } = useStudent()
  const now = useNow()
  const todayIdx = weekdayIndex(now) ?? 0
  const [day, setDay] = useState<string>(DAYS[todayIdx])
  const [ask, setAsk] = useState(false)
  const [cert, setCert] = useState<Achievement | null>(null)
  const house = HOUSE_STYLE[s.house]
  const bus = d.buses.find(b => b.id === s.busId)
  const classTeacher = staffName(d, cls.classTeacherId)
  const dayIdx = DAYS.indexOf(day as (typeof DAYS)[number])
  const slots = d.timetable[s.classId]?.[dayIdx] ?? []
  const hm = now.slice(11, 16)

  return (
    <MobileScreen title="Me" large={false}>
      {/* profile */}
      <div className="flex flex-col items-center pt-3 text-center">
        <div className="relative">
          <Avatar name={s.name} size={84} />
          <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full ring-4 ring-ivory" style={{ backgroundColor: house.fg, color: '#FDFCF8' }}><Leaf size={15} /></span>
        </div>
        <h1 className="mt-3 font-display text-[27px] leading-tight">{s.name}</h1>
        <div className="mt-1 flex items-center gap-2 text-[13.5px] text-stone">
          Grade {s.classId}
          <span className="h-1 w-1 rounded-full bg-stone-l" />
          <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color: house.fg, backgroundColor: house.bg }}>{s.house} House</span>
        </div>
      </div>

      <MSection className="mt-5">
        <MList>
          <MRow icon={<RowIcon><Hash size={16} /></RowIcon>} title="Roll number" right={<span className="text-[14px] text-stone tabular">{s.rollNo} · {s.admissionNo}</span>} />
          <MRow icon={<RowIcon><UserRound size={16} /></RowIcon>} title="Class teacher" sub={`${classTeacher} · Room ${cls.room}`} right={<span className="text-[13px] text-stone">{teacherShort(classTeacher)}</span>} />
          <MRow icon={<RowIcon color={house.fg} bg={house.bg}><Leaf size={16} /></RowIcon>} title={`${s.house} House`} sub="Inter-house football final on Friday, 2:15 pm" right={<span className="font-display text-[17px] text-ink tabular">{s.housePoints}</span>} />
          {bus && (
            <MRow icon={<RowIcon><Bus size={16} /></RowIcon>} title={`Bus ${bus.id}`} sub={`${bus.route} · ${bus.driverName}`}
              right={<span className={cx('text-[12.5px] font-medium', bus.status === 'arrived' ? 'text-forest' : bus.status === 'delayed' ? 'text-rust' : 'text-[#8a5f14]')}>{bus.status === 'arrived' ? `At school ${bus.stops.at(-1)?.at ?? ''}` : bus.status === 'delayed' ? `${bus.delayMin} min late` : 'On the way'}</span>} />
          )}
        </MList>
      </MSection>

      {/* timetable */}
      <MSection title="Timetable" action={<span className="text-[12px] text-stone">{day === DAYS[todayIdx] ? 'Today' : ''}</span>}>
        <Tabs className="mb-2.5" value={day} onChange={setDay} tabs={DAYS.map((x, i) => ({ id: x, label: i === todayIdx ? <span className="font-semibold">{x}</span> : x }))} />
        <AnimatePresence mode="wait">
          <motion.div key={day} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
            <MList>
              {slots.map(sl => {
                const isNow = dayIdx === todayIdx && sl.start <= hm && hm < sl.end
                const isPast = dayIdx === todayIdx && sl.end <= hm
                const pause = !isSubject(sl.subject) && (sl.subject === 'Break' || sl.subject === 'Lunch')
                return (
                  <div key={sl.period} className={cx('flex items-center gap-3 px-4', pause ? 'bg-paper/50 py-1.5' : 'py-2.5', isNow && 'bg-forest-p/60')}>
                    <div className={cx('w-12 shrink-0 text-[12px] tabular', isPast ? 'text-stone-l' : 'text-stone')}>{sl.start}</div>
                    {pause ? (
                      <div className="text-[12.5px] text-stone">{sl.subject} · until {sl.end}</div>
                    ) : (
                      <>
                        <div className={cx('min-w-0 flex-1', isPast && 'opacity-55')}>
                          <div className="truncate text-[14.5px] font-medium text-ink">{sl.subject}</div>
                          <div className="truncate text-[12px] text-stone">{teacherShort(staffName(d, sl.teacherId))} · {sl.room}</div>
                        </div>
                        {isNow ? <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-semibold text-ivory">Now</span> : <SubjectChip subject={sl.subject} />}
                      </>
                    )}
                  </div>
                )
              })}
            </MList>
          </motion.div>
        </AnimatePresence>
      </MSection>

      {/* achievements */}
      <MSection title="Certificates & achievements" action={<span className="text-[12px] text-stone">{ACHIEVEMENTS.length}</span>}>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {ACHIEVEMENTS.map((a, i) => <AchievementCard key={a.id} a={a} i={i} onOpen={() => setCert(a)} />)}
        </div>
      </MSection>

      {/* doubts */}
      <MSection title="Ask a teacher" action={<button onClick={() => setAsk(true)} className="text-[13px] font-semibold text-forest">New doubt</button>}>
        <ThreadList />
        <Button block variant="soft" className="mt-2.5" icon={MessageCirclePlus} onClick={() => setAsk(true)}>Ask a doubt</Button>
      </MSection>

      <p className="mt-6 text-center text-[12px] text-stone">{d.school.name}, {d.school.city} · signed in as {s.name.split(' ')[0]} · {time(now)}</p>

      <AskDoubtSheet open={ask} onClose={() => setAsk(false)} />
      <Sheet open={!!cert} onClose={() => setCert(null)}>
        {cert && <Certificate a={cert} name={s.name} />}
      </Sheet>
    </MobileScreen>
  )
}

function RowIcon({ children, color, bg }: { children: ReactNode; color?: string; bg?: string }) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-paper text-charcoal-2" style={color ? { color, backgroundColor: bg } : undefined}>{children}</span>
}

const ACH_TONE = {
  forest: { fg: '#2E5D4E', bg: '#E4EDE9', edge: '#417A66' },
  copper: { fg: '#96602D', bg: '#F7EDE0', edge: '#B4763A' },
  slate: { fg: '#4E5A66', bg: '#E7EBEE', edge: '#7C8894' },
}
const ACH_ICON = { certificate: Award, medal: Medal, badge: BadgeCheck }

function AchievementCard({ a, i, onOpen }: { a: Achievement; i: number; onOpen: () => void }) {
  const t = ACH_TONE[a.tone]
  const Icon = ACH_ICON[a.kind]
  return (
    <motion.button onClick={onOpen}
      initial={{ opacity: 0, y: 14, rotate: i % 2 ? 1.5 : -1.5 }} animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.8 : -0.8 }} transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.95, rotate: 0, y: 2 }}
      className="relative w-[168px] shrink-0 snap-start overflow-hidden rounded-[16px] border text-left shadow-2"
      style={{ backgroundColor: t.bg, borderColor: `${t.edge}33` }}>
      <div className="absolute inset-[5px] rounded-[12px] border" style={{ borderColor: `${t.edge}40` }} />
      <div className="relative px-4 pb-4 pt-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ivory-2/80" style={{ color: t.fg }}><Icon size={20} strokeWidth={1.7} /></span>
        <div className="mt-3 font-display text-[15.5px] leading-snug" style={{ color: t.fg }}>{a.title}</div>
        <div className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-stone">{a.when}</div>
      </div>
    </motion.button>
  )
}

function Certificate({ a, name }: { a: Achievement; name: string }) {
  const t = ACH_TONE[a.tone]
  const Icon = ACH_ICON[a.kind]
  return (
    <motion.div initial={{ rotateX: 18, opacity: 0, y: 20 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} style={{ transformPerspective: 800, borderColor: `${t.edge}66` }}
      className="relative mt-2 rounded-[14px] border-2 bg-[#FBF8F1] px-6 pb-6 pt-7 text-center">
      <div className="pointer-events-none absolute inset-2 rounded-[9px] border" style={{ borderColor: `${t.edge}55` }} />
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-stone">Greenfield School · Pune</div>
      <span className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full" style={{ color: t.fg, backgroundColor: t.bg }}><Icon size={28} strokeWidth={1.5} /></span>
      <div className="mt-3 text-[12px] italic text-stone">This is to certify that</div>
      <div className="mt-1 font-display text-[26px] leading-tight text-ink">{name}</div>
      <div className="mx-auto mt-2 h-px w-24" style={{ backgroundColor: `${t.edge}66` }} />
      <div className="mt-3 font-display text-[19px] leading-snug" style={{ color: t.fg }}>{a.title}</div>
      <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-charcoal-2">{a.detail}</p>
      <div className="mt-5 flex items-end justify-between px-1 text-left">
        <div><div className="font-display text-[14px] italic text-charcoal">Meera Iyer</div><div className="text-[10.5px] uppercase tracking-[0.12em] text-stone">Principal</div></div>
        <GraduationCap size={20} className="text-stone-l" />
        <div className="text-right"><div className="text-[13px] text-charcoal">{a.when}</div><div className="text-[10.5px] uppercase tracking-[0.12em] text-stone">Awarded</div></div>
      </div>
    </motion.div>
  )
}
