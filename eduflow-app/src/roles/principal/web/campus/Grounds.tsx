import { Html, RoundedBox, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSchool } from '@/store/school'
import type { Bus as BusT } from '@/data/types'
import { Box, BoxInstances, Glow, mat } from './parts'
import { Figures, hash, rnd, type Figure } from './Figures'
import { BAY_Z, BUS_SLOTS, C, EDGE, FIELD, HOUSE_COLOR, PLAZA_Z, ROAD_Z, SKIN } from './layout'
import { busPose } from './busPose'
import { useCampus, useCampusUi } from './ui'

/* ───────── ground, plaza, road ───────── */

function Ground() {
  const dashes = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ p: [-160 + i * 8, 0.035, ROAD_Z] as [number, number, number], s: [3.2, 0.01, 0.18] as [number, number, number] })), [])
  const bayLines = useMemo(() => [...BUS_SLOTS.map(x => x - 5.4), BUS_SLOTS[4] + 5.4].map(x => ({ p: [x, 0.04, BAY_Z] as [number, number, number], s: [0.12, 0.01, 4.2] as [number, number, number] })), [])
  return (
    <group>
      {/* the wider neighbourhood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={mat('#E6DDCC', { rough: 1 })}>
        <circleGeometry args={[260, 64]} />
      </mesh>
      {/* school grounds lawn */}
      <Box p={[-4, 0.0, -26]} s={[224, 0.04, 92]} m={mat(C.lawn, { rough: 1 })} cast={false} />
      {/* plaza in front of the tower */}
      <Box p={[0, 0.03, PLAZA_Z]} s={[64, 0.06, 7.2]} m={mat('#EFE8DC', { rough: 0.9 })} cast={false} />
      {[...Array(15)].map((_, i) => <Box key={i} p={[-28 + i * 4, 0.065, PLAZA_Z]} s={[0.05, 0.005, 7]} m={mat(C.concreteDark)} cast={false} receive={false} />)}
      {/* bus bay */}
      <Box p={[0, 0.03, BAY_Z]} s={[64, 0.05, 5.6]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
      <BoxInstances items={bayLines} m={mat('#F3E6C8')} cast={false} />
      <Box p={[0, 0.05, BAY_Z + 2.9]} s={[64, 0.12, 0.25]} m={mat(C.ivory2)} cast={false} />
      {/* road + pavements */}
      <Box p={[0, 0.02, ROAD_Z]} s={[340, 0.04, 6.4]} m={mat(C.asphalt, { rough: 0.95 })} cast={false} />
      <BoxInstances items={dashes} m={mat('#E9DCC0')} cast={false} />
      <Box p={[0, 0.05, ROAD_Z - 3.6]} s={[340, 0.1, 0.9]} m={mat('#D8CFBF')} cast={false} />
      <Box p={[0, 0.05, ROAD_Z + 3.6]} s={[340, 0.1, 0.9]} m={mat('#D8CFBF')} cast={false} />
      {/* driveway from the road into the bay */}
      <Box p={[-36, 0.025, (BAY_Z + ROAD_Z) / 2]} s={[7, 0.05, ROAD_Z - BAY_Z]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
      <Box p={[36, 0.025, (BAY_Z + ROAD_Z) / 2]} s={[7, 0.05, ROAD_Z - BAY_Z]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
    </group>
  )
}

/* ───────── pergola over the bus bay ───────── */

function Pergola() {
  const beams = useMemo(() => Array.from({ length: 33 }, (_, i) => ({ p: [-32 + i * 2, 4.6, BAY_Z] as [number, number, number], s: [0.18, 0.22, 6.4] as [number, number, number] })), [])
  const posts = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ p: [-32 + i * 8, 2.3, BAY_Z + 3.3] as [number, number, number], s: [0.24, 4.6, 0.24] as [number, number, number] })), [])
  return (
    <group>
      <BoxInstances items={beams} m={mat(C.oakDark, { rough: 0.6 })} />
      <BoxInstances items={posts} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />
      <Box p={[0, 4.8, BAY_Z + 3.3]} s={[66, 0.3, 0.3]} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />
    </group>
  )
}

