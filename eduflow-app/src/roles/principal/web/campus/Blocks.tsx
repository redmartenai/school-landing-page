/* The rest of Greenfield: Science Block, Junior Wing + playground, Aquatic Arena, Auditorium. */
import { Html, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useSchool } from '@/store/school'
import { Box, BoxInstances, Glow, glassMat, mat } from './parts'
import { Figures, hash, rnd, type Figure } from './Figures'
import { BLOCKS, C, HOUSE_COLOR, SKIN } from './layout'
import { useCampus, useCampusUi } from './ui'

const TEACHER = '#2F2A25'

/* ───────── shared: clickable label over a block ───────── */

export function BlockLabel({ id, p, title, sub, tone = 'stone', alarm }: { id: string; p: [number, number, number]; title: string; sub: string; tone?: string; alarm?: boolean }) {
  const labels = useCampusUi(s => s.labels && s.focusFloor === null && s.focusPlace !== id && s.selected !== `place:${id}`)
  const selected = useCampusUi(s => s.selected === `place:${id}`)
  const set = useCampusUi(s => s.set)
  return (
    <Html position={p} center distanceFactor={44} zIndexRange={[30, 0]} style={{ display: labels ? 'block' : 'none', pointerEvents: labels ? 'auto' : 'none' }}>
      <button onClick={() => set({ selected: `place:${id}`, focusPlace: id, focusFloor: null, focusField: false })}
        className={`campus-chip campus-chip--block campus-chip--${tone} ${alarm ? 'is-alarm' : ''} ${selected ? 'is-selected' : ''}`}>
        <span className="campus-chip__title">{title}</span>
        <span className="campus-chip__sub">{sub}</span>
      </button>
    </Html>
  )
}

/** Hover/click volume so a whole block can be picked in 3D. */
function PickVolume({ id, size, p }: { id: string; size: [number, number, number]; p: [number, number, number] }) {
  const [hover, setHover] = useState(false)
  const set = useCampusUi(s => s.set)
  useCursor(hover)
  return (
    <mesh position={p} onPointerOver={e => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)}
      onClick={e => { e.stopPropagation(); set({ selected: `place:${id}`, focusPlace: id, focusFloor: null, focusField: false }) }}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={hover ? 0.05 : 0} color="#F2B36B" depthWrite={false} />
    </mesh>
  )
}

/* ───────── shared: cutaway building shell ───────── */

function CutawayShell({ w, d, floors, h, wall, accent, children }: { w: number; d: number; floors: number; h: number; wall: string; accent: string; children: (level: number) => ReactNode }) {
  return (
    <group>
      {Array.from({ length: floors }, (_, l) => (
        <group key={l} position={[0, l * h, 0]}>
          <Box p={[0, -0.15, 0]} s={[w + 0.4, 0.3, d + 0.4]} m={mat(C.concrete, { rough: 0.85 })} />
          <Box p={[0, -0.15, d / 2 + 0.22]} s={[w + 0.6, 0.34, 0.1]} m={mat(accent, { rough: 0.5, metal: 0.2 })} />
          <Box p={[0, h / 2 - 0.15, -d / 2 - 0.12]} s={[w + 0.4, h - 0.3, 0.24]} m={mat(wall, { rough: 0.9 })} />
          {[-1, 1].map(s => <Box key={s} p={[s * (w / 2 + 0.12), h / 2 - 0.15, 0]} s={[0.24, h - 0.3, d]} m={mat(wall, { rough: 0.9 })} />)}
          <mesh position={[0, h / 2 - 0.15, d / 2]} material={glassMat}><boxGeometry args={[w, h - 0.3, 0.04]} /></mesh>
          {Array.from({ length: Math.floor(w / 3) + 1 }, (_, i) => <Box key={i} p={[-w / 2 + i * (w / Math.floor(w / 3)), h / 2 - 0.15, d / 2 + 0.02]} s={[0.07, h - 0.3, 0.09]} m={mat(accent, { rough: 0.55 })} cast={false} />)}
          <Glow p={[0, h - 0.36, -d / 4]} s={[w - 3, 0.04, d / 3]} color="#FFEFD6" intensity={1.05} />
          {children(l)}
        </group>
      ))}
      {/* roof */}
      <group position={[0, floors * h, 0]}>
        <Box p={[0, -0.15, 0]} s={[w + 0.4, 0.3, d + 0.4]} m={mat(C.concrete, { rough: 0.85 })} />
        <Box p={[0, 0.45, d / 2 + 0.1]} s={[w + 0.4, 0.9, 0.18]} m={mat(accent, { rough: 0.5 })} />
        <Box p={[0, 0.45, -d / 2 - 0.1]} s={[w + 0.4, 0.9, 0.18]} m={mat(wall)} />
      </group>
    </group>
  )
}

