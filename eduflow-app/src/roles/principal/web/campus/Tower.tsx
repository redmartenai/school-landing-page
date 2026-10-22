import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { toMin } from '@/engine/campus'
import { Box, BoxInstances, Glow, glassMat, mat } from './parts'
import { Figures, rnd, type Figure } from './Figures'
import { Room } from './Room'
import { C, CORE, EDGE, FLOOR_NAMES, H, HOUSE_COLOR, LEVELS, LIFT_GAP, ROOMS, ROOM_BACK, ROOM_FRONT, ROOM_W, SKIN, SLAB, W, roomX } from './layout'
import { useCampus, useCampusUi } from './ui'

const DEPTH_ALL = EDGE - ROOM_BACK

/** How busy the corridors are: packed at changeover, a trickle mid-lesson. */
function corridorLoad(minute: number) {
  if (minute < 7 * 60 + 50 || minute > 14 * 60 + 20) return 0
  const bells = ['08:00', '08:45', '09:30', '10:15', '10:30', '11:15', '12:00', '12:40', '13:25', '14:10'].map(toMin)
  const near = Math.min(...bells.map(b => Math.abs(minute - b)))
  if (near <= 2) return 7
  if (minute >= 10 * 60 + 15 && minute < 10 * 60 + 30) return 4
  if (minute >= 12 * 60 && minute < 12 * 60 + 40) return 4
  return 1
}

function CorridorWalkers({ level }: { level: number }) {
  const minute = useCampusUi(s => s.minute)
  const n = corridorLoad(minute)
  const items = useMemo<Figure[]>(() => Array.from({ length: n }, (_, i) => {
    const seed = level * 31 + i * 7
    const teacher = n === 1 || i === 0
    return { x: 0, y: 0.02, z: ROOM_FRONT + 0.7 + rnd(seed) * (EDGE - ROOM_FRONT - 1.4), body: teacher ? '#2F2A25' : Object.values(HOUSE_COLOR)[seed % 4], skin: SKIN[seed % 5], scale: teacher ? 1.05 : 0.95 }
  }), [n, level])
  const move = (i: number, t: number, f: Figure): [number, number, number, number] => {
    const seed = level * 31 + i * 7
    const speed = 0.06 + rnd(seed + 1) * 0.05
    const ph = (t * speed + rnd(seed + 2)) % 2
    const k = ph < 1 ? ph : 2 - ph // ping-pong along the corridor
    const x = -W / 2 + 1.2 + k * (W - 2.4)
    return [x, f.y + Math.abs(Math.sin(t * 7 + seed)) * 0.05, f.z, ph < 1 ? Math.PI / 2 : -Math.PI / 2]
  }
  return n ? <Figures items={items} move={move} /> : null
}