/* ───────── buses ───────── */

function BusModel({ bus, moving }: { bus: BusT; moving: boolean }) {
  const late = bus.delayMin >= 10
  return (
    <group>
      <RoundedBox args={[10, 2.5, 2.5]} radius={0.28} smoothness={4} position={[0, 1.65, 0]} castShadow receiveShadow material={mat(C.bus, { rough: 0.38, metal: 0.15 })} />
      {/* window band */}
      <Box p={[-0.3, 2.15, 0]} s={[8.6, 0.85, 2.54]} m={mat('#2A2E30', { rough: 0.15, metal: 0.4 })} />
      <Box p={[4.98, 2.0, 0]} s={[0.08, 1.15, 2.2]} m={mat('#2A2E30', { rough: 0.1, metal: 0.4 })} />
      <Box p={[0, 1.1, 0]} s={[10.02, 0.12, 2.54]} m={mat(C.ink, { rough: 0.5 })} />
      <Box p={[0, 2.95, 0]} s={[9.4, 0.08, 2.2]} m={mat(C.ivory2, { rough: 0.5 })} />
      {/* wheels */}
      {[-3.2, 3.2].flatMap(x => [-1.2, 1.2].map(z => (
        <mesh key={`${x}${z}`} position={[x, 0.5, z]} rotation={[Math.PI / 2, 0, 0]} castShadow material={mat('#1E1B18', { rough: 0.9 })}>
          <cylinderGeometry args={[0.5, 0.5, 0.36, 18]} />
        </mesh>
      )))}
      {/* lights */}
      <Glow p={[5.02, 1.0, 0.85]} s={[0.04, 0.22, 0.4]} color="#FFF1CF" intensity={moving ? 4 : 0.6} />
      <Glow p={[5.02, 1.0, -0.85]} s={[0.04, 0.22, 0.4]} color="#FFF1CF" intensity={moving ? 4 : 0.6} />
      <Glow p={[-5.02, 1.0, 0.9]} s={[0.04, 0.2, 0.3]} color="#FF5A3C" intensity={moving ? 3 : 0.5} />
      <Glow p={[-5.02, 1.0, -0.9]} s={[0.04, 0.2, 0.3]} color="#FF5A3C" intensity={moving ? 3 : 0.5} />
      {late && moving && <Glow p={[0, 3.05, 0]} s={[1.2, 0.08, 0.5]} color={C.rust} intensity={3} pulse />}
    </group>
  )
}

function Bus({ bus, slotX }: { bus: BusT; slotX: number }) {
  const ref = useRef<THREE.Group>(null)
  const minute = useCampusUi(s => s.minute)
  const labels = useCampusUi(s => s.labels)
  const select = useCampusUi(s => s.select)
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const pose = busPose(bus, slotX, minute)
  const first = useRef(true)
  useFrame((_, dt) => {
    if (!ref.current) return
    if (first.current) { ref.current.position.set(pose.x, 0, pose.z); first.current = false }
    easing.damp(ref.current.position, 'x', pose.x, pose.state === 'parked' ? 0.6 : 0.35, dt)
    easing.damp(ref.current.position, 'z', pose.z, 0.5, dt)
  })
  const late = bus.delayMin >= 10
  return (
    <group ref={ref} onPointerOver={e => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)} onClick={e => { e.stopPropagation(); select(`bus:${bus.id}`) }}>
      <BusModel bus={bus} moving={pose.moving && pose.state !== 'away'} />
      {(
        <Html position={[0, 4, 0]} center distanceFactor={30} zIndexRange={[25, 0]} style={{ pointerEvents: 'none', display: labels && pose.state !== 'away' ? 'block' : 'none' }}>
          <div className={`campus-bus ${late && pose.state === 'arriving' ? 'is-late' : ''}`}>
            <b>{bus.id}</b>{pose.state === 'arriving' ? (late ? `+${bus.delayMin} min` : 'arriving') : pose.state === 'leaving' ? 'leaving' : 'parked'}
          </div>
        </Html>
      )}
    </group>
  )
}

