import { AnimatePresence, motion } from 'framer-motion'
import {
  Baby, Building, Bus as BusIcon, CircleDot, Eye, EyeOff, FlaskConical, Flower2, Gauge, Map as MapIcon, Maximize2, Pause, Play,
  RotateCcw, Shield, Tag, Theater, TriangleAlert, Trophy, Users, Waves, X, type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, LiveDot, Pill, cx, ease, spring, toneClass, useToast, type Tone } from '@/components/ui'
import { useSchool, DEMO } from '@/store/school'
import { useNow } from '@/store/hooks'
import {
  DAY_END, DAY_START, classNow, freeTeachers, isAvailable, staffToday, toHHMM, toMin, uncoveredToday, weekdayIndex,
  type ClassNow, type RoomStatus,
} from '@/engine/campus'
import { studentRisk } from '@/engine/monitoring'
import { FLOOR_NAMES, LEVELS, PLACES, ROOMS, STATUS_META } from './layout'
import { useCampus, useCampusUi } from './ui'
import { busPose } from './busPose'
import { BUS_SLOTS } from './layout'

const Scene = lazy(() => import('./Scene'))

const glass = 'z-40 rounded-[16px] border border-line/80 bg-ivory-2/85 shadow-2 backdrop-blur-xl'

/* ───────────────────────── page ───────────────────────── */

export function CampusPage() {
  const now = useNow()
  const { live, set } = useCampusUi()
  const minute = useCampusUi(s => s.minute)
  const playing = useCampusUi(s => s.playing)
  const selected = useCampusUi(s => s.selected)
  const wrap = useRef<HTMLDivElement>(null)

  // live mode follows the demo clock
  useEffect(() => { if (live) set({ minute: toMin(now.slice(11, 16)) }) }, [live, now, set])
  // replay: one school-minute every 140ms
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      const m = useCampusUi.getState().minute
      if (m >= DAY_END) { set({ playing: false }); return }
      set({ minute: m + 1, live: false })
    }, 140)
    return () => clearInterval(t)
  }, [playing, set])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ selected: null, focusFloor: null, focusField: false, focusPlace: null }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  return (
    <div ref={wrap} className="relative -mx-4 -mb-16 -mt-6 h-[calc(100dvh-64px)] overflow-hidden bg-[#EAE2D4] md:-mx-8 md:-mt-8">
      <Suspense fallback={<SceneLoading />}>
        <Scene eventSource={wrap as React.RefObject<HTMLElement>} />
      </Suspense>

      {/* top-left: clock, counts, cover */}
      <div className="pointer-events-none absolute left-4 top-4 z-40 flex w-[330px] max-w-[calc(100%-2rem)] flex-col gap-3">
        <ClockCard minute={minute} live={live} />
        <CoverCard />
      </div>

      {/* top-right toolbar */}
      <Toolbar wrap={wrap} />

      {/* go-to strip + tower elevator */}
      <GoTo />
      <Elevator />

      {/* detail drawer */}
      <AnimatePresence>{selected && <Detail key={selected} id={selected} />}</AnimatePresence>

      {/* bottom: timeline */}
      <Timeline />
    </div>
  )
}

function SceneLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="text-center">
        <motion.div className="mx-auto mb-4 h-14 w-10 rounded-[6px] border-2 border-forest" animate={{ scaleY: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} style={{ originY: 1 }} />
        <div className="font-display text-[20px]">Building Greenfield…</div>
        <div className="text-[13px] text-stone">Eight floors, five buses, three hundred children</div>
      </div>
    </div>
  )
}

/* ───────────────────────── clock & counts ───────────────────────── */

const COUNT_ORDER: { key: RoomStatus[]; label: string; tone: Tone }[] = [
  { key: ['teaching'], label: 'Teaching', tone: 'forest' },
  { key: ['substitute'], label: 'Substitute', tone: 'copper' },
  { key: ['uncovered', 'teacher-late'], label: 'No teacher', tone: 'rust' },
  { key: ['playground'], label: 'On the field', tone: 'slate' },
  { key: ['library', 'lab'], label: 'Library / Lab', tone: 'slate' },
]