function Floor({ level }: { level: number }) {
  const ref = useRef<THREE.Group>(null)
  const focus = useCampusUi(s => s.focusFloor)
  const campus = useCampus()
  const rooms = ROOMS.filter(r => r.level === level)
  const target = level * H + (focus !== null && level > focus ? LIFT_GAP : 0)
  useFrame((_, dt) => { if (ref.current) easing.damp(ref.current.position, 'y', target, 0.45, dt) })

  const concrete = mat(C.concrete, { rough: 0.85 })
  const wall = mat(C.ivory2, { rough: 0.9 })
  const fins = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = []
    // timber fins on the two tower ends and over the core — they frame the glass without hiding the rooms
    for (const x of [-11.7, -11.1, 11.1, 11.7, -1.9, -1.3, 1.3, 1.9]) out.push({ p: [x, H / 2, EDGE + 0.32], s: [0.14, H, 0.55] })
    return out
  }, [])

  return (
    <group ref={ref} position={[0, level * H, 0]}>
      {/* slab with a crisp ivory edge band */}
      <Box p={[0, -SLAB / 2, (ROOM_BACK + EDGE) / 2 + 0.1]} s={[W + 0.6, SLAB, DEPTH_ALL + 0.4]} m={concrete} />
      <Box p={[0, -SLAB / 2, EDGE + 0.32]} s={[W + 0.8, SLAB + 0.04, 0.1]} m={mat(C.ivory2, { rough: 0.5 })} />
      {/* back wall + ends */}
      <Box p={[0, H / 2 - SLAB / 2, ROOM_BACK - 0.14]} s={[W + 0.6, H - SLAB, 0.28]} m={wall} />
      {[-1, 1].map(side => (
        <group key={side}>
          <Box p={[side * (W / 2 + 0.16), H / 2 - SLAB / 2, (ROOM_BACK + ROOM_FRONT) / 2]} s={[0.32, H - SLAB, ROOM_FRONT - ROOM_BACK]} m={mat(C.concreteDark, { rough: 0.9 })} />
          {/* narrow slot window on the ends */}
          <Box p={[side * (W / 2 + 0.33), 1.8, -1.6]} s={[0.04, 1.4, 1.6]} m={mat('#5B6B72', { rough: 0.12, metal: 0.55 })} cast={false} />
          {/* core partition */}
          <Box p={[side * CORE, H / 2 - SLAB / 2, (ROOM_BACK + ROOM_FRONT) / 2]} s={[0.2, H - SLAB, ROOM_FRONT - ROOM_BACK]} m={wall} />
          {/* classroom glass front with slim oak mullions */}
          <mesh position={[side * (CORE + ROOM_W / 2), H / 2 - SLAB / 2, ROOM_FRONT]} material={glassMat}><boxGeometry args={[ROOM_W, H - SLAB, 0.04]} /></mesh>
          {[0.25, 0.5, 0.75].map(k => <Box key={k} p={[side * (CORE + ROOM_W * k), H / 2 - SLAB / 2, ROOM_FRONT]} s={[0.06, H - SLAB, 0.08]} m={mat(C.oakDark, { rough: 0.6 })} />)}
          <Box p={[side * (CORE + ROOM_W / 2), 0.05, ROOM_FRONT]} s={[ROOM_W, 0.1, 0.12]} m={mat(C.oakDark)} />
        </group>
      ))}
      {/* core: copper-clad stair block, glass lift shaft at the front */}
      <Box p={[0, H / 2 - SLAB / 2, (ROOM_BACK + 0.2) / 2 - 0.1]} s={[CORE * 2 - 0.2, H - SLAB, 0.2 - ROOM_BACK - 0.2]} m={mat(C.copper, { rough: 0.45, metal: 0.35 })} />
      <mesh position={[0, H / 2 - SLAB / 2, 1.2]} material={glassMat}><boxGeometry args={[2.4, H - SLAB, 2]} /></mesh>
      {/* corridor balustrade: glass + copper rail */}
      <mesh position={[0, 0.55, EDGE]} material={glassMat}><boxGeometry args={[W, 1.1, 0.03]} /></mesh>
      <Box p={[0, 1.1, EDGE]} s={[W, 0.06, 0.1]} m={mat(C.copper, { rough: 0.35, metal: 0.5 })} />
      <BoxInstances items={fins} m={mat(C.oakDark, { rough: 0.65 })} />
      {/* soffit lights along the corridor */}
      <Glow p={[0, H - SLAB - 0.04, (ROOM_FRONT + EDGE) / 2]} s={[W - 2, 0.03, 0.12]} color="#FFE7C2" intensity={1.4} />

      {rooms.map(r => (
        <group key={r.id} position={[roomX(r.side), 0, 0]}>
          <Room def={r} now={r.kind === 'class' ? campus.find(c => c.classId === r.id) : undefined} />
        </group>
      ))}
      <CorridorWalkers level={level} />

      {/* level number on the core, like the painted numbers in a real stairwell */}
      <Html position={[0, H - 1.2, EDGE + 0.62]} center distanceFactor={30} zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: focus === null || focus === level ? 'block' : 'none' }}>
        <div className="campus-level">{level === 0 ? 'G' : level}</div>
      </Html>
      <Html position={[-W / 2 - 0.9, 1.4, EDGE]} center distanceFactor={34} zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: focus === null || focus === level ? 'block' : 'none' }}>
        <div className="campus-floorname">{FLOOR_NAMES[level]}</div>
      </Html>
    </group>
  )
}

function Lift() {
  const ref = useRef<THREE.Group>(null)
  const focus = useCampusUi(s => s.focusFloor)
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    // ride up and down, pausing at each floor
    const cycle = (clock.elapsedTime * 0.12) % (2 * (LEVELS - 1))
    const pos = cycle < LEVELS - 1 ? cycle : 2 * (LEVELS - 1) - cycle
    const fl = Math.floor(pos), frac = pos - fl
    const eased = frac < 0.55 ? 0 : (frac - 0.55) / 0.45
    const s = eased * eased * (3 - 2 * eased)
    easing.damp(ref.current.position, 'y', (fl + s) * H, 0.1, dt)
    ref.current.visible = focus === null
  })
  return (
    <group ref={ref}>
      <Box p={[0, 1.25, 1.2]} s={[2.1, 2.4, 1.7]} m={mat('#F3EBDD', { rough: 0.3, metal: 0.1, opacity: 0.55 })} />
      <Glow p={[0, 2.42, 1.2]} s={[1.6, 0.04, 1.2]} color="#FFE7C2" intensity={2} />
      <Figures items={[{ x: -0.4, y: 0.06, z: 1.2, body: HOUSE_COLOR.Cedar, skin: SKIN[0], scale: 0.95 }, { x: 0.45, y: 0.06, z: 1.0, body: '#2F2A25', skin: SKIN[3], scale: 1.05 }]} />
    </group>
  )
}