/* ───────── Science Block ───────── */

function Flasks({ count, seed, active }: { count: number; seed: number; active: boolean }) {
  // little glowing flasks on the benches — they bubble when a class is in
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.13, 0.32, 10), [])
  const m = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const colors = ['#FF9C5A', '#7FE0B0', '#FFD36B', '#9FD3FF']
  const pos = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: -11 + (i % 8) * 3.1 + rnd(seed + i) * 0.6, z: -2.4 + Math.floor(i / 8) * 2.4, c: colors[(i + seed) % 4] })), [count, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D(), c = new THREE.Color()
    pos.forEach((p, i) => {
      const k = active ? 1 + 0.6 * Math.sin(clock.elapsedTime * 4 + i) : 0.35
      o.position.set(p.x, 1.05 + (active ? Math.abs(Math.sin(clock.elapsedTime * 3 + i)) * 0.03 : 0), p.z)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(p.c).multiplyScalar(1.6 * k))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, m, count]} />
}

export function ScienceBlock() {
  const B = BLOCKS.science
  const campus = useCampus()
  const students = useSchool(s => s.students)
  const people = useCampusUi(s => s.people)
  const inLab = campus.filter(c => c.location === 'science' && (c.status === 'lab' || c.status === 'substitute'))
  const LABS = ['Physics lab', 'Chemistry lab', 'Biology lab']
  const benches = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ p: [-10.5 + (i % 4) * 7, 0.48, -2.2 + Math.floor(i / 4) * 3.6] as [number, number, number], s: [5.2, 0.96, 1.3] as [number, number, number] })), [])
  const tops = useMemo(() => benches.map(b => ({ p: [b.p[0], 0.98, b.p[2]] as [number, number, number], s: [5.4, 0.06, 1.45] as [number, number, number] })), [benches])

  const crowd = (level: number) => {
    const c = inLab[level]
    if (!c || !people) return null
    const kids: Figure[] = c.presentIds.slice(0, 32).map((id, i) => {
      const st = students.find(s => s.id === id)!
      const b = benches[i % 8]
      const side = Math.floor(i / 8) % 2 ? 1 : -1
      return { x: b.p[0] - 2 + (Math.floor(i / 16)) * 2.2 + rnd(i) * 0.4, y: 0.02, z: b.p[2] + side * 0.95, rot: side > 0 ? Math.PI : 0, body: HOUSE_COLOR[st.house], skin: SKIN[hash(id) % 5], scale: 0.94 }
    })
    const teacher: Figure[] = c.teacherId ? [{ x: 0, y: 0.02, z: -4.6, body: TEACHER, skin: SKIN[hash(c.teacherId) % 5], scale: 1.06 }] : []
    return (
      <>
        <Figures items={kids} />
        {teacher.length > 0 && <Figures items={teacher} move={(_i, t, f) => [Math.sin(t * 0.3) * 6, f.y, f.z, 0]} />}
      </>
    )
  }

  return (
    <group position={[B.x, 0, B.z]}>
      <CutawayShell w={B.w} d={B.d} floors={B.floors} h={3.5} wall="#EEE7DB" accent={C.forest}>
        {level => (
          <>
            <Box p={[0, 0.01, 0]} s={[B.w - 0.2, 0.02, B.d - 0.2]} m={mat(level === 2 ? '#DCE3D3' : '#E4E0D8', { rough: 0.6 })} cast={false} />
            <BoxInstances items={benches} m={mat('#F4F1EA', { rough: 0.4 })} />
            <BoxInstances items={tops} m={mat(C.ink, { rough: 0.25, metal: 0.1 })} />
            <Flasks count={16} seed={level * 5} active={!!inLab[level]} />
            {/* fume hoods along the back */}
            {[-9, -3, 3, 9].map(x => <Box key={x} p={[x, 1.4, -B.d / 2 + 0.6]} s={[3.6, 2.6, 1]} m={mat(level === 1 ? '#E8E2D6' : '#DCD6CB', { rough: 0.5 })} />)}
            {level === 2 && [-12.5, 12.5].map(x => <Box key={x} p={[x, 1.2, 3]} s={[1.4, 0.9, 0.6]} m={mat('#6FB3C4', { rough: 0.05, emissive: '#6FB3C4', ei: 0.4 })} />)}
            {crowd(level)}
            <Html position={[-B.w / 2 - 1.2, 1.4, B.d / 2]} center distanceFactor={34} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <div className="campus-floorname">{LABS[level]}</div>
            </Html>
          </>
        )}
      </CutawayShell>
      <PickVolume id="science" p={[0, 5.25, 0]} size={[B.w, 10.5, B.d]} />
      <BlockLabel id="science" p={[0, 13.6, 0]} title="Science Block" tone={inLab.length ? 'forest' : 'stone'}
        sub={inLab.length ? inLab.map(c => `${c.classId} in lab`).join(' · ') : 'Labs free this period'} />
    </group>
  )
}