function ClockCard({ minute, live }: { minute: number; live: boolean }) {
  const campus = useCampus()
  const d = useSchool()
  const set = useCampusUi(s => s.set)
  const select = useCampusUi(s => s.select)
  const slot = d.timetable['9B'][weekdayIndex(d)].find(s => toMin(s.start) <= minute && minute < toMin(s.end))
  const label = minute < 8 * 60 ? 'Before the first bell' : minute >= 14 * 60 + 10 ? 'School’s out' : slot?.subject === 'Break' ? 'Morning break' : slot?.subject === 'Lunch' ? 'Lunch' : `Period ${slot?.period} · ${slot?.start}–${slot?.end}`
  const pickFirst = (keys: RoomStatus[]) => {
    const c = campus.find(x => keys.includes(x.status))
    if (!c) return
    if (c.status === 'playground') { set({ focusPlace: 'field', selected: null, focusFloor: null }); return }
    const room = ROOMS.find(r => r.id === c.classId)!
    select(c.classId); set({ focusFloor: room.level })
  }
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: ease.out, delay: 0.3 }} className={cx(glass, 'pointer-events-auto p-4')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
          {live ? <><LiveDot /> Live campus</> : <><span className="h-2 w-2 rounded-full bg-copper" /> Replaying today</>}
        </div>
        {!live && <button onClick={() => set({ live: true, playing: false })} className="rounded-full bg-forest px-2.5 py-0.5 text-[11.5px] font-medium text-ivory">Back to live</button>}
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        <motion.span key={minute} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-display text-[44px] leading-none tabular text-ink">{toHHMM(minute)}</motion.span>
        <span className="text-[13px] text-stone">{label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {COUNT_ORDER.map(c => {
          const n = campus.filter(x => c.key.includes(x.status)).length
          return (
            <button key={c.label} onClick={() => pickFirst(c.key)} disabled={!n}
              className={cx('flex items-center justify-between rounded-[10px] px-2.5 py-1.5 text-left text-[12.5px] transition-colors', n ? 'hover:bg-paper' : 'opacity-45', c.tone === 'rust' && n ? 'bg-rust-p text-rust' : 'text-charcoal-2')}>
              <span className="flex items-center gap-2"><span className={cx('h-2 w-2 rounded-full', toneClass[c.tone].dot)} />{c.label}</span>
              <span className="font-display text-[16px] tabular text-ink">{n}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

function CoverCard() {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const set = useCampusUi(s => s.set)
  const select = useCampusUi(s => s.select)
  const list = useMemo(() => uncoveredToday(d, 0), [d])
  const staffName = (id: string) => d.staff.find(s => s.id === id)?.name ?? id
  if (!list.length) return (
    <div className={cx(glass, 'pointer-events-auto flex items-center gap-2.5 px-4 py-3 text-[13px] text-forest')}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-forest-p">✓</span> Every class has a teacher today.
    </div>
  )
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: ease.out, delay: 0.45 }} className={cx(glass, 'pointer-events-auto overflow-hidden')}>
      <div className="flex items-center gap-2 border-b border-line-2 bg-rust-p/70 px-4 py-2.5">
        <TriangleAlert size={15} className="text-rust" />
        <span className="text-[13px] font-semibold text-rust">{list.length} period{list.length > 1 ? 's' : ''} need cover today</span>
      </div>
      <div className="max-h-[210px] overflow-y-auto scroll-quiet">
        <AnimatePresence initial={false}>
          {list.map(u => {
            const past = toMin(u.slot.end) <= minute
            const nowOn = toMin(u.slot.start) <= minute && minute < toMin(u.slot.end)
            return (
              <motion.button key={`${u.classId}:${u.slot.period}`} layout exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
                onClick={() => { set({ minute: toMin(u.slot.start) + 2, live: false, playing: false }); select(u.classId); set({ focusFloor: ROOMS.find(r => r.id === u.classId)!.level }) }}
                className={cx('flex w-full items-center gap-3 border-b border-line-2 px-4 py-2.5 text-left last:border-0 hover:bg-paper/70', past && 'opacity-50')}>
                <span className={cx('font-display text-[17px] w-11', nowOn ? 'text-rust' : 'text-ink')}>{u.classId}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">P{u.slot.period} · {u.slot.start} · {u.slot.subject}</span>
                  <span className="block truncate text-[11.5px] text-stone">{staffName(u.teacherId)} {u.reason === 'leave' ? 'on leave' : 'absent, no notice'}</span>
                </span>
                {nowOn ? <Pill tone="rust" dot>Now</Pill> : <span className="text-[12px] font-medium text-copper-d">Assign</span>}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ───────────────────────── toolbar ───────────────────────── */

function Toolbar({ wrap }: { wrap: React.RefObject<HTMLDivElement | null> }) {
  const { labels, people, quality, set } = useCampusUi()
  const btn = 'flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-medium transition-colors'
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={cx(glass, 'absolute right-4 top-4 flex items-center gap-1 p-1')}>
      <button onClick={() => set({ labels: !labels })} className={cx(btn, labels ? 'bg-forest-p text-forest' : 'text-stone hover:bg-paper')}><Tag size={14} /> Labels</button>
      <button onClick={() => set({ people: !people })} className={cx(btn, people ? 'bg-forest-p text-forest' : 'text-stone hover:bg-paper')}>{people ? <Eye size={14} /> : <EyeOff size={14} />} People</button>
      <button onClick={() => set({ quality: quality === 'high' ? 'fast' : 'high' })} className={cx(btn, 'text-charcoal-2 hover:bg-paper')} title="Rendering quality"><Gauge size={14} /> {quality === 'high' ? 'Cinematic' : 'Fast'}</button>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <button onClick={() => set({ selected: null, focusFloor: null, focusField: false, focusPlace: null })} className={cx(btn, 'text-charcoal-2 hover:bg-paper')} title="Reset view"><RotateCcw size={14} /></button>
      <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())} className={cx(btn, 'text-charcoal-2 hover:bg-paper')} title="Full screen"><Maximize2 size={14} /></button>
    </motion.div>
  )
}

/* ───────────────────────── go-to strip ───────────────────────── */

const GO: { id: string; icon: LucideIcon; bus?: boolean }[] = [
  { id: 'campus', icon: MapIcon }, { id: 'tower', icon: Building }, { id: 'science', icon: FlaskConical }, { id: 'junior', icon: Baby },
  { id: 'arena', icon: Waves }, { id: 'auditorium', icon: Theater }, { id: 'garden', icon: Flower2 }, { id: 'field', icon: Trophy },
  { id: 'courts', icon: CircleDot }, { id: 'buses', icon: BusIcon, bus: true }, { id: 'gate', icon: Shield },
]

function GoTo() {
  const { focusPlace, selected, focusFloor, set } = useCampusUi()
  const select = useCampusUi(s => s.select)
  const activeId = selected?.startsWith('bus:') ? 'buses' : selected?.startsWith('place:') ? selected.slice(6) : focusPlace ?? (!selected && focusFloor === null ? 'campus' : null)
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, right: selected ? 404 : 16 }} transition={{ duration: 0.45, ease: ease.out }} className={cx(glass, 'absolute top-[68px] flex items-center gap-0.5 p-1')}>
      <span className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone">Go to</span>
      {GO.map(g => {
        const on = activeId === g.id
        return (
          <button key={g.id} title={g.bus ? 'Bus bay' : PLACES[g.id]?.label}
            onClick={() => { if (g.bus) { select('bus:17'); return } select(null); set({ focusPlace: g.id === 'campus' ? null : g.id, focusFloor: null, focusField: false }) }}
            className={cx('group relative grid h-8 w-8 place-items-center rounded-[9px] transition-colors', on ? 'text-ivory' : 'text-charcoal-2 hover:bg-paper')}>
            {on && <motion.span layoutId="goto" className="absolute inset-0 rounded-[9px] bg-forest" transition={spring} />}
            <g.icon size={15} className="relative" />
            <span className="pointer-events-none absolute top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] text-ivory group-hover:block">{g.bus ? 'Bus bay' : PLACES[g.id]?.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}

/* ───────────────────────── elevator panel ───────────────────────── */

function Elevator() {
  const campus = useCampus()
  const { focusFloor, focusField, selected, set } = useCampusUi()
  const select = useCampusUi(s => s.select)
  const levels = Array.from({ length: LEVELS }, (_, i) => LEVELS - 1 - i)
  const shifted = !!selected
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, right: shifted ? 404 : 16 }} transition={{ duration: 0.45, ease: ease.out }}
      className={cx(glass, 'absolute top-[128px] flex w-[64px] flex-col items-stretch gap-1 p-1.5')}>
      <button onClick={() => { select(null); set({ focusFloor: null, focusField: false, focusPlace: 'tower' }) }}
        className={cx('rounded-[10px] py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]', focusFloor === null && !focusField && !selected ? 'bg-ink text-ivory' : 'text-stone hover:bg-paper')}>Tower</button>
      {levels.map(l => {
        const rooms = ROOMS.filter(r => r.level === l)
        const on = focusFloor === l
        return (
          <button key={l} title={FLOOR_NAMES[l]} onClick={() => { select(null); set({ focusFloor: on ? null : l, focusField: false, focusPlace: null }) }}
            className={cx('group relative flex flex-col items-center rounded-[10px] py-1.5 transition-colors', on ? 'bg-forest text-ivory' : 'hover:bg-paper')}>
            {on && <motion.span layoutId="elev" className="absolute inset-0 rounded-[10px] bg-forest" transition={spring} />}
            <span className={cx('relative font-display text-[18px] leading-none', on ? 'text-ivory' : 'text-ink')}>{l === 0 ? 'G' : l}</span>
            <span className="relative mt-1 flex gap-1">
              {rooms.map(r => {
                const c = campus.find(x => x.classId === r.id)
                const color = c ? STATUS_META[c.status].color : '#CFC6B6'
                return <span key={r.id} className={cx('h-1.5 w-1.5 rounded-full', c && STATUS_META[c.status].alarm && 'animate-pulse')} style={{ background: color }} />
              })}
            </span>
            <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] text-ivory group-hover:block">{FLOOR_NAMES[l]}</span>
          </button>
        )
      })}
</motion.div>
  )
}

/* ───────────────────────── timeline ───────────────────────── */

function Timeline() {
  const d = useSchool()
  const { minute, playing, live, set } = useCampusUi()
  const now = useNow()
  const slots = d.timetable['9B'][weekdayIndex(d)]
  const span = DAY_END - DAY_START
  const pct = (m: number) => ((m - DAY_START) / span) * 100
  const liveMin = toMin(now.slice(11, 16))
  const track = useRef<HTMLDivElement>(null)
  const seek = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    const m = Math.round(DAY_START + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span)
    set({ minute: m, live: Math.abs(m - liveMin) < 1, playing: false })
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5, ease: ease.out }}
      className={cx(glass, 'absolute bottom-4 left-4 right-4 mx-auto flex max-w-[980px] items-center gap-3 px-3 py-2.5')}>
      <button onClick={() => set({ playing: !playing, live: false, ...(minute >= DAY_END ? { minute: DAY_START } : {}) })}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-ivory shadow-[0_8px_18px_-10px_rgba(46,93,78,.8)]" aria-label={playing ? 'Pause' : 'Play the day'}>
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div ref={track} className="relative h-9 cursor-pointer select-none" onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); seek(e.clientX) }} onPointerMove={e => { if (e.buttons) seek(e.clientX) }}>
          {/* period blocks */}
          {slots.map(s => {
            const brk = s.subject === 'Break' || s.subject === 'Lunch'
            return (
              <div key={s.period} className={cx('absolute top-1 h-4 rounded-[4px] border', brk ? 'border-transparent bg-stone-p/60' : 'border-line bg-paper')} style={{ left: `${pct(toMin(s.start))}%`, width: `calc(${pct(toMin(s.end)) - pct(toMin(s.start))}% - 2px)` }}>
                <span className="absolute inset-0 grid place-items-center text-[9.5px] font-semibold text-stone">{brk ? (s.subject === 'Break' ? '' : 'Lunch') : `P${s.period}`}</span>
              </div>
            )
          })}
          {/* uncovered markers */}
          {uncoveredToday(d, 0).map(u => <span key={`${u.classId}${u.slot.period}`} className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rust" style={{ left: `${pct(toMin(u.slot.start) + 20)}%` }} />)}
          {/* hour ticks */}
          {[8, 9, 10, 11, 12, 13, 14].map(h => <span key={h} className="absolute bottom-0 -translate-x-1/2 text-[10px] tabular text-stone-l" style={{ left: `${pct(h * 60)}%` }}>{h}:00</span>)}
          {/* live marker */}
          <span className="absolute top-0 h-6 w-px bg-copper" style={{ left: `${pct(liveMin)}%` }} />
          {/* playhead */}
          <motion.div className="absolute top-[-3px] -translate-x-1/2" animate={{ left: `${pct(minute)}%` }} transition={{ duration: playing ? 0.14 : 0.25, ease: 'linear' }}>
            <div className="h-[26px] w-[3px] rounded-full bg-ink shadow" />
          </motion.div>
        </div>
      </div>
      <button onClick={() => set({ live: true, playing: false })} className={cx('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium', live ? 'bg-forest-p text-forest' : 'border border-line text-charcoal-2 hover:bg-paper')}>
        <LiveDot tone={live ? 'forest' : 'stone'} /> Live
      </button>
    </motion.div>
  )
}

/* ───────────────────────── detail drawer ───────────────────────── */

function Detail({ id }: { id: string }) {
  const select = useCampusUi(s => s.select)
  const set = useCampusUi(s => s.set)
  const room = ROOMS.find(r => r.id === id)
  const place = id.startsWith('place:') ? PLACES[id.slice(6)] : undefined
  const title = id.startsWith('bus:') ? `Bus ${id.slice(4)}` : place?.label ?? room?.label ?? id
  const eyebrow = id.startsWith('bus:') ? 'Bus bay' : place ? place.eyebrow : room ? `Level ${room.level === 0 ? 'G' : room.level} · Room ${room.roomNo}` : ''
  return (
    <motion.aside initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ duration: 0.45, ease: ease.out }}
      className={cx(glass, 'absolute bottom-[86px] right-4 top-4 flex w-[376px] max-w-[calc(100%-2rem)] flex-col overflow-hidden')}>
      <div className="flex items-start justify-between gap-3 border-b border-line-2 px-5 pb-3 pt-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">{eyebrow}</div>
          <h2 className="font-display text-[28px] leading-tight">{title}</h2>
        </div>
        <button onClick={() => { select(null); set({ focusFloor: null, focusPlace: null }) }} className="rounded-lg p-1.5 text-stone hover:bg-paper" aria-label="Close"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scroll-quiet">
        {place ? <BlockDetail id={place.id} /> : room?.kind === 'class' ? <ClassDetail classId={id} /> : id.startsWith('bus:') ? <BusDetail busId={id.slice(4)} /> : room ? <PlaceDetail kind={room.kind} /> : null}
      </div>
    </motion.aside>
  )
}

