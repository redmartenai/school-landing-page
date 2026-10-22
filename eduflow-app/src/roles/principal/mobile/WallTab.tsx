import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { BellRing, Bus as BusIcon, Check, Phone, UserX } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, Button, LiveDot, Pill, Progress, Sheet, softSpring, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import type { SchoolState } from '@/store/school'
import type { Bus } from '@/data/types'
import { attendanceRate, attendanceSeries, RULES } from '@/engine/monitoring'
import { time } from '@/lib/format'
import { TILE_ORDER, classTiles, firstNameWithTitle, type ClassTile, type TileState } from './lib'

const TILE_BG: Record<TileState, { bg: string; border: string }> = {
  marked: { bg: '#E4EDE9', border: '#C9DCD3' },
  awaiting: { bg: '#FBF0D9', border: '#EFD7A3' },
  needs: { bg: '#F7EDE0', border: '#DDB58A' },
}

export function WallTab() {
  const d = useData()
  const now = useNow()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busId, setBusId] = useState<string | null>(null)
  const tiles = useMemo(
    () => classTiles(d, now).sort((a, b) => TILE_ORDER[a.state] - TILE_ORDER[b.state] || d.classes.indexOf(a.cls) - d.classes.indexOf(b.cls)),
    [d, now],
  )
  const marked = tiles.filter(t => t.state === 'marked').length
  const needs = tiles.filter(t => t.state === 'needs').length
  const open = tiles.find(t => t.cls.id === openId) ?? null
  const bus = d.buses.find(b => b.id === busId) ?? null

  return (
    <MobileScreen eyebrow={<span className="inline-flex items-center gap-2"><LiveDot /> Live · {time(now)}</span>} title="The wall">
      <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="px-1 text-[14.5px] text-charcoal-2">
        {marked} of {tiles.length} registers in.{' '}
        {needs > 0
          ? <span className="font-medium text-copper-d">{needs === 1 ? 'One classroom needs' : `${needs} classrooms need`} you.</span>
          : marked === tiles.length ? <span className="font-medium text-forest">Every child is accounted for.</span> : 'The rest are on their way.'}
      </motion.p>

      <LayoutGroup>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {tiles.map(t => <Tile key={t.cls.id} tile={t} onOpen={() => setOpenId(t.cls.id)} />)}
        </div>
      </LayoutGroup>

      <div className="mt-3 flex items-center gap-3 px-1 text-[11.5px] text-stone">
        <Legend color="bg-forest-l" label="Marked" />
        <Legend color="bg-amber" label="Awaiting" />
        <Legend color="bg-copper" label={`Needs you after ${RULES.registerBy}`} />
      </div>

      <MSection title="Buses" className="!mt-6">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[...d.buses].sort((a, b) => b.delayMin - a.delayMin).map(b => <BusChip key={b.id} bus={b} onOpen={() => setBusId(b.id)} />)}
        </div>
      </MSection>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? `Class ${open.cls.id} · Room ${open.cls.room}` : ''}>
        {open && <ClassDetail d={d} tile={open} />}
      </Sheet>
      <Sheet open={!!bus} onClose={() => setBusId(null)} title={bus ? `Bus ${bus.id} · ${bus.route}` : ''}>
        {bus && <BusDetail bus={bus} />}
      </Sheet>
    </MobileScreen>
  )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5"><span className={clsx('h-2 w-2 rounded-full', color)} />{label}</span>
)