/* ───────── Junior Wing + playground ───────── */

export function JuniorWing() {
  const B = BLOCKS.junior
  const people = useCampusUi(s => s.people)
  const minute = useCampusUi(s => s.minute)
  const inSchool = minute >= 8 * 60 && minute < 14 * 60
  const tables = useMemo(() => [-10, -4, 4, 10].flatMap(x => [-2, 2].map(z => ({ x, z }))), [])
  const kids = useMemo<Figure[]>(() => (inSchool ? tables.flatMap((t, ti) => Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2
    return { x: t.x + Math.cos(a) * 1.2, y: 0.02, z: t.z + Math.sin(a) * 1.2, rot: -a + Math.PI / 2, body: [C.amber, C.forestL, C.copperL, C.slateL][(ti + i) % 4], skin: SKIN[(ti * 5 + i) % 5], seated: true, scale: 0.7 }
  })) : []), [tables, inSchool])
  const tops = useMemo(() => tables.map(t => ({ p: [t.x, 0.52, t.z] as [number, number, number], s: [1.6, 0.06, 1.6] as [number, number, number] })), [tables])
  return (
    <group position={[B.x, 0, B.z]}>
      <CutawayShell w={B.w} d={B.d} floors={B.floors} h={3.4} wall="#F4EBDD" accent={C.amber}>
        {() => (
          <>
            <Box p={[0, 0.01, 0]} s={[B.w - 0.2, 0.02, B.d - 0.2]} m={mat('#EAD9BE', { rough: 0.7 })} cast={false} />
            <Box p={[0, 1.6, 0]} s={[0.2, 3.1, B.d]} m={mat('#F4EBDD')} />
            <BoxInstances items={tops} m={mat(C.copperL, { rough: 0.5 })} />
            {/* soft play rug and cubbies */}
            {[-7, 7].map(x => <Box key={x} p={[x, 0.03, 4.4]} s={[4, 0.04, 2.4]} m={mat(x < 0 ? '#CFE0D7' : '#F6D9A2', { rough: 1 })} cast={false} />)}
            <Box p={[0, 0.7, -B.d / 2 + 0.45]} s={[B.w - 2, 1.4, 0.6]} m={mat('#E8C9A0', { rough: 0.7 })} />
            {people && kids.length > 0 && <Figures items={kids} />}
            {people && inSchool && <Figures items={[{ x: -7, y: 0.02, z: -4.4, body: TEACHER, skin: SKIN[1], scale: 1.05 }, { x: 7, y: 0.02, z: -4.4, body: TEACHER, skin: SKIN[3], scale: 1.05 }]} />}
          </>
        )}
      </CutawayShell>
      {/* playful sawtooth roof lights */}
      {[-10, 0, 10].map(x => <mesh key={x} position={[x, 7.4, 0]} rotation={[0, 0, Math.PI / 4]} castShadow material={mat(C.amber, { rough: 0.6 })}><boxGeometry args={[2.4, 2.4, B.d - 1]} /></mesh>)}
      <PickVolume id="junior" p={[0, 4, 0]} size={[B.w, 8, B.d]} />
      <BlockLabel id="junior" p={[0, 11.5, 0]} title="Junior Wing" tone="amber" sub={inSchool ? 'Grades 1–5 · 40 little ones' : 'Grades 1–5'} />
      <Playground />
    </group>
  )
}