function Roof() {
  const ref = useRef<THREE.Group>(null)
  const focus = useCampusUi(s => s.focusFloor)
  useFrame((_, dt) => { if (ref.current) easing.damp(ref.current.position, 'y', LEVELS * H + (focus !== null ? LIFT_GAP : 0), 0.45, dt) })
  const panels = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ p: [4.5 + (i % 4) * 1.75, 0.55, -4.3 + Math.floor(i / 4) * 1.5] as [number, number, number], s: [1.6, 0.06, 1.1] as [number, number, number] })), [])
  const planters = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: -10 + i * 1.6, z: -3 + rnd(i) * 5 })), [])
  return (
    <group ref={ref} position={[0, LEVELS * H, 0]}>
      <Box p={[0, -SLAB / 2, (ROOM_BACK + EDGE) / 2 + 0.1]} s={[W + 0.6, SLAB, DEPTH_ALL + 0.4]} m={mat(C.concrete, { rough: 0.85 })} />
      {/* parapet */}
      <Box p={[0, 0.5, EDGE + 0.3]} s={[W + 0.6, 1, 0.2]} m={mat(C.ivory2)} />
      <Box p={[0, 0.5, ROOM_BACK - 0.1]} s={[W + 0.6, 1, 0.2]} m={mat(C.ivory2)} />
      {[-1, 1].map(s => <Box key={s} p={[s * (W / 2 + 0.2), 0.5, (ROOM_BACK + EDGE) / 2 + 0.1]} s={[0.2, 1, DEPTH_ALL + 0.4]} m={mat(C.ivory2)} />)}
      {/* roof garden */}
      <Box p={[-6.2, 0.18, -0.2]} s={[10.5, 0.36, 9]} m={mat(C.lawn, { rough: 1 })} />
      {planters.map((pl, i) => (
        <group key={i} position={[pl.x, 0.36, pl.z]}>
          <mesh position={[0, 0.4, 0]} castShadow material={mat('#5F7E5A', { rough: 0.9 })}><icosahedronGeometry args={[0.55 + rnd(i + 3) * 0.3, 1]} /></mesh>
          <mesh position={[0, 0.12, 0]} castShadow material={mat(C.oakDark)}><cylinderGeometry args={[0.08, 0.1, 0.3, 8]} /></mesh>
        </group>
      ))}
      <group rotation={[0, 0, 0]}>
        <BoxInstances items={panels} m={mat('#33414D', { rough: 0.25, metal: 0.6 })} />
      </group>
      {/* the copper crown over the core carries the school's name */}
      <Box p={[0, 2.2, 1.6]} s={[CORE * 2, 4.4, 4]} m={mat(C.copper, { rough: 0.4, metal: 0.45 })} />
      <Html position={[0, 2.4, 3.65]} transform distanceFactor={9} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="campus-sign">Greenfield<br /><span>School · est. 1998</span></div>
      </Html>
    </group>
  )
}

/** Entrance canopy and steps at the foot of the tower. */
function Entrance() {
  return (
    <group position={[0, 0, EDGE + 2.4]}>
      <Box p={[0, 3.3, 0]} s={[8, 0.25, 4.2]} m={mat(C.ivory2, { rough: 0.5 })} />
      <Glow p={[0, 3.16, 0]} s={[7, 0.03, 3.4]} color="#FFE3BA" intensity={1.2} />
      {[-3.6, 3.6].map(x => <Box key={x} p={[x, 1.6, 1.8]} s={[0.25, 3.3, 0.25]} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />)}
      {[0, 1, 2].map(i => <Box key={i} p={[0, 0.08 + i * 0.08, 1.2 - i * 0.6]} s={[9 - i * 0.6, 0.16 + i * 0.16, 1.8 + i * 0.6]} m={mat(C.concrete)} />)}
    </group>
  )
}

export function Tower() {
  return (
    <group>
      {Array.from({ length: LEVELS }, (_, l) => <Floor key={l} level={l} />)}
      <Lift />
      <Roof />
      <Entrance />
    </group>
  )
}