function Buses() {
  const buses = useSchool(s => s.buses)
  // park in the order they usually arrive, end to end along the bay
  const ordered = useMemo(() => [...buses].sort((a, b) => a.stops[a.stops.length - 1].at.localeCompare(b.stops[b.stops.length - 1].at)), [buses])
  return <>{ordered.map((b, i) => <Bus key={b.id} bus={b} slotX={BUS_SLOTS[i]} />)}</>
}

/* ───────── sports field ───────── */

function Field() {
  const lines = mat('#F5F1E6', { rough: 1 })
  const fw = FIELD.w - 8, fd = FIELD.d - 7
  return (
    <group position={[FIELD.x, 0, FIELD.z]}>
      {/* running track (rounded rectangle) */}
      <RoundedBox args={[FIELD.w, 0.08, FIELD.d]} radius={0.04} position={[0, 0.06, 0]} receiveShadow material={mat(C.track, { rough: 0.95 })} />
      {[1, 2, 3].map(k => <Box key={k} p={[0, 0.105, FIELD.d / 2 - k * 0.9]} s={[FIELD.w - 2, 0.005, 0.05]} m={lines} cast={false} />)}
      {[1, 2, 3].map(k => <Box key={-k} p={[0, 0.105, -FIELD.d / 2 + k * 0.9]} s={[FIELD.w - 2, 0.005, 0.05]} m={lines} cast={false} />)}
      {/* pitch */}
      <Box p={[0, 0.11, 0]} s={[fw, 0.02, fd]} m={mat(C.field, { rough: 1 })} cast={false} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => <Box key={i} p={[-fw / 2 + fw / 14 + i * (fw / 7), 0.122, 0]} s={[fw / 14, 0.004, fd]} m={mat('#94AB80', { rough: 1 })} cast={false} receive={false} />)}
      <Box p={[0, 0.13, 0]} s={[0.08, 0.005, fd]} m={lines} cast={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]} material={lines}><ringGeometry args={[2.1, 2.2, 48]} /></mesh>
      {[-1, 1].map(s => (
        <group key={s} position={[s * (fw / 2 - 0.1), 0, 0]}>
          <Box p={[0, 1.1, -1.8]} s={[0.1, 2.2, 0.1]} m={lines} />
          <Box p={[0, 1.1, 1.8]} s={[0.1, 2.2, 0.1]} m={lines} />
          <Box p={[0, 2.2, 0]} s={[0.1, 0.1, 3.7]} m={lines} />
          <Box p={[-s * 2, 0.13, 0]} s={[0.06, 0.005, 6]} m={lines} cast={false} />
        </group>
      ))}
      {/* small stand along the back */}
      {[0, 1, 2].map(i => <Box key={i} p={[0, 0.3 + i * 0.4, -FIELD.d / 2 - 1.4 - i * 0.8]} s={[18, 0.6 + i * 0.8, 0.8]} m={mat(i % 2 ? C.forest : C.ivory2, { rough: 0.7 })} />)}
    </group>
  )
}

/* ───────── trees & lamps ───────── */