function Swing({ x, phase }: { x: number; phase: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.x = Math.sin(clock.elapsedTime * 1.9 + phase) * 0.7 })
  return (
    <group position={[x, 2.6, 0]}>
      <group ref={ref}>
        <Box p={[-0.32, -1.1, 0]} s={[0.03, 2.2, 0.03]} m={mat(C.charcoal2)} cast={false} />
        <Box p={[0.32, -1.1, 0]} s={[0.03, 2.2, 0.03]} m={mat(C.charcoal2)} cast={false} />
        <Box p={[0, -2.2, 0]} s={[0.8, 0.07, 0.36]} m={mat(C.rust, { rough: 0.6 })} />
        <Figures items={[{ x: 0, y: -2.85, z: 0, body: [C.amber, C.forestL, C.copperL][Math.abs(Math.round(phase * 3)) % 3], skin: SKIN[Math.abs(Math.round(phase * 7)) % 5], seated: true, scale: 0.68 }]} />
      </group>
    </group>
  )
}

function Playground() {
  const P = BLOCKS.playground
  const B = BLOCKS.junior
  const people = useCampusUi(s => s.people)
  const mgr = useRef<THREE.Group>(null)
  const seesaw = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (mgr.current) mgr.current.rotation.y = t * 0.9
    if (seesaw.current) seesaw.current.rotation.z = Math.sin(t * 1.4) * 0.28
  })
  const runners = useMemo<Figure[]>(() => Array.from({ length: 16 }, (_, i) => ({ x: 0, y: 0.12, z: 0, body: [C.amber, C.forestL, C.copperL, C.slateL][i % 4], skin: SKIN[i % 5], scale: 0.68 })), [])
  const run = (i: number, t: number, f: Figure): [number, number, number, number] => {
    const a = t * (0.35 + rnd(i) * 0.3) + i * 1.7
    const r = 4 + rnd(i * 3) * 6
    return [Math.cos(a) * r * 1.3, f.y + Math.abs(Math.sin(t * 9 + i)) * 0.1, Math.sin(a) * r * 0.55, -a]
  }
  return (
    <group position={[P.x - B.x, 0, P.z - B.z]}>
      {/* soft rubber surface */}
      <Box p={[0, 0.06, 0]} s={[30, 0.12, 14]} m={mat('#E7C29A', { rough: 1 })} cast={false} />
      <Box p={[-8, 0.13, 0]} s={[9, 0.02, 10]} m={mat('#CFE0D7', { rough: 1 })} cast={false} />
      {/* swings */}
      <group position={[-8, 0, -3]}>
        {[-3, 3].map(x => [-1, 1].map(s => <Box key={`${x}${s}`} p={[x + s * 0.5, 1.4, 0]} s={[0.12, 2.9, 0.12]} m={mat(C.forest, { rough: 0.5 })} rot={[0, 0, s * 0.18]} />))}
        <Box p={[0, 2.75, 0]} s={[6.6, 0.14, 0.14]} m={mat(C.forest, { rough: 0.5 })} />
        <Swing x={-1.6} phase={0} />
        <Swing x={0} phase={1.3} />
        <Swing x={1.6} phase={2.4} />
      </group>
      {/* slide */}
      <group position={[2, 0, -3]}>
        <Box p={[0, 1.1, 0]} s={[1.6, 0.12, 1.6]} m={mat(C.amber, { rough: 0.5 })} />
        {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z], i) => <Box key={i} p={[x, 0.55, z]} s={[0.12, 1.1, 0.12]} m={mat(C.forest)} />)}
        <Box p={[2, 0.6, 0]} s={[3.2, 0.1, 1]} rot={[0, 0, -0.38]} m={mat(C.rust, { rough: 0.35 })} />
      </group>
      {/* merry-go-round */}
      <group ref={mgr} position={[8.5, 0.15, -1.5]}>
        <mesh castShadow receiveShadow material={mat(C.slate, { rough: 0.5 })}><cylinderGeometry args={[1.8, 1.8, 0.16, 32]} /></mesh>
        <mesh position={[0, 0.6, 0]} material={mat(C.amber)}><cylinderGeometry args={[0.08, 0.08, 1.2, 8]} /></mesh>
        {people && <Figures items={[0, 1, 2, 3].map(i => ({ x: Math.cos(i * 1.57) * 1.25, y: 0.08, z: Math.sin(i * 1.57) * 1.25, body: [C.amber, C.forestL, C.copperL, C.slateL][i], skin: SKIN[i], seated: true, scale: 0.68 }))} />}
      </group>
      {/* seesaw */}
      <group position={[8, 0, 4]}>
        <Box p={[0, 0.3, 0]} s={[0.4, 0.6, 0.4]} m={mat(C.forest)} />
        <group ref={seesaw} position={[0, 0.62, 0]}>
          <Box p={[0, 0, 0]} s={[4.4, 0.1, 0.4]} m={mat(C.amber)} />
          {people && <Figures items={[{ x: -1.9, y: 0.02, z: 0, body: C.forestL, skin: SKIN[2], seated: true, scale: 0.66 }, { x: 1.9, y: 0.02, z: 0, body: C.copperL, skin: SKIN[0], seated: true, scale: 0.66 }]} />}
        </group>
      </group>
      {people && <Figures items={runners} move={run} />}
      {people && <Figures items={[{ x: -13, y: 0.12, z: 5, body: TEACHER, skin: SKIN[2], scale: 1.05 }]} />}
    </group>
  )
}

