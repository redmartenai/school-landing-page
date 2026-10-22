import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Bus as BusIcon, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, EmptyState, Page, PageHeader, Pill, Progress, cx, ease, spring, type Tone } from '@/components/ui'
import { useData } from '@/store/hooks'
import type { Bus, BusStop } from '@/data/types'
import { HEX } from './shared'

const STATUS: Record<Bus['status'], { label: string; tone: Tone; hex: string }> = {
  'on-route': { label: 'On route', tone: 'amber', hex: HEX.amber },
  arrived: { label: 'Arrived', tone: 'forest', hex: HEX.forestL },
  delayed: { label: 'Delayed', tone: 'rust', hex: HEX.rust },
  'not-started': { label: 'Not started', tone: 'stone', hex: HEX.stoneL },
}

/** Point at fraction t (0..1) along a polyline of stops, by distance. */
function pointAt(stops: BusStop[], t: number) {
  const seg = stops.slice(1).map((s, i) => Math.hypot(s.x - stops[i].x, s.y - stops[i].y))
  const total = seg.reduce((a, b) => a + b, 0)
  let rem = Math.max(0, Math.min(1, t)) * total
  for (let i = 0; i < seg.length; i++) {
    if (rem <= seg[i]) {
      const k = seg[i] ? rem / seg[i] : 0
      return { x: stops[i].x + (stops[i + 1].x - stops[i].x) * k, y: stops[i].y + (stops[i + 1].y - stops[i].y) * k, seg: i }
    }
    rem -= seg[i]
  }
  const last = stops[stops.length - 1]
  return { x: last.x, y: last.y, seg: seg.length - 1 }
}