const STATUS_LINE: Record<RoomStatus, (c: ClassNow, name: (id: string | null) => string) => string> = {
  teaching: (c, n) => `${n(c.teacherId)} is teaching ${c.slot?.subject}.`,
  substitute: (c, n) => `${n(c.substituteId)} is covering ${c.slot?.subject} for ${n(c.scheduledTeacherId)}.`,
  uncovered: (c, n) => `Nobody is with ${c.classId}. ${n(c.scheduledTeacherId)} is ${c.teacherState === 'leave' ? 'on leave' : 'absent'} and no cover is assigned.`,
  'teacher-late': (c, n) => `${n(c.scheduledTeacherId)} hasn’t checked in yet — the class is waiting.`,
  playground: (c, n) => `${c.classId} is out on the field for Games with ${n(c.teacherId)}.`,
  library: (c, n) => `${c.classId} is in the library with ${n(c.teacherId)}.`,
  lab: (c, n) => c.location === 'science' ? `${c.classId} is across in the Science Block labs with ${n(c.teacherId ?? c.substituteId)}.` : `${c.classId} is in the Computer Lab on Level 6 with ${n(c.teacherId ?? c.substituteId)}.`,
  break: () => 'Break time — the classroom is empty.',
  before: () => 'Children are arriving. First bell at 08:00.',
  after: () => 'School’s out. The room is empty.',
}