/* ───────── Aquatic & Sports Arena ───────── */

function Water({ w, d }: { w: number; d: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(w, d, 50, 24); g.rotateX(-Math.PI / 2); return g }, [w, d])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const m = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#4FA3B8', roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92 }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2]
      pos.setY(i, Math.sin(x * 0.9 + t * 2.1) * 0.035 + Math.cos(z * 1.4 + t * 1.6) * 0.03 + Math.sin((x + z) * 0.5 + t) * 0.02)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return <mesh ref={ref} geometry={geo} material={m} receiveShadow />
}

function Swimmers({ lanes, len }: { lanes: number; len: number }) {
  const body = useRef<THREE.InstancedMesh>(null)
  const head = useRef<THREE.InstancedMesh>(null)
  const bodyGeo = useMemo(() => new THREE.CapsuleGeometry(0.17, 0.9, 4, 10).rotateZ(Math.PI / 2), [])
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.15, 12, 10), [])
  const caps = ['#B4763A', '#2E5D4E', '#A4483A', '#E0A53F', '#4E5A66', '#F8F5EF']
  useFrame(({ clock }) => {
    if (!body.current || !head.current) return
    const o = new THREE.Object3D()
    for (let i = 0; i < lanes; i++) {
      const speed = 0.07 + rnd(i) * 0.05
      const ph = (clock.elapsedTime * speed + rnd(i * 3)) % 2
      const k = ph < 1 ? ph : 2 - ph
      const dir = ph < 1 ? 1 : -1
      const x = -len / 2 + 1 + k * (len - 2)
      const z = -5.25 + i * 1.5
      const bob = Math.sin(clock.elapsedTime * 6 + i) * 0.03
      o.position.set(x, 0.02 + bob, z); o.rotation.set(Math.sin(clock.elapsedTime * 5 + i) * 0.25, 0, 0); o.updateMatrix()
      body.current.setMatrixAt(i, o.matrix)
      o.position.set(x + dir * 0.75, 0.08 + bob, z); o.rotation.set(0, 0, 0); o.updateMatrix()
      head.current.setMatrixAt(i, o.matrix)
    }
    body.current.instanceMatrix.needsUpdate = true
    head.current.instanceMatrix.needsUpdate = true
  })
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4 }), [])
  return (
    <>
      <instancedMesh ref={body} args={[bodyGeo, mat('#D9A87E', { rough: 0.6 }), lanes]} castShadow />
      <instancedMesh ref={head} args={[headGeo, headMat, lanes]} onUpdate={m => { const c = new THREE.Color(); for (let i = 0; i < lanes; i++) m.setColorAt(i, c.set(caps[i % caps.length])); if (m.instanceColor) m.instanceColor.needsUpdate = true }} />
    </>
  )
}