function Trees() {
  const spots = useMemo(() => {
    const out: { x: number; z: number; s: number; k: number }[] = []
    // keep trees off buildings, courts, paths and the road
    const KEEP_OUT: [number, number, number, number][] = [
      [-16, 16, -9, 13], [FIELD.x - FIELD.w / 2 - 3, FIELD.x + FIELD.w / 2 + 3, FIELD.z - FIELD.d / 2 - 6, FIELD.z + FIELD.d / 2 + 3],
      [-64, -29, -12, 4], [-70, -34, -53, -15], [-17, 17, -63, -29], [26, 66, -59, -33], [-10, 10, -30, -10],
      [66, 98, -19, 11], [-106, -62, -6, 18], [-45, 45, 4, 19], [83, 93, -50, -38], [-14, -8, -34, -5], [-38, 30, -30, -23],
    ]
    const ok = (x: number, z: number) => z < ROAD_Z - 5 && !KEEP_OUT.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)
    for (let i = 0; out.length < 120 && i < 2000; i++) {
      const x = -112 + rnd(i * 3.1) * 214, z = -70 + rnd(i * 7.7) * 86
      if (ok(x, z)) out.push({ x, z, s: 0.8 + rnd(i * 1.3) * 0.75, k: i })
    }
    // a line of trees along the road
    for (let x = -60; x <= 100; x += 7) if (Math.abs(x + 84) > 24 && Math.abs(x + 36) > 6 && Math.abs(x - 36) > 6) out.push({ x, z: ROAD_Z - 5.2, s: 0.9, k: x + 300 })
    return out
  }, [])
  const greens = ['#6F8B66', '#7E9A72', '#5F7E5A', '#8AA27A']
  const trunks = useMemo(() => spots.map(t => ({ p: [t.x, 0.9 * t.s, t.z] as [number, number, number], s: [0.3 * t.s, 1.8 * t.s, 0.3 * t.s] as [number, number, number] })), [spots])
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const ref = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), [])
  useLayoutEffect(() => {
    {
      if (!ref.current) return
      const o = new THREE.Object3D(), c = new THREE.Color()
      spots.forEach((t, i) => {
        o.position.set(t.x, 2.6 * t.s, t.z)
        o.scale.set(1.5 * t.s, 1.8 * t.s, 1.5 * t.s)
        o.rotation.set(0, rnd(t.k) * 3, 0)
        o.updateMatrix()
        ref.current!.setMatrixAt(i, o.matrix)
        ref.current!.setColorAt(i, c.set(greens[hash(String(t.k)) % greens.length]))
      })
      ref.current.instanceMatrix.needsUpdate = true
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
  }, [spots]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <BoxInstances items={trunks} m={mat('#7B5F42', { rough: 0.9 })} />
      <instancedMesh ref={ref} args={[crownGeo, m, spots.length]} castShadow receiveShadow />
    </group>
  )
}

function Lamps() {
  const xs = [-28, -20, -12, 12, 20, 28]
  return (
    <group>
      {xs.map(x => (
        <group key={x} position={[x, 0, PLAZA_Z + 3.2]}>
          <Box p={[0, 1.8, 0]} s={[0.12, 3.6, 0.12]} m={mat(C.charcoal, { rough: 0.5, metal: 0.5 })} />
          <Glow p={[0, 3.65, 0]} s={[0.5, 0.1, 0.5]} color="#FFE3BA" intensity={1.6} />
        </group>
      ))}
    </group>
  )
}

/* ───────── people outdoors ───────── */

