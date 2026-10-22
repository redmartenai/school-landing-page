/* Bus: live tracking of the selected child's bus. Replays the morning trip along the real stops. */
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { BusFront, CircleCheck, Clock, MapPin, Phone, RotateCcw, Users } from 'lucide-react'
import { Avatar, Button, EmptyState, LiveDot, Pill, cx, ease, useToast } from '@/components/ui'
import { MSection, MobileScreen } from '@/components/shell/Mobile'
import { firstName } from '@/lib/format'
import type { Bus } from '@/data/types'
import { fromMin, toMin, useParentScope } from './data'
import { useChild } from './context'
import { ChildFade, ChildSwitcher, MCard, ToneIcon } from './bits'

/** Precompute the route geometry so we can place the bus by fraction of distance travelled. */
function useRoute(bus: Bus) {
  return useMemo(() => {
    const pts = bus.stops.map(s => ({ x: s.x, y: s.y }))
    const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y))
    const total = seg.reduce((a, b) => a + b, 0) || 1
    const cum = [0]
    for (const l of seg) cum.push(cum[cum.length - 1] + l / total)
    const at = (t: number) => {
      const v = Math.max(0, Math.min(1, t))
      let i = 0
      while (i < seg.length - 1 && cum[i + 1] < v) i++
      const f = seg[i] ? (v - cum[i]) / (cum[i + 1] - cum[i]) : 0
      return { x: pts[i].x + (pts[i + 1]?.x - pts[i].x || 0) * f, y: pts[i].y + (pts[i + 1]?.y - pts[i].y || 0) * f, i, f }
    }
    const clock = (t: number) => {
      const { i, f } = at(t)
      const a = toMin(bus.stops[i].at), b = toMin(bus.stops[Math.min(i + 1, bus.stops.length - 1)].at)
      return fromMin(a + (b - a) * f)
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
    return { pts, cum, at, clock, d }
  }, [bus])
}

export function BusScreen() {
  const child = useChild()
  const { d } = useParentScope()
  const bus = child.busId ? d.buses.find(b => b.id === child.busId) ?? null : null
  return (
    <MobileScreen title="Bus" eyebrow={bus ? `Bus ${bus.id} · ${bus.route}` : 'School transport'}>
      <ChildSwitcher />
      <ChildFade>
        {bus ? <BusTracker key={bus.id + child.id} bus={bus} childName={firstName(child.name)} />
          : <EmptyState icon={BusFront} title={`${firstName(child.name)} doesn't take the school bus`} body="If that has changed, the transport office can add a route." />}
      </ChildFade>
    </MobileScreen>
  )
}