export function Arena() {
  const B = BLOCKS.arena
  const ribs = 9
  const roofGlass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#E6F0F2', roughness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }), [])
  const ropes = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ p: [0, 0.06, -4.5 + i * 1.5] as [number, number, number], s: [25, 0.06, 0.07] as [number, number, number], c: i % 2 ? C.rust : C.ivory2 })), [])
  const seats = useMemo(() => [0, 1, 2, 3].map(i => ({ p: [0, 0.3 + i * 0.45, -B.d / 2 + 1.2 + i * 0.9] as [number, number, number], s: [B.w - 6, 0.6 + i * 0.9, 0.85] as [number, number, number] })), [B])
  const fans = useMemo<Figure[]>(() => Array.from({ length: 22 }, (_, i) => ({ x: -13 + i * 1.25 + rnd(i) * 0.3, y: 0.6 + (i % 4) * 0.45 + 0.3, z: -B.d / 2 + 1.2 + (i % 4) * 0.9, body: Object.values(HOUSE_COLOR)[i % 4], skin: SKIN[i % 5], seated: true, scale: 0.9 })), [B])
  const people = useCampusUi(s => s.people)
  return (
    <group position={[B.x, 0, B.z]}>
      {/* deck */}
      <Box p={[0, 0.08, 0]} s={[B.w, 0.16, B.d]} m={mat('#E9E4DA', { rough: 0.5 })} cast={false} />
      {/* pool */}
      <group position={[0, 0.3, 2]}>
        {/* coping around the water */}
        {[-1, 1].map(s => <Box key={`x${s}`} p={[s * 12.85, 0.1, 0]} s={[0.7, 0.3, 13.4]} m={mat('#F3EEE4', { rough: 0.5 })} />)}
        {[-1, 1].map(s => <Box key={`z${s}`} p={[0, 0.1, s * 6.35]} s={[26.4, 0.3, 0.7]} m={mat('#F3EEE4', { rough: 0.5 })} />)}
        <Box p={[0, -0.05, 0]} s={[25, 0.1, 12]} m={mat('#2F7F93', { rough: 0.4 })} cast={false} />
        <group position={[0, 0.08, 0]}><Water w={25} d={12} /></group>
        <group position={[0, 0.14, 0]}><BoxInstances items={ropes} m={mat('#ffffff', { rough: 0.5 })} cast={false} /></group>
        {people && <group position={[0, 0.1, 0]}><Swimmers lanes={8} len={25} /></group>}
        {/* starting blocks */}
        {Array.from({ length: 8 }, (_, i) => <Box key={i} p={[-13.1, 0.35, -5.25 + i * 1.5]} s={[0.6, 0.4, 0.6]} m={mat(C.forest, { rough: 0.5 })} />)}
      </group>
      {/* bleachers */}
      <BoxInstances items={seats} m={mat(C.forest, { rough: 0.7 })} />
      {people && <Figures items={fans} />}
      {/* glass walls + copper columns */}
      {[-1, 1].map(s => <mesh key={s} position={[s * B.w / 2, 3, 0]} material={glassMat}><boxGeometry args={[0.05, 6, B.d]} /></mesh>)}
      <mesh position={[0, 3, -B.d / 2]} material={glassMat}><boxGeometry args={[B.w, 6, 0.05]} /></mesh>
      {Array.from({ length: ribs }, (_, i) => {
        const x = -B.w / 2 + (i * B.w) / (ribs - 1)
        return (
          <group key={i} position={[x, 6, 0]}>
            {[-1, 1].map(s => <Box key={s} p={[0, -3, s * B.d / 2]} s={[0.3, 6, 0.3]} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />)}
            {/* arched rib */}
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow material={mat(C.copper, { rough: 0.4, metal: 0.5 })}>
              <torusGeometry args={[B.d / 2, 0.16, 8, 32, Math.PI]} />
            </mesh>
          </group>
        )
      })}
      {/* glass barrel roof */}
      <mesh position={[0, 6, 0]} rotation={[0, 0, Math.PI / 2]} material={roofGlass}>
        <cylinderGeometry args={[B.d / 2, B.d / 2, B.w, 32, 1, true, 0, Math.PI]} />
      </mesh>
      <Glow p={[0, 6.2, 0]} s={[B.w - 2, 0.04, 0.2]} color="#FFE7C2" intensity={1.6} />
      <PickVolume id="arena" p={[0, 6, 0]} size={[B.w, 12, B.d]} />
      <BlockLabel id="arena" p={[0, 14.5, 0]} title="Aquatic Arena" tone="slate" sub="Swim squad · 8 lanes" />
    </group>
  )
}