function OutdoorPeople() {
  const campus = useCampus()
  const students = useSchool(s => s.students)
  const minute = useCampusUi(s => s.minute)
  const on = useCampusUi(s => s.people)

  // classes out on the field for Games
  const players = useMemo<Figure[]>(() => {
    const out: Figure[] = []
    campus.filter(c => c.location === 'field' && (c.status === 'playground' || c.status === 'substitute')).forEach((c, ci) => {
      c.presentIds.forEach(id => {
        const st = students.find(s => s.id === id)!
        out.push({ x: FIELD.x + (ci ? 6 : -6), y: 0.12, z: FIELD.z, body: HOUSE_COLOR[st.house], skin: SKIN[hash(id) % 5], scale: 0.95 })
      })
    })
    return out
  }, [campus, students])
  const playerMove = (i: number, t: number, f: Figure): [number, number, number, number] => {
    const a = rnd(i * 13.7) * Math.PI * 2, r = 2 + rnd(i * 3.3) * 9
    const sp = 0.25 + rnd(i * 5.1) * 0.35
    const x = f.x + Math.cos(a + t * sp) * r * 0.9 + Math.sin(t * 0.7 + i) * 1.2
    const z = f.z + Math.sin(a + t * sp * 1.3) * r * 0.45
    return [x, f.y + Math.abs(Math.sin(t * 9 + i)) * 0.12, z, -(a + t * sp) - Math.PI / 2]
  }
  const pe = useMemo<Figure[]>(() => (players.length ? [{ x: FIELD.x, y: 0.12, z: FIELD.z + 6.4, body: C.forest, skin: SKIN[2], scale: 1.08 }] : []), [players.length])

  // break & lunch: the whole school spills onto the plaza and the field
  const isBreak = (minute >= 615 && minute < 630) || (minute >= 720 && minute < 760)
  const crowd = useMemo<Figure[]>(() => (isBreak ? Array.from({ length: 140 }, (_, i) => {
    const onField = i % 2 === 0
    return {
      x: onField ? FIELD.x - 12 + rnd(i * 2.1) * 24 : -26 + rnd(i * 4.3) * 52,
      y: 0.08, z: onField ? FIELD.z - 7 + rnd(i * 6.7) * 14 : PLAZA_Z - 2.6 + rnd(i * 8.9) * 5.2,
      body: Object.values(HOUSE_COLOR)[i % 4], skin: SKIN[i % 5], scale: 0.94,
    }
  }) : []), [isBreak])
  const mill = (i: number, t: number, f: Figure): [number, number, number, number] => [f.x + Math.sin(t * 0.4 + i) * 0.8, f.y, f.z + Math.cos(t * 0.33 + i * 1.7) * 0.6, t * 0.4 + i]

  // morning arrivals: children walking from the bus bay to the entrance
  const arriving = minute >= 7 * 60 + 35 && minute < 8 * 60 + 2
  const walkers = useMemo<Figure[]>(() => (arriving ? Array.from({ length: 60 }, (_, i) => ({ x: -24 + rnd(i * 1.9) * 48, y: 0.08, z: BAY_Z - 2.6, body: Object.values(HOUSE_COLOR)[i % 4], skin: SKIN[i % 5], scale: 0.94 })) : []), [arriving])
  const walk = (i: number, t: number, f: Figure): [number, number, number, number] => {
    const k = ((t * 0.08 + rnd(i * 3.3)) % 1)
    const x = THREE.MathUtils.lerp(f.x, rnd(i) * 6 - 3, k)
    const z = THREE.MathUtils.lerp(f.z, EDGE + 3.5, k)
    return [x, f.y + Math.abs(Math.sin(t * 8 + i)) * 0.05, z, Math.atan2(-(z - f.z), x - f.x) + Math.PI]
  }

  if (!on) return null
  return (
    <group>
      {players.length > 0 && <Figures items={players} move={playerMove} />}
      {pe.length > 0 && <Figures items={pe} />}
      {players.length > 0 && <Ball />}
      {crowd.length > 0 && <Figures items={crowd} move={mill} />}
      {walkers.length > 0 && <Figures items={walkers} move={walk} />}
    </group>
  )
}

function Ball() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.set(FIELD.x + Math.sin(t * 0.6) * 9, 0.3 + Math.abs(Math.sin(t * 2.4)) * 0.8, FIELD.z + Math.sin(t * 0.9) * 4)
  })
  return <mesh ref={ref} castShadow material={mat('#FDFCF8', { rough: 0.5 })}><sphereGeometry args={[0.22, 16, 12]} /></mesh>
}

export function Grounds() {
  return (
    <group>
      <Ground />
      <Pergola />
      <Buses />
      <Field />
      <Trees />
      <Lamps />
      <OutdoorPeople />
    </group>
  )
}