const addMin = (hm: string, m: number) => {
  const [h, mm] = hm.split(':').map(Number)
  const t = h * 60 + mm + m
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function TransportPage() {
  const d = useData()
  const [sel, setSel] = useState<string | null>(() => d.buses.find(b => b.status === 'delayed')?.id ?? null)
  const delayed = d.buses.filter(b => b.status === 'delayed')
  const riders = d.buses.reduce((a, b) => a + b.studentIds.length, 0)

  return (
    <Page>
      <PageHeader eyebrow="Transport · live"
        title={delayed.length ? delayed.map(b => `Bus ${b.id} is ${b.delayMin} minutes late`).join(' · ') : 'Every bus is on time'}
        subtitle={`${d.buses.filter(b => b.status === 'arrived').length} of ${d.buses.length} buses are on campus, carrying ${riders} children. Parents on delayed routes are notified automatically.`} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card padded={false} className="min-w-0 overflow-hidden">
          <div className="relative aspect-[4/3] w-full bg-paper/60 sm:aspect-[16/10]">
            <RouteMap buses={d.buses} selected={sel} onSelect={setSel} />
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[11.5px]">
              {(['arrived', 'delayed'] as const).map(s => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-ivory-2/90 px-2 py-0.5 text-stone shadow-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS[s].hex }} />{STATUS[s].label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card padded={false} className="h-fit p-4 md:p-5">
          <CardHeader eyebrow="Fleet" title="Morning routes" />
          {d.buses.length === 0 ? <EmptyState icon={BusIcon} title="No buses configured" /> : (
            <div className="space-y-1.5">
              {[...d.buses].sort((a, b) => b.delayMin - a.delayMin).map(b => {
                const st = STATUS[b.status]
                const p = pointAt(b.stops, b.progress)
                const next = b.progress < 1 ? b.stops[Math.min(b.stops.length - 1, p.seg + 1)] : null
                const eta = addMin(b.stops[b.stops.length - 1].at, b.delayMin)
                return (
                  <button key={b.id} onClick={() => setSel(s => (s === b.id ? null : b.id))} className="relative block w-full rounded-[12px] p-3 text-left">
                    {sel === b.id && <motion.span layoutId="bus-sel" transition={spring} className={cx('absolute inset-0 rounded-[12px] border', b.status === 'delayed' ? 'border-rust/30 bg-rust-p/60' : 'border-line bg-paper/70')} />}
                    <div className="relative flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] font-display text-[16px] text-ivory" style={{ background: st.hex }}>{b.id}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-ink">{b.route}</span>
                        </div>
                        <div className="truncate text-[12px] text-stone">{b.driverName} · {b.studentIds.length}/{b.capacity} children · {b.vehicleNo}</div>
                      </div>
                      <Pill tone={st.tone} dot>{b.delayMin && b.status !== 'arrived' ? `+${b.delayMin} min` : st.label}</Pill>
                    </div>
                    {sel === b.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3, ease: ease.out }} className="relative overflow-hidden">
                        <div className="pt-3">
                          <Progress value={b.progress} tone={st.tone} />
                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[12.5px]">
                            <span className="text-charcoal-2">{next ? <>Next stop <b className="font-medium text-ink">{next.name}</b></> : `Reached at ${eta}`}</span>
                            {next && <span className={cx(b.delayMin ? 'text-rust' : 'text-stone')}>ETA school {eta}</span>}
                          </div>
                          <a href={`tel:${b.driverPhone.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-forest hover:underline">
                            <Phone size={12} /> Call {b.driverName.split(' ')[0]} · {b.driverPhone}
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </Page>
  )
}

function RouteMap({ buses, selected, onSelect }: { buses: Bus[]; selected: string | null; onSelect: (id: string) => void }) {
  const school = buses[0]?.stops[buses[0].stops.length - 1]
  const arrived = buses.filter(b => b.status === 'arrived').length
  return (
    <svg viewBox="-4 -4 108 108" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label="Bus routes map">
      {/* faint grid like a paper map */}
      {Array.from({ length: 11 }, (_, i) => i * 10).map(v => (
        <g key={v}><line x1={v} x2={v} y1={0} y2={100} stroke={HEX.line2} strokeWidth={0.2} /><line y1={v} y2={v} x1={0} x2={100} stroke={HEX.line2} strokeWidth={0.2} /></g>
      ))}
      {buses.map(b => {
        const dim = selected && selected !== b.id
        const pts = b.stops.map(s => `${s.x},${s.y}`).join(' ')
        return (
          <g key={b.id} opacity={dim ? 0.28 : 1} style={{ transition: 'opacity .3s' }} onClick={() => onSelect(b.id)} className="cursor-pointer">
            <polyline points={pts} fill="none" stroke={HEX.ivory2} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
            <motion.polyline points={pts} fill="none" stroke={b.status === 'delayed' ? HEX.rust : HEX.stoneL} strokeWidth={b.status === 'delayed' ? 1.1 : 0.8}
              strokeDasharray={b.status === 'delayed' ? undefined : '1.6 1.2'} strokeLinejoin="round" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: ease.out }} />
            {b.stops.slice(0, -1).map(s => (
              <g key={s.name}>
                <circle cx={s.x} cy={s.y} r={1.1} fill={HEX.ivory2} stroke={b.status === 'delayed' ? HEX.rust : HEX.stone} strokeWidth={0.45} />
                {(selected === b.id) && <text x={s.x + 1.8} y={s.y + 0.9} fontSize={2.5} fill={HEX.ink}>{s.name} · {s.at}</text>}
              </g>
            ))}
            {b.status !== 'arrived' && <BusMarker bus={b} />}
          </g>
        )
      })}
      {school && (
        <g>
          <circle cx={school.x} cy={school.y} r={4.2} fill={HEX.forest} />
          <circle cx={school.x} cy={school.y} r={1.6} fill={HEX.ivory2} />
          <text x={school.x} y={school.y - 6} fontSize={2.8} textAnchor="middle" fill={HEX.forest} fontWeight={600}>Greenfield School</text>
          <text x={school.x} y={school.y + 8} fontSize={2.4} textAnchor="middle" fill={HEX.stone}>{arrived} bus{arrived === 1 ? '' : 'es'} parked</text>
        </g>
      )}
    </svg>
  )
}

function BusMarker({ bus }: { bus: Bus }) {
  const t = useMotionValue(0)
  useEffect(() => {
    const c = animate(t, bus.progress, { duration: 2.2, ease: ease.calm })
    return c.stop
  }, [bus.progress, t])
  const stops = bus.stops
  const x = useTransform(t, v => pointAt(stops, v).x)
  const y = useTransform(t, v => pointAt(stops, v).y)
  const color = STATUS[bus.status].hex
  const delayed = bus.status === 'delayed'
  const label = useMemo(() => `${bus.id}${bus.delayMin ? ` · +${bus.delayMin}m` : ''}`, [bus.id, bus.delayMin])
  return (
    <motion.g style={{ x, y }}>
      {delayed && <motion.circle r={3} fill="none" stroke={color} strokeWidth={0.5} animate={{ r: [3, 7], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />}
      <circle r={3} fill={color} stroke={HEX.ivory2} strokeWidth={0.7} />
      <text y={1} fontSize={2.6} textAnchor="middle" fill={HEX.ivory2} fontWeight={700}>{bus.id}</text>
      <g transform="translate(4,-4)">
        <rect x={0} y={-2.6} width={(label.length + 4) * 1.4 + 2} height={3.8} rx={1} fill={HEX.ivory2} stroke={color} strokeWidth={0.3} />
        <text x={1} y={0.2} fontSize={2.3} fill={delayed ? HEX.rust : HEX.ink} fontWeight={600}>Bus {label}</text>
      </g>
    </motion.g>
  )
}