/* ───────── Auditorium ───────── */

function Spotlights() {
  const refs = useRef<(THREE.Group | null)[]>([])
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFD9A0').multiplyScalar(1.4), transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [])
  useFrame(({ clock }) => {
    refs.current.forEach((g, i) => { if (g) { g.rotation.z = Math.sin(clock.elapsedTime * 0.7 + i * 2) * 0.35; g.rotation.x = Math.cos(clock.elapsedTime * 0.5 + i) * 0.2 } })
  })
  return (
    <>
      {[-4, 0, 4].map((x, i) => (
        <group key={x} ref={el => { refs.current[i] = el }} position={[x, 8.2, 2]}>
          <mesh position={[0, -3.6, 0]} material={m}><coneGeometry args={[2.2, 7.2, 24, 1, true]} /></mesh>
          <mesh material={mat(C.ink)}><cylinderGeometry args={[0.25, 0.3, 0.6, 12]} /></mesh>
        </group>
      ))}
    </>
  )
}

export function Auditorium() {
  const A = BLOCKS.auditorium
  const minute = useCampusUi(s => s.minute)
  const people = useCampusUi(s => s.people)
  const assembly = minute >= 7 * 60 + 50 && minute < 8 * 60 + 2
  const cut = 1.5
  const facing = Math.PI / 4 // the open side faces the main camera
  // stage at the back, rows fanning out toward the opening
  const stageDir = facing + Math.PI
  const sx = Math.sin(stageDir) * A.r * 0.62, sz = Math.cos(stageDir) * A.r * 0.62
  const seatsList = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; r: number }[] = []
    for (let row = 0; row < 9; row++) {
      const R = 5 + row * 1.25
      const n = 10 + row * 2
      for (let k = 0; k < n; k++) {
        const a = facing - 0.95 + (k / (n - 1)) * 1.9
        const x = sx + Math.sin(a) * R, z = sz + Math.cos(a) * R
        if (Math.hypot(x, z) > A.r - 1.2) continue
        out.push({ p: [x, 0.35 + row * 0.22, z], s: [0.7, 0.5, 0.6], r: a })
      }
    }
    return out
  }, [A.r, sx, sz])
  const audience = useMemo<Figure[]>(() => (assembly ? seatsList.map((s, i) => ({ x: s.p[0], y: s.p[1] - 0.3, z: s.p[2], rot: s.r + Math.PI, body: Object.values(HOUSE_COLOR)[i % 4], skin: SKIN[i % 5], seated: true, scale: 0.88 })) : []), [assembly, seatsList])
  const actors = useMemo<Figure[]>(() => (assembly ? [{ x: sx * 1.05, y: 1.22, z: sz * 1.05, body: C.forest, skin: SKIN[1], scale: 1.05 }] : Array.from({ length: 5 }, (_, i) => ({ x: sx + (i - 2) * 1.2, y: 1.22, z: sz, body: [C.rust, C.amber, C.forestL, C.copperL, C.slateL][i], skin: SKIN[i], scale: 0.95 }))), [assembly, sx, sz])
  const act = (i: number, t: number, f: Figure): [number, number, number, number] => [f.x + Math.sin(t * 0.8 + i * 1.3) * 1.2, f.y + (assembly ? 0 : Math.abs(Math.sin(t * 2 + i)) * 0.08), f.z + Math.cos(t * 0.6 + i) * 0.6, Math.sin(t + i)]

  return (
    <group position={[A.x, 0, A.z]}>
      <mesh position={[0, 0.06, 0]} receiveShadow material={mat('#E3D8C6', { rough: 0.8 })}><cylinderGeometry args={[A.r, A.r, 0.12, 64]} /></mesh>
      {/* drum wall, cut open toward the camera */}
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow material={mat('#F1EADF', { rough: 0.85 })}>
        <cylinderGeometry args={[A.r, A.r, 9, 72, 1, true, facing + cut / 2, Math.PI * 2 - cut]} />
      </mesh>
      <mesh position={[0, 4.5, 0]} material={mat('#E3D7C4', { rough: 0.9 })}>
        <cylinderGeometry args={[A.r - 0.35, A.r - 0.35, 9, 72, 1, true, facing + cut / 2, Math.PI * 2 - cut]} />
      </mesh>
      {/* copper crown ring */}
      <mesh position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={mat(C.copper, { rough: 0.4, metal: 0.5 })}><torusGeometry args={[A.r, 0.3, 10, 80]} /></mesh>
      {/* tiered seating */}
      <BoxInstances items={seatsList} m={mat(C.rust, { rough: 0.7 })} />
      {/* stage */}
      <group position={[sx, 0, sz]} rotation={[0, stageDir, 0]}>
        <Box p={[0, 0.6, 0]} s={[10, 1.2, 4]} m={mat(C.oakDark, { rough: 0.5 })} />
        <Box p={[0, 4, -2.3]} s={[11, 6.4, 0.3]} m={mat('#7A2F27', { rough: 0.9 })} />
        <Glow p={[0, 1.22, 2.02]} s={[10, 0.05, 0.05]} color="#FFD9A0" intensity={2.4} />
      </group>
      <group position={[sx, 0, sz]} rotation={[0, stageDir + Math.PI, 0]}><Spotlights /></group>
      {people && <Figures items={audience} />}
      {people && <Figures items={actors} move={act} />}
      <PickVolume id="auditorium" p={[0, 4.5, 0]} size={[A.r * 2, 9, A.r * 2]} />
      <BlockLabel id="auditorium" p={[0, 13, 0]} title="Auditorium" tone={assembly ? 'copper' : 'stone'} sub={assembly ? 'Morning assembly' : 'Drama club rehearsing'} />
    </group>
  )
}