function Tile({ tile: t, onOpen }: { tile: ClassTile; onOpen: () => void }) {
  const teacher = t.teacher ? firstNameWithTitle(t.teacher) : 'Class teacher'
  return (
    <motion.button layout transition={softSpring} onClick={onOpen} whileTap={{ scale: 0.96 }}
      initial={false} animate={{ backgroundColor: TILE_BG[t.state].bg, borderColor: TILE_BG[t.state].border }}
      className="relative flex h-[108px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 text-left"
      aria-label={`Class ${t.cls.id}, ${t.state === 'marked' ? 'register marked' : 'register not taken'}`}>
      <div className="flex items-start justify-between">
        <span className="font-display text-[26px] leading-none text-ink">{t.cls.id}</span>
        <StateMark state={t.state} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={t.state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {t.state === 'marked' ? (
            <>
              <div className="font-display tabular text-[19px] leading-none text-forest-d">{t.present}<span className="text-[14px] text-forest/70">/{t.total}</span></div>
              <div className="mt-1 truncate text-[12px] text-forest">in · {t.markedAt ? time(t.markedAt) : ''}{t.teacherAway && t.markedBy ? ` · by ${firstNameWithTitle(t.markedBy)}` : ''}</div>
            </>
          ) : t.state === 'needs' ? (
            <>
              <div className="text-[13.5px] font-semibold text-copper-d">Needs you</div>
              <div className="truncate text-[12px] text-copper-d/85">{t.teacherAway ? `${teacher} ${t.teacherAway === 'leave' ? 'on leave' : 'absent'}` : `Not taken · ${teacher}`}</div>
            </>
          ) : (
            <>
              <div className="text-[13.5px] font-semibold text-[#8a5f14]">Awaiting</div>
              <div className="truncate text-[12px] text-[#8a5f14]/85">{teacher}</div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}

function StateMark({ state }: { state: TileState }) {
  if (state === 'marked') {
    return (
      <motion.span key="ok" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={softSpring}
        className="grid h-6 w-6 place-items-center rounded-full bg-forest text-ivory"><Check size={13} strokeWidth={3} /></motion.span>
    )
  }
  if (state === 'awaiting') {
    // a gentle breath: this classroom is waiting, not wrong
    return <motion.span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
  }
  return <span className="mt-1 h-2.5 w-2.5 rounded-full bg-copper ring-4 ring-copper/15" />
}

function ClassDetail({ d, tile: t }: { d: SchoolState; tile: ClassTile }) {
  const toast = useToast()
  const [reminded, setReminded] = useState(false)
  const absent = t.absentIds.map(id => d.students.find(s => s.id === id)).filter(s => !!s)
  const late = t.lateIds.map(id => d.students.find(s => s.id === id)).filter(s => !!s)
  const teacher = t.teacher
  const teacherStatus = t.teacherAway === 'absent' ? 'Absent today · no check-in' : t.teacherAway === 'leave' ? 'On approved leave today' : t.teacherCheckIn ? `Checked in at ${t.teacherCheckIn}` : 'Not checked in yet'

  const remind = () => {
    if (!teacher) return
    d.nudge(teacher.id, `Please take the ${t.cls.id} register`, `It was due at ${RULES.registerBy}. ${t.total} families are waiting to hear their child is safe. — Dr. Iyer`, DEMO.principalId)
    setReminded(true)
    toast(`Reminded ${firstNameWithTitle(teacher)}`)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {t.state === 'marked'
          ? <Pill tone="forest" icon={Check}>Marked at {t.markedAt ? time(t.markedAt) : ''}{t.markedBy && t.markedBy.id !== teacher?.id ? ` by ${firstNameWithTitle(t.markedBy)}` : ''}</Pill>
          : <Pill tone={t.state === 'needs' ? 'copper' : 'amber'} dot>Register not taken</Pill>}
        <Pill tone="stone">{t.total} children</Pill>
      </div>

      {teacher && (
        <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-ivory p-3">
          <Avatar name={teacher.name} size={42} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium text-ink">{teacher.name}</div>
            <div className={clsx('truncate text-[12.5px]', t.teacherAway ? 'text-rust' : 'text-stone')}>Class teacher · {teacherStatus}</div>
          </div>
          <a href={`tel:${teacher.phone.replace(/\s/g, '')}`} aria-label={`Call ${teacher.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-ivory"><Phone size={17} /></a>
        </div>
      )}

      {t.state === 'marked' ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Count n={t.present - t.lateIds.length} label="Present" className="text-forest" />
            <Count n={t.lateIds.length} label="Late" className="text-[#8a5f14]" />
            <Count n={t.absentIds.length} label="Absent" className="text-rust" />
          </div>
          <div className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Absent today</div>
          {absent.length ? (
            <MList className="mt-2">
              {absent.map(s => {
                const rate = attendanceRate(attendanceSeries(d, s))
                return <MRow key={s.id} icon={<UserX size={16} className="shrink-0 text-rust" />} title={s.name} sub={`Roll ${s.rollNo} · ${Math.round(rate * 100)}% this term`}
                  right={rate < RULES.attendanceRisk ? <Pill tone="rust">At risk</Pill> : undefined} />
              })}
            </MList>
          ) : <p className="mt-2 text-[14px] text-forest">Everyone is in today.</p>}
          {late.length > 0 && <p className="mt-3 text-[13px] text-stone">Late: {late.map(s => s.name).join(', ')}</p>}
        </>
      ) : (
        <>
          <p className="mt-4 text-[14.5px] leading-relaxed text-charcoal-2">
            {t.total} families haven't been told their child reached class.
            {t.teacherAway ? ` ${teacher ? firstNameWithTitle(teacher) : 'The class teacher'} is away — someone needs to cover this room.` : ''}
          </p>
          {teacher && !t.teacherAway && (
            <Button block size="lg" className="mt-4" variant={reminded ? 'soft' : 'primary'} icon={reminded ? Check : BellRing} disabled={reminded} onClick={remind}>
              {reminded ? `Reminded ${firstNameWithTitle(teacher)}` : `Remind ${firstNameWithTitle(teacher)}`}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

const Count = ({ n, label, className }: { n: number; label: string; className?: string }) => (
  <div className="rounded-[12px] bg-paper/70 py-2.5">
    <div className={clsx('font-display tabular text-[24px] leading-none', className)}>{n}</div>
    <div className="mt-1 text-[11.5px] text-stone">{label}</div>
  </div>
)

function BusChip({ bus, onOpen }: { bus: Bus; onOpen: () => void }) {
  const late = bus.status === 'delayed'
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onOpen}
      className={clsx('flex w-[136px] shrink-0 flex-col rounded-[14px] border px-3 py-2.5 text-left', late ? 'border-rust/25 bg-rust-p' : 'border-line bg-ivory-2')}>
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-stone"><BusIcon size={13} /> Bus {bus.id}</span>
      <span className={clsx('mt-1 font-display text-[17px] leading-tight', late ? 'text-rust' : 'text-forest')}>
        {late ? `+${bus.delayMin} min` : bus.status === 'arrived' ? 'Arrived' : 'On route'}
      </span>
      <span className="mt-0.5 truncate text-[11.5px] text-stone">{bus.route}</span>
    </motion.button>
  )
}

function BusDetail({ bus }: { bus: Bus }) {
  const late = bus.status === 'delayed'
  const next = bus.stops.find((_, i) => i / (bus.stops.length - 1) > bus.progress)
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={late ? 'rust' : 'forest'} dot>{late ? `${bus.delayMin} min late` : 'Arrived'}</Pill>
        <Pill tone="stone">{bus.studentIds.length} children on board</Pill>
      </div>
      <Progress className="mt-4" value={bus.progress} tone={late ? 'rust' : 'forest'} />
      <p className="mt-2 text-[13.5px] text-charcoal-2">
        {late ? `Next stop ${next?.name ?? 'Greenfield School'}. Parents were told automatically; these children will be marked late, not absent.` : 'Every child on this route reached school.'}
      </p>
      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-ivory p-3">
        <Avatar name={bus.driverName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-ink">{bus.driverName}</div>
          <div className="text-[12.5px] text-stone">Driver · {bus.vehicleNo}</div>
        </div>
        <a href={`tel:${bus.driverPhone.replace(/\s/g, '')}`} aria-label={`Call ${bus.driverName}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-ivory"><Phone size={17} /></a>
      </div>
    </div>
  )
}