function ClassDetail({ classId }: { classId: string }) {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const set = useCampusUi(s => s.set)
  const assign = useSchool(s => s.assignSubstitute)
  const nudge = useSchool(s => s.nudge)
  const toast = useToast()
  const c = useMemo(() => classNow(d, classId, minute), [d, classId, minute])
  const cls = d.classes.find(x => x.id === classId)!
  const name = (id: string | null) => (id ? d.staff.find(s => s.id === id)?.name ?? '—' : 'Nobody')
  const meta = STATUS_META[c.status]
  const sched = c.scheduledTeacherId ? d.staff.find(s => s.id === c.scheduledTeacherId) : undefined
  const schedToday = sched ? staffToday(d, sched) : null
  const needsCover = c.status === 'uncovered' && c.slot
  const later = uncoveredToday(d, minute).filter(u => u.classId === classId && !(c.slot && u.slot.period === c.slot.period))
  const pool = (period: number, start: string, subject: string) =>
    freeTeachers(d, toMin(start), period).sort((a, b) => Number(b.subjects.includes(subject as never)) - Number(a.subjects.includes(subject as never)))
  const atRisk = cls.studentIds.map(id => d.students.find(s => s.id === id)!).filter(s => studentRisk(d, s).level === 'at-risk')
  const classTeacher = d.staff.find(s => s.id === cls.classTeacherId)!

  const doAssign = (period: number, staffId: string) => {
    assign(classId, period, staffId, DEMO.principalId)
    toast(`${name(staffId)} is covering ${classId} · P${period}`, 'copper')
  }

  return (
    <div className="space-y-5">
      <div className={cx('rounded-[14px] p-4', c.status === 'uncovered' || c.status === 'teacher-late' ? 'bg-rust text-ivory' : toneClass[meta.tone].bg)}>
        <div className="flex items-center justify-between">
          <span className={cx('text-[11px] font-semibold uppercase tracking-[0.14em]', meta.alarm ? 'text-ivory/80' : toneClass[meta.tone].text)}>{meta.label}</span>
          {c.slot && <span className={cx('text-[12px] tabular', meta.alarm ? 'text-ivory/80' : 'text-stone')}>P{c.slot.period} · {c.slot.start}–{c.slot.end}</span>}
        </div>
        <p className={cx('mt-1.5 text-[15px] leading-snug', meta.alarm ? 'text-ivory' : 'text-ink')}>{STATUS_LINE[c.status](c, name)}</p>
        {c.location === 'field' && <button onClick={() => set({ focusPlace: 'field', selected: null, focusFloor: null })} className="mt-2 text-[12.5px] font-medium text-slate underline-offset-2 hover:underline">Show me the field →</button>}
      </div>

      {needsCover && (
        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rust">Assign cover now</div>
          <CoverPool teachers={pool(c.slot!.period, c.slot!.start, c.slot!.subject)} subject={c.slot!.subject} onAssign={id => doAssign(c.slot!.period, id)} />
        </section>
      )}

      {sched && (
        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">Teachers</div>
          <div className="space-y-2">
            <PersonRow name={sched.name} sub={`${c.slot?.subject} · ${schedToday?.status === 'absent' ? 'absent, no leave' : schedToday?.status === 'leave' ? 'on approved leave' : schedToday?.status === 'late' ? `late — in at ${schedToday.checkIn}` : `in since ${schedToday?.checkIn ?? '—'}`}`}
              tone={schedToday?.status === 'absent' ? 'rust' : schedToday?.status === 'leave' ? 'amber' : schedToday?.status === 'late' ? 'copper' : 'forest'} />
            {c.substituteId && <PersonRow name={name(c.substituteId)} sub={isAvailable(d, c.substituteId, minute) ? 'Covering this period' : 'Assigned, not in yet'} tone="copper" />}
          </div>
        </section>
      )}

      {later.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">Later today without a teacher</div>
          <div className="space-y-3">
            {later.map(u => (
              <div key={u.slot.period} className="rounded-[12px] border border-rust/20 bg-rust-p/50 p-3">
                <div className="mb-2 text-[13.5px] text-ink"><b className="font-semibold">P{u.slot.period}</b> · {u.slot.start} · {u.slot.subject} — {name(u.teacherId)}</div>
                <CoverPool compact teachers={pool(u.slot.period, u.slot.start, u.slot.subject)} subject={u.slot.subject} onAssign={id => doAssign(u.slot.period, id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">Children</div>
        <div className="grid grid-cols-3 gap-2">
          <Mini label="In" value={c.registerMarked ? c.presentIds.length - c.lateIds.length : '—'} tone="forest" />
          <Mini label="Late" value={c.registerMarked ? c.lateIds.length : '—'} tone="amber" />
          <Mini label="Absent" value={c.registerMarked ? c.absentIds.length : '—'} tone="rust" />
        </div>
        {!c.registerMarked ? (
          <div className="mt-2 flex items-center justify-between rounded-[12px] bg-amber-p px-3 py-2.5 text-[13px] text-[#8a5f14]">
            Register not taken yet
            <button onClick={() => { nudge(classTeacher.id, `Please take the ${classId} register`, 'The office and parents are waiting.', DEMO.principalId); toast(`Reminded ${classTeacher.name}`) }} className="font-semibold underline-offset-2 hover:underline">Remind {classTeacher.name.split(' ').slice(0, 2).join(' ')}</button>
          </div>
        ) : c.absentIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.absentIds.slice(0, 8).map(id => <Pill key={id} tone="rust">{d.students.find(s => s.id === id)?.name}</Pill>)}
          </div>
        )}
        {atRisk.length > 0 && (
          <Link to={`/principal/students?s=${atRisk[0].id}`} className="mt-3 flex items-center justify-between rounded-[12px] border border-line px-3 py-2.5 text-[13px] hover:bg-paper">
            <span><b className="font-semibold text-copper-d">{atRisk.length}</b> child{atRisk.length > 1 ? 'ren' : ''} at risk in {classId}</span>
            <Users size={15} className="text-stone" />
          </Link>
        )}
      </section>
      <div className="text-[12px] text-stone">Class teacher: {classTeacher.name} · Room {cls.room}</div>
    </div>
  )
}

function CoverPool({ teachers, subject, onAssign, compact }: { teachers: ReturnType<typeof freeTeachers>; subject: string; onAssign: (id: string) => void; compact?: boolean }) {
  if (!teachers.length) return <div className="text-[13px] text-stone">No free teacher this period — consider merging with a parallel section.</div>
  return (
    <div className="space-y-1.5">
      {teachers.slice(0, compact ? 3 : 5).map(t => (
        <motion.div key={t.id} layout className="flex items-center gap-3 rounded-[12px] border border-line bg-ivory-2 px-3 py-2">
          <Avatar name={t.name} size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium text-ink">{t.name}</div>
            <div className="truncate text-[11.5px] text-stone">{t.subjects[0]}{t.subjects.includes(subject as never) ? ' · same subject' : ' · free this period'}</div>
          </div>
          <button onClick={() => onAssign(t.id)} className="rounded-[9px] bg-copper px-3 py-1.5 text-[12.5px] font-medium text-ivory hover:bg-copper-d">Assign</button>
        </motion.div>
      ))}
    </div>
  )
}

const PersonRow = ({ name, sub, tone }: { name: string; sub: string; tone: Tone }) => (
  <div className="flex items-center gap-3 rounded-[12px] border border-line bg-ivory-2 px-3 py-2.5">
    <Avatar name={name} size={34} />
    <div className="min-w-0 flex-1">
      <div className="truncate text-[14px] font-medium text-ink">{name}</div>
      <div className="truncate text-[12px] text-stone">{sub}</div>
    </div>
    <span className={cx('h-2.5 w-2.5 rounded-full', toneClass[tone].dot)} />
  </div>
)

const Mini = ({ label, value, tone }: { label: string; value: number | string; tone: Tone }) => (
  <div className={cx('rounded-[12px] px-3 py-2', toneClass[tone].bg)}>
    <div className={cx('text-[11px] font-medium', toneClass[tone].text)}>{label}</div>
    <div className="font-display text-[22px] leading-tight tabular text-ink">{value}</div>
  </div>
)

function PlaceDetail({ kind }: { kind: string }) {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const campus = useCampus()
  if (kind === 'staff') {
    const free = freeTeachers(d, minute)
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-charcoal-2">{free.length} teachers are free right now — your substitution pool.</p>
        {free.map(t => <PersonRow key={t.id} name={t.name} sub={`${t.subjects[0] ?? t.designation} · free this period`} tone="forest" />)}
      </div>
    )
  }
  if (kind === 'library' || kind === 'lab') {
    const here = campus.filter(c => c.location === kind && c.status !== 'break')
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-charcoal-2">{here.length ? `${here.map(c => c.classId).join(' and ')} ${here.length > 1 ? 'are' : 'is'} here now.` : 'Nobody is booked in this period.'}</p>
        {here.map(c => <PersonRow key={c.classId} name={`Class ${c.classId}`} sub={`${c.presentIds.length} children · ${c.slot?.subject}`} tone="slate" />)}
      </div>
    )
  }
  if (kind === 'principal') return <p className="text-[14px] text-charcoal-2">Your office. From here — or from this screen — every classroom is one glance away.</p>
  if (kind === 'cafeteria') return <p className="text-[14px] text-charcoal-2">Reception is staffed all day. The cafeteria fills at 10:15 and again at 12:00.</p>
  return <p className="text-[14px] text-charcoal-2">Free all day. Book it for the PTM briefing on Saturday.</p>
}

function BusDetail({ busId }: { busId: string }) {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const select = useCampusUi(s => s.select)
  const order = [...d.buses].sort((a, b) => a.stops[a.stops.length - 1].at.localeCompare(b.stops[b.stops.length - 1].at))
  return (
    <div className="space-y-2">
      {order.map((b, i) => {
        const pose = busPose(b, BUS_SLOTS[i], minute)
        const late = b.delayMin >= 10
        return (
          <button key={b.id} onClick={() => select(`bus:${b.id}`)} className={cx('flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left', b.id === busId ? 'border-copper bg-copper-p/50' : 'border-line bg-ivory-2 hover:bg-paper')}>
            <span className={cx('grid h-9 w-9 place-items-center rounded-[10px] font-display text-[16px]', late && pose.state !== 'parked' ? 'bg-rust text-ivory' : 'bg-amber-p text-ink')}>{b.id}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-ink">{b.route}</div>
              <div className="truncate text-[12px] text-stone">{b.driverName} · {b.studentIds.length} children · {b.vehicleNo}</div>
            </div>
            <Pill tone={pose.state === 'parked' ? 'forest' : late ? 'rust' : 'amber'}>{pose.state === 'parked' ? `Bay ${i + 1}` : pose.state === 'arriving' ? (late ? `+${b.delayMin}m` : 'Arriving') : pose.state === 'leaving' ? 'Leaving' : late ? `+${b.delayMin}m` : 'On route'}</Pill>
          </button>
        )
      })}
    </div>
  )
}

/* ───────────────────────── block details ───────────────────────── */

function BlockDetail({ id }: { id: string }) {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const select = useCampusUi(s => s.select)
  const set = useCampusUi(s => s.set)
  const campus = useCampus()
  const name = (sid: string | null) => (sid ? d.staff.find(s => s.id === sid)?.name ?? '—' : '—')
  const P = ({ children }: { children: React.ReactNode }) => <p className="text-[14px] leading-relaxed text-charcoal-2">{children}</p>
  const openClass = (cid: string) => { select(cid); set({ focusFloor: ROOMS.find(r => r.id === cid)!.level }) }

  if (id === 'science') {
    const here = campus.filter(c => c.location === 'science')
    const next = d.classes.flatMap(c => d.timetable[c.id][weekdayIndex(d)].filter(s => s.subject === 'Science' && toMin(s.start) > minute).map(s => ({ c: c.id, s }))).sort((a, b) => a.s.start.localeCompare(b.s.start)).slice(0, 4)
    return (
      <div className="space-y-4">
        <P>Physics on the ground floor, Chemistry on Level 1, Biology on Level 2. Classes with a Science period walk over from the tower.</P>
        {here.length ? here.map((c, i) => (
          <button key={c.classId} onClick={() => openClass(c.classId)} className="block w-full text-left">
            <PersonRow name={`Class ${c.classId} · ${['Physics', 'Chemistry', 'Biology'][i] ?? 'Lab'} lab`} sub={`${c.presentIds.length} children · ${c.status === 'uncovered' ? 'no teacher — still in their classroom' : name(c.teacherId)}`} tone={c.status === 'uncovered' ? 'rust' : c.status === 'substitute' ? 'copper' : 'forest'} />
          </button>
        )) : <div className="rounded-[12px] bg-paper px-3 py-2.5 text-[13px] text-stone">All three labs are free this period.</div>}
        {next.length > 0 && (
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">Coming up</div>
            {next.map(n => <div key={n.c + n.s.period} className="flex justify-between border-b border-line-2 py-2 text-[13.5px] last:border-0"><span className="text-ink">{n.c}</span><span className="text-stone">P{n.s.period} · {n.s.start} · {name(n.s.teacherId)}</span></div>)}
          </section>
        )}
      </div>
    )
  }
  if (id === 'tower') {
    const counts = (k: RoomStatus[]) => campus.filter(c => k.includes(c.status)).length
    return (
      <div className="space-y-3">
        <P>Eight floors: Grades 6–10 on Levels 1–5, the library and computer lab on Level 6, and your office on Level 7.</P>
        <div className="grid grid-cols-3 gap-2">
          <Mini label="Teaching" value={counts(['teaching'])} tone="forest" />
          <Mini label="Covered" value={counts(['substitute'])} tone="copper" />
          <Mini label="No teacher" value={counts(['uncovered', 'teacher-late'])} tone="rust" />
        </div>
        <button onClick={() => { select(null); set({ focusPlace: null, focusFloor: 4 }) }} className="text-[13px] font-medium text-forest">Open the Grade 9 floor →</button>
      </div>
    )
  }
  if (id === 'auditorium') {
    const assembly = minute >= 470 && minute < 482
    return (
      <div className="space-y-3">
        <div className={cx('rounded-[14px] p-4', assembly ? 'bg-copper-p' : 'bg-paper')}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">{assembly ? 'Now' : 'Right now'}</div>
          <p className="mt-1 text-[15px] text-ink">{assembly ? 'Morning assembly — the whole school is seated.' : 'The drama club is rehearsing for Annual Day.'}</p>
        </div>
        <P>420 seats. Assembly every morning at 07:50. Next event: the parent–teacher meeting briefing on Saturday 17 October.</P>
        <button onClick={() => set({ minute: 475, live: false, playing: false })} className="text-[13px] font-medium text-forest">Replay this morning’s assembly →</button>
      </div>
    )
  }
  if (id === 'field') {
    const out = campus.filter(c => c.location === 'field')
    return (
      <div className="space-y-3">
        <P>{out.length ? `${out.map(c => c.classId).join(' and ')} ${out.length > 1 ? 'are' : 'is'} out for Games with ${name(out[0].teacherId)}.` : 'Nobody is on the field this period.'}</P>
        {out.map(c => <PersonRow key={c.classId} name={`Class ${c.classId}`} sub={`${c.presentIds.length} children · Football`} tone="slate" />)}
      </div>
    )
  }
  if (id === 'gate') {
    const late = d.buses.filter(b => b.delayMin >= 10)
    return (
      <div className="space-y-3">
        <P>The boom barriers lift on their own when a bus comes in or leaves. Parents use the drop-off loop beside the car park.</P>
        {late.map(b => <PersonRow key={b.id} name={`Bus ${b.id} · ${b.route}`} sub={`${b.delayMin} min late · ${b.driverName}`} tone="rust" />)}
        <button onClick={() => select('bus:21')} className="text-[13px] font-medium text-forest">See the bus bay →</button>
      </div>
    )
  }
  const copy: Record<string, string> = {
    junior: 'Grades 1–5 learn here — four bright classrooms and a playground with swings, a slide, a merry-go-round and a seesaw. The Junior Wing joins EduFlow next term; until then this view shows activity only.',
    arena: 'A 25-metre, eight-lane pool under a glass barrel roof. The swim squad trains before school; Grades 6–7 have swimming in PE on Tuesdays and Thursdays.',
    garden: 'The fountain garden sits between the tower and the auditorium. Children read here at break and lunch.',
    courts: 'Two full basketball courts. House league practice runs most mornings and after school.',
  }
  return <P>{copy[id] ?? ''}</P>
}