function BusTracker({ bus, childName }: { bus: Bus; childName: string }) {
  const { children } = useParentScope()
  const toast = useToast()
  const route = useRoute(bus)
  const target = bus.status === 'arrived' ? 1 : bus.progress
  const progress = useMotionValue(0)
  const [run, setRun] = useState(0)
  const [p, setP] = useState(0)
  const last = bus.stops.length - 1

  useEffect(() => {
    progress.set(0)
    const c = animate(progress, target, { duration: 3 + 7 * target, ease: ease.calm })
    return c.stop
  }, [run, target, progress])

  // Only re-render when the bus passes a stop (or arrives), not every frame.
  useMotionValueEvent(progress, 'change', v => {
    const stage = Math.floor(v * 200) / 200
    if (stage !== p) setP(stage)
  })

  const x = useTransform(progress, v => route.at(v).x)
  const y = useTransform(progress, v => route.at(v).y)
  const clock = useTransform(progress, v => route.clock(v))

  const passed = route.cum.filter(c => c <= p + 0.001).length // stops reached
  const arrived = p >= 0.999 && bus.status === 'arrived'
  const nextIdx = Math.min(last, passed)
  const next = bus.stops[nextIdx]
  const boardingStops = Math.max(1, last)
  const onBoard = arrived ? 0 : Math.round((bus.studentIds.length * Math.min(passed, boardingStops)) / boardingStops)
  const mine = children.filter(c => c.busId === bus.id).map(c => firstName(c.name))
  const delayed = bus.status === 'delayed' || bus.delayMin >= 10
  const eta = fromMin(toMin(next.at) + bus.delayMin)

  return (
    <div>
      {/* Map */}
      <MCard className="mt-3 !p-0 overflow-hidden">
        <div className="relative bg-paper">
          <svg viewBox="-4 6 108 92" className="block h-auto w-full" role="img" aria-label={`Map of Bus ${bus.id} route`}>
            {/* faint street grid */}
            {[20, 40, 60, 80].map(v => <line key={`h${v}`} x1={-4} x2={104} y1={v} y2={v} stroke="#E2DCD1" strokeWidth={0.35} />)}
            {[15, 35, 55, 75, 95].map(v => <line key={`v${v}`} y1={6} y2={98} x1={v} x2={v} stroke="#E2DCD1" strokeWidth={0.35} />)}
            <path d="M-4,58 C20,50 40,88 104,70" fill="none" stroke="#DCD6CB" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} />
            {/* route */}
            <path d={route.d} fill="none" stroke="#B6AFA3" strokeWidth={1.1} strokeDasharray="1.6 1.6" strokeLinecap="round" strokeLinejoin="round" />
            <motion.path d={route.d} fill="none" stroke="#2E5D4E" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: progress }} />
            {/* stops */}
            {bus.stops.map((s, i) => {
              const reached = i < passed
              const school = i === last
              const anchor = s.x > 70 ? 'end' : s.x < 15 ? 'start' : 'middle'
              const below = i % 2 === 0
              return (
                <g key={s.name}>
                  <circle cx={s.x} cy={s.y} r={school ? 2.6 : 1.7} fill={reached ? '#2E5D4E' : '#FDFCF8'} stroke={reached ? '#2E5D4E' : '#8B8377'} strokeWidth={0.6} style={{ transition: 'fill .4s' }} />
                  <text x={s.x + (anchor === 'end' ? 2.5 : anchor === 'start' ? -1 : 0)} y={s.y + (below ? 5.2 : -3.4)} textAnchor={anchor}
                    fontSize={school ? 3.4 : 3} fontWeight={school ? 600 : 500} fill={reached ? '#241F1B' : '#8B8377'} style={{ fontFamily: 'var(--font-sans)' }}>
                    {s.name}
                  </text>
                </g>
              )
            })}
            {/* the bus */}
            <motion.g style={{ x, y }}>
              {!arrived && <motion.circle r={4.5} fill="#2E5D4E" initial={{ opacity: 0.35, scale: 1 }} animate={{ opacity: 0, scale: 2 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />}
              <circle r={3.6} fill={arrived ? '#2E5D4E' : '#B4763A'} stroke="#FDFCF8" strokeWidth={0.8} />
              <BusFront x={-2.1} y={-2.1} width={4.2} height={4.2} color="#FDFCF8" strokeWidth={2.4} />
            </motion.g>
          </svg>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ivory-2/95 px-2.5 py-1 text-[12px] font-medium text-charcoal shadow-1">
            {arrived ? <CircleCheck size={13} className="text-forest" /> : <LiveDot tone="copper" />}
            <motion.span className="tabular">{clock}</motion.span>
            <span className="text-stone">{bus.status === 'arrived' ? '· this morning' : '· live'}</span>
          </div>
        </div>
      </MCard>

      {/* Status */}
      <motion.div key={arrived ? 'arrived' : 'moving'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: ease.out }}>
        {arrived ? (
          <MCard tone="forest" className="mt-3">
            <div className="flex items-center gap-3">
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="grid h-11 w-11 place-items-center rounded-full bg-forest text-ivory"><CircleCheck size={22} /></motion.span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[20px] leading-tight text-ink">Reached school {bus.stops[last].at}</div>
                <div className="text-[13.5px] text-charcoal-2">{mine.join(' and ')} {mine.length > 1 ? 'are' : 'is'} on campus{bus.delayMin ? `, ${bus.delayMin} min later than usual` : ', right on time'}.</div>
              </div>
            </div>
          </MCard>
        ) : (
          <MCard className="mt-3">
            <div className="flex items-center gap-3">
              <ToneIcon icon={MapPin} tone={delayed ? 'copper' : 'forest'} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-stone">Next stop</div>
                <div className="truncate font-display text-[19px] leading-tight text-ink">{next.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-stone">ETA</div>
                <div className="font-display text-[22px] tabular leading-none text-ink">{eta}</div>
              </div>
            </div>
            {delayed && <div className="mt-2.5 rounded-[10px] bg-copper-p px-3 py-2 text-[13px] text-copper-d">Running {bus.delayMin} min late. {childName} will be marked late, not absent.</div>}
          </MCard>
        )}
      </motion.div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <MCard className="!p-3.5">
          <div className="flex items-center gap-1.5 text-[12.5px] text-stone"><Users size={14} /> {arrived ? 'Dropped at school' : 'On board'}</div>
          <div className="mt-1 font-display text-[24px] tabular leading-none text-ink">{arrived ? bus.studentIds.length : onBoard}<span className="text-[14px] text-stone"> / {bus.capacity}</span></div>
        </MCard>
        <MCard className="!p-3.5">
          <div className="flex items-center gap-1.5 text-[12.5px] text-stone"><Clock size={14} /> Stops</div>
          <div className="mt-1 font-display text-[24px] tabular leading-none text-ink">{Math.min(passed, bus.stops.length)}<span className="text-[14px] text-stone"> / {bus.stops.length}</span></div>
        </MCard>
      </div>

      <MSection title="Driver">
        <MCard>
          <div className="flex items-center gap-3">
            <Avatar name={bus.driverName} size={44} />
            <div className="min-w-0 flex-1">
              <div className="text-[15.5px] font-medium text-ink">{bus.driverName}</div>
              <div className="text-[12.5px] tabular text-stone">{bus.vehicleNo} · {bus.driverPhone}</div>
            </div>
            <motion.a whileTap={{ scale: 0.92 }} href={`tel:${bus.driverPhone.replace(/\s+/g, '')}`} aria-label={`Call ${bus.driverName}`}
              onClick={() => toast(`Calling ${firstName(bus.driverName)}…`, 'slate')}
              className="grid h-11 w-11 place-items-center rounded-full bg-forest text-ivory shadow-[0_8px_18px_-10px_rgba(46,93,78,.7)]">
              <Phone size={18} />
            </motion.a>
          </div>
        </MCard>
      </MSection>

      <MSection title="Route" action={<Pill tone={arrived ? 'forest' : delayed ? 'copper' : 'amber'} dot>{arrived ? 'Arrived' : delayed ? `${bus.delayMin} min late` : 'On the way'}</Pill>}>
        <div className="rounded-[16px] border border-line bg-ivory-2 px-4 py-2">
          {bus.stops.map((s, i) => {
            const reached = i < passed
            return (
              <div key={s.name} className="relative flex items-center gap-3 py-2">
                {i < last && <span className={cx('absolute left-[5px] top-[22px] h-[calc(100%-8px)] w-0.5 transition-colors duration-500', i + 1 < passed ? 'bg-forest-l' : 'bg-line')} />}
                <span className={cx('relative h-3 w-3 shrink-0 rounded-full border-2 transition-colors duration-500', reached ? 'border-forest bg-forest' : 'border-stone-l bg-ivory-2')} />
                <span className={cx('flex-1 text-[14px]', reached ? 'text-ink' : 'text-stone', i === last && 'font-medium')}>{s.name}</span>
                <span className="text-[12.5px] tabular text-stone">{s.at}</span>
              </div>
            )
          })}
        </div>
      </MSection>

      {bus.status === 'arrived' && (
        <Button className="mt-4" variant="outline" block icon={RotateCcw} onClick={() => setRun(r => r + 1)}>Replay this morning's trip</Button>
      )}
    </div>
  )
}
