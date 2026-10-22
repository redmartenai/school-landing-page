/* Life around the blocks: fountain, courts, cars, gates, flag, turbine, clouds, birds, walkways. */
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSchool } from '@/store/school'
import { Box, BoxInstances, Glow, mat } from './parts'
import { Figures, rnd, type Figure } from './Figures'
import { BlockLabel } from './Blocks'
import { busPose } from './busPose'
import { BLOCKS, BUS_SLOTS, C, HOUSE_COLOR, ROAD_Z, SKIN } from './layout'
import { useCampusUi } from './ui'
import { toMin } from '@/engine/campus'

const KIDS = Object.values(HOUSE_COLOR)

/* ───────── fountain garden ───────── */

function Fountain() {
  const N = 160
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.SphereGeometry(0.08, 6, 5), [])
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#D8F0F6').multiplyScalar(1.25), transparent: true, opacity: 0.85, toneMapped: false }), [])
  const ripples = useRef<(THREE.Mesh | null)[]>([])
  const rm = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.4, depthWrite: false }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const mesh = ref.current
    if (mesh) {
      const o = new THREE.Object3D()
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 * 8 + rnd(i)
        const u = (t * 0.55 + rnd(i * 7)) % 1
        const centre = i % 5 === 0
        const r = centre ? u * 0.4 : u * 2.5
        const y = centre ? 0.9 + Math.sin(u * Math.PI) * 3.8 : 0.9 + 4 * u * (1 - u) * 2.2
        o.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
        o.scale.setScalar(1 - u * 0.5)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    ripples.current.forEach((r, i) => {
      if (!r) return
      const k = (t * 0.35 + i / 3) % 1
      r.scale.setScalar(0.4 + k * 2.6)
      ;(r.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.45
    })
  })
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={mat('#D8CFBF', { rough: 0.6 })}><cylinderGeometry args={[3.4, 3.6, 0.6, 48]} /></mesh>
      <mesh position={[0, 0.58, 0]} material={mat('#5FA8BC', { rough: 0.05, metal: 0.1 })}><cylinderGeometry args={[3.1, 3.1, 0.04, 48]} /></mesh>
      <mesh position={[0, 0.9, 0]} castShadow material={mat(C.copper, { rough: 0.35, metal: 0.6 })}><cylinderGeometry args={[0.35, 0.55, 0.7, 16]} /></mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={el => { ripples.current[i] = el }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.61, 0]} material={rm.clone()}>
          <ringGeometry args={[0.9, 1, 40]} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[geo, m, N]} />
    </group>
  )
}

function Garden() {
  const G = BLOCKS.garden
  const flowers = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string }[] = []
    const cols = ['#D19A5C', '#E0A53F', '#C46B5A', '#F3E6C8', '#8FA67A', '#B4763A']
    for (let i = 0; i < 180; i++) {
      const a = rnd(i) * Math.PI * 2, r = 5.6 + rnd(i * 3) * 1.6
      if (Math.abs(Math.sin(a)) < 0.12) continue // leave gaps for paths
      out.push({ p: [Math.cos(a) * r, 0.3, Math.sin(a) * r], s: [0.32, 0.32, 0.32], c: cols[i % cols.length] })
    }
    return out
  }, [])
  const benches = useMemo(() => [0, 1, 2, 3].map(i => {
    const a = i * Math.PI / 2 + Math.PI / 4
    return { p: [Math.cos(a) * 4.4, 0.45, Math.sin(a) * 4.4] as [number, number, number], s: [2, 0.12, 0.6] as [number, number, number], r: -a + Math.PI / 2 }
  }), [])
  const readers = useMemo<Figure[]>(() => [0, 1, 2, 3, 4].map(i => {
    const a = (i % 4) * Math.PI / 2 + Math.PI / 4 + (i > 3 ? 0.25 : -0.15)
    return { x: Math.cos(a) * 4.5, y: 0.1, z: Math.sin(a) * 4.5, rot: -a, body: KIDS[i % 4], skin: SKIN[i], seated: true, scale: 0.9 }
  }), [])
  const people = useCampusUi(s => s.people)
  return (
    <group position={[G.x, 0, G.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow material={mat('#EFE8DC', { rough: 0.9 })}><circleGeometry args={[8, 64]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} receiveShadow material={mat('#A9B98F', { rough: 1 })}><ringGeometry args={[5.2, 7.4, 64]} /></mesh>
      <BoxInstances items={flowers} m={mat('#ffffff', { rough: 0.8 })} />
      <BoxInstances items={benches} m={mat(C.oak, { rough: 0.5 })} />
      <Fountain />
      {people && <Figures items={readers} />}
      <BlockLabel id="garden" p={[0, 6.5, 0]} title="Fountain garden" sub="Quiet reading" tone="forest" />
    </group>
  )
}

/* ───────── basketball courts ───────── */

function Hoop({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Box p={[0, 1.6, -0.5]} s={[0.16, 3.2, 0.16]} m={mat(C.charcoal, { rough: 0.4, metal: 0.5 })} />
      <Box p={[0, 3.2, 0]} s={[1.8, 1.1, 0.06]} m={mat(C.ivory2, { rough: 0.3 })} />
      <mesh position={[0, 2.95, 0.35]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.copper, { rough: 0.4, metal: 0.6 })}><torusGeometry args={[0.24, 0.03, 8, 20]} /></mesh>
    </group>
  )
}

function Courts() {
  const K = BLOCKS.courts
  const people = useCampusUi(s => s.people)
  const ball = useRef<THREE.Mesh>(null)
  const players = useMemo<Figure[]>(() => Array.from({ length: 10 }, (_, i) => ({ x: -7, y: 0.1, z: 0, body: i < 5 ? C.forest : C.copper, skin: SKIN[i % 5], scale: 1 })), [])
  const play = (i: number, t: number): [number, number, number, number] => {
    const drift = Math.sin(t * 0.25) * 7 // the play swings end to end
    const a = t * (0.5 + rnd(i) * 0.4) + i
    return [-7 + Math.cos(a) * (2 + rnd(i * 2) * 3), 0.1 + Math.abs(Math.sin(t * 8 + i)) * 0.08, drift + Math.sin(a * 1.3) * 3.5, -a]
  }
  useFrame(({ clock }) => {
    if (!ball.current) return
    const t = clock.elapsedTime
    ball.current.position.set(-7 + Math.sin(t * 1.3) * 2.5, 0.3 + Math.abs(Math.sin(t * 5)) * 1.3, Math.sin(t * 0.25) * 7 + Math.cos(t * 0.9) * 2)
  })
  const lines = mat('#F5F1E6', { rough: 1 })
  return (
    <group position={[K.x, 0, K.z]}>
      {[-7, 7].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <Box p={[0, 0.08, 0]} s={[13, 0.12, 25]} m={mat('#4F6E64', { rough: 0.85 })} cast={false} />
          <Box p={[0, 0.145, -9.6]} s={[4.6, 0.01, 5.6]} m={mat(C.copper, { rough: 0.9 })} cast={false} />
          <Box p={[0, 0.145, 9.6]} s={[4.6, 0.01, 5.6]} m={mat(C.copper, { rough: 0.9 })} cast={false} />
          <Box p={[0, 0.15, 0]} s={[12.6, 0.005, 0.07]} m={lines} cast={false} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} material={lines}><ringGeometry args={[1.7, 1.78, 40]} /></mesh>
          {[-1, 1].map(s => <Box key={s} p={[s * 6.3, 0.15, 0]} s={[0.07, 0.005, 24.6]} m={lines} cast={false} />)}
          <Hoop x={0} z={-12.2} rot={0} />
          <Hoop x={0} z={12.2} rot={Math.PI} />
        </group>
      ))}
      {/* low fence */}
      <Box p={[0, 1.2, -13.3]} s={[28, 2.4, 0.05]} m={mat(C.charcoal2, { opacity: 0.35, rough: 0.5 })} cast={false} />
      {people && <Figures items={players} move={play} />}
      {people && <mesh ref={ball} castShadow material={mat('#C9622F', { rough: 0.6 })}><sphereGeometry args={[0.24, 16, 12]} /></mesh>}
      <BlockLabel id="courts" p={[0, 7, 0]} title="Basketball" sub="House league practice" tone="forest" />
    </group>
  )
}

/* ───────── car park, drop-off loop and the gates ───────── */

const CAR_COLORS = ['#E8E2D6', '#4E5A66', '#2F2A25', '#A4483A', '#B4763A', '#8B8377', '#D9D2C4', '#2E5D4E']

function CarBodies({ cars }: { cars: { x: number; z: number; r: number; c: string }[] }) {
  const body = useMemo(() => cars.map(c => ({ p: [c.x, 0.62, c.z] as [number, number, number], s: [4.2, 0.9, 1.9] as [number, number, number], r: c.r, c: c.c })), [cars])
  const cabin = useMemo(() => cars.map(c => ({ p: [c.x - Math.cos(c.r) * 0.3, 1.38, c.z + Math.sin(c.r) * 0.3] as [number, number, number], s: [2.3, 0.7, 1.7] as [number, number, number], r: c.r })), [cars])
  return (
    <>
      <BoxInstances items={body} m={mat('#ffffff', { rough: 0.35, metal: 0.25 })} />
      <BoxInstances items={cabin} m={mat('#2A2E30', { rough: 0.12, metal: 0.4 })} />
    </>
  )
}

function MovingCar({ path, offset, color }: { path: [number, number][]; offset: number; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const segs = useMemo(() => {
    let total = 0
    const s = path.slice(1).map((p, i) => { const a = path[i]; const len = Math.hypot(p[0] - a[0], p[1] - a[1]); total += len; return { a, b: p, len } })
    return { s, total }
  }, [path])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const speed = 7
    let d = (clock.elapsedTime * speed + offset * segs.total) % (segs.total + 40)
    // pause at the drop-off point (end of segment 2) for a few seconds
    const stopAt = segs.s.slice(0, 3).reduce((x, y) => x + y.len, 0)
    if (d > stopAt && d < stopAt + 28) d = stopAt
    else if (d >= stopAt + 28) d -= 28
    if (d >= segs.total) { ref.current.visible = false; return }
    ref.current.visible = true
    for (const s of segs.s) {
      if (d <= s.len) {
        const k = d / s.len
        ref.current.position.set(s.a[0] + (s.b[0] - s.a[0]) * k, 0, s.a[1] + (s.b[1] - s.a[1]) * k)
        ref.current.rotation.y = Math.atan2(-(s.b[1] - s.a[1]), s.b[0] - s.a[0])
        return
      }
      d -= s.len
    }
  })
  return (
    <group ref={ref}>
      <Box p={[0, 0.62, 0]} s={[4.2, 0.9, 1.9]} m={mat(color, { rough: 0.35, metal: 0.25 })} />
      <Box p={[-0.3, 1.38, 0]} s={[2.3, 0.7, 1.7]} m={mat('#2A2E30', { rough: 0.12, metal: 0.4 })} />
      <Glow p={[2.12, 0.65, 0.6]} s={[0.04, 0.18, 0.35]} color="#FFF1CF" intensity={3.5} />
      <Glow p={[2.12, 0.65, -0.6]} s={[0.04, 0.18, 0.35]} color="#FFF1CF" intensity={3.5} />
      <Glow p={[-2.12, 0.65, 0.65]} s={[0.04, 0.16, 0.3]} color="#FF5A3C" intensity={2.5} />
      <Glow p={[-2.12, 0.65, -0.65]} s={[0.04, 0.16, 0.3]} color="#FF5A3C" intensity={2.5} />
    </group>
  )
}

function Parking() {
  const P = BLOCKS.parking
  const cars = useMemo(() => {
    const out: { x: number; z: number; r: number; c: string }[] = []
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
      if (rnd(i * 5 + row) < 0.22) continue
      out.push({ x: P.x - 14 + i * 3.5, z: P.z + (row ? 5.5 : -5.5), r: Math.PI / 2, c: CAR_COLORS[(i + row * 3) % CAR_COLORS.length] })
    }
    return out
  }, [P])
  const bays = useMemo(() => [0, 1].flatMap(row => Array.from({ length: 10 }, (_, i) => ({ p: [P.x - 15.75 + i * 3.5, 0.075, P.z + (row ? 5.5 : -5.5)] as [number, number, number], s: [0.1, 0.01, 4.6] as [number, number, number] }))), [P])
  const loop: [number, number][] = useMemo(() => [[-170, ROAD_Z - 1.5], [P.x + 18, ROAD_Z - 1.5], [P.x + 18, P.z], [P.x - 2, P.z], [P.x - 20, P.z], [P.x - 20, ROAD_Z + 1.5], [-200, ROAD_Z + 1.5]], [P])
  return (
    <group>
      <Box p={[P.x, 0.03, P.z]} s={[40, 0.06, 20]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
      <Box p={[P.x + 18, 0.03, (P.z + ROAD_Z) / 2 + 2]} s={[6, 0.05, ROAD_Z - P.z - 6]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
      <Box p={[P.x - 20, 0.03, (P.z + ROAD_Z) / 2 + 2]} s={[6, 0.05, ROAD_Z - P.z - 6]} m={mat('#5A534B', { rough: 0.95 })} cast={false} />
      <BoxInstances items={bays} m={mat('#F3E6C8')} cast={false} />
      <Box p={[P.x, 0.08, P.z]} s={[30, 0.12, 0.5]} m={mat(C.ivory2)} cast={false} />
      <CarBodies cars={cars} />
      {[0, 0.33, 0.66].map((o, i) => <MovingCar key={i} path={loop} offset={o} color={CAR_COLORS[(i * 3 + 1) % CAR_COLORS.length]} />)}
      <BlockLabel id="gate" p={[P.x, 5, P.z]} title="Drop-off" sub={`${cars.length} cars parked`} tone="stone" />
    </group>
  )
}

function Gate({ x, open }: { x: number; open: boolean }) {
  const arm = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (arm.current) easing.damp(arm.current.rotation, 'z', open ? 1.35 : 0, 0.25, dt) })
  const z = BLOCKS.gate.z
  return (
    <group position={[x, 0, z]}>
      {[-4.2, 4.2].map(dx => (
        <group key={dx} position={[dx, 0, 0]}>
          <Box p={[0, 1.6, 0]} s={[0.9, 3.2, 0.9]} m={mat(C.concreteDark, { rough: 0.8 })} />
          <Box p={[0, 3.3, 0]} s={[1.1, 0.2, 1.1]} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />
          <Glow p={[0, 3.45, 0]} s={[0.5, 0.08, 0.5]} color={open ? '#7FE0B0' : '#FF6B52'} intensity={2.6} />
        </group>
      ))}
      {/* guard booth */}
      <group position={[-7.4, 0, 0]}>
        <Box p={[0, 1.3, 0]} s={[2.4, 2.6, 2.4]} m={mat(C.ivory2, { rough: 0.6 })} />
        <Box p={[0, 2.7, 0]} s={[2.9, 0.2, 2.9]} m={mat(C.forest, { rough: 0.6 })} />
        <Box p={[1.21, 1.6, 0]} s={[0.04, 1, 1.6]} m={mat('#2A2E30', { rough: 0.1, metal: 0.4 })} />
        <Figures items={[{ x: 0, y: 0.02, z: 1.6, body: C.slate, skin: SKIN[3], scale: 1.05 }]} />
      </group>
      {/* boom barrier */}
      <group ref={arm} position={[-3.8, 1.15, 0.7]}>
        <Box p={[3.6, 0, 0]} s={[7.2, 0.16, 0.16]} m={mat('#F5F1E6', { rough: 0.5 })} />
        {[1, 3, 5].map(k => <Box key={k} p={[k + 0.5, 0, 0]} s={[0.7, 0.17, 0.17]} m={mat(C.rust, { rough: 0.5 })} cast={false} />)}
      </group>
    </group>
  )
}

function Gates() {
  const buses = useSchool(s => s.buses)
  const minute = useCampusUi(s => s.minute)
  const order = useMemo(() => [...buses].sort((a, b) => a.stops[a.stops.length - 1].at.localeCompare(b.stops[b.stops.length - 1].at)), [buses])
  const poses = order.map((b, i) => busPose(b, BUS_SLOTS[i], minute))
  const inGate = poses.some(p => p.state === 'arriving')
  const outGate = poses.some(p => p.state === 'leaving')
  return (
    <>
      <Gate x={-36} open={inGate} />
      <Gate x={36} open={outGate} />
    </>
  )
}

/* ───────── flag, turbine ───────── */

function Flag() {
  const F = BLOCKS.flag
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(3, 1.8, 24, 12); g.translate(1.5, 0, 0); return g }, [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: C.forest, roughness: 0.8, side: THREE.DoubleSide }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1]
      pos.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.18 * (x / 3) + Math.sin(y * 3 + t * 2) * 0.03 * x)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <group position={[F.x, 0, F.z]}>
      <mesh position={[0, 0.2, 0]} material={mat(C.concreteDark)}><cylinderGeometry args={[0.8, 1, 0.4, 16]} /></mesh>
      <mesh position={[0, 5, 0]} castShadow material={mat('#E9E4DA', { rough: 0.3, metal: 0.6 })}><cylinderGeometry args={[0.07, 0.1, 10, 10]} /></mesh>
      <mesh position={[0.05, 8.9, 0]} geometry={geo} material={m} castShadow />
      <mesh position={[1.2, 8.9, 0.02]} material={mat(C.copperL)}><circleGeometry args={[0.38, 24]} /></mesh>
    </group>
  )
}

function Turbine() {
  const T = BLOCKS.turbine
  const rotor = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.z += dt * 0.9 })
  return (
    <group position={[T.x, 0, T.z]} rotation={[0, -0.6, 0]}>
      <mesh position={[0, 11, 0]} castShadow material={mat(C.ivory2, { rough: 0.4 })}><cylinderGeometry args={[0.35, 0.75, 22, 16]} /></mesh>
      <Box p={[0, 22.2, -0.4]} s={[1.1, 1.1, 2.6]} m={mat(C.ivory2, { rough: 0.4 })} />
      <group ref={rotor} position={[0, 22.2, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.copper, { rough: 0.4, metal: 0.5 })}><coneGeometry args={[0.5, 1, 16]} /></mesh>
        {[0, 1, 2].map(i => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <Box p={[0, 4.6, 0]} s={[0.55, 9, 0.12]} m={mat(C.ivory2, { rough: 0.35 })} />
          </group>
        ))}
      </group>
    </group>
  )
}

/* ───────── sky: clouds & birds ───────── */

function Clouds() {
  const quality = useCampusUi(s => s.quality)
  const groups = useRef<(THREE.Group | null)[]>([])
  const clouds = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    // a bank of clouds on the horizon behind the school, drifting slowly
    x: -220 + i * 60 + rnd(i) * 30, y: 34 + rnd(i * 3) * 22, z: -150 - rnd(i * 5) * 90, s: 1.6 + rnd(i * 7) * 1.2,
    puffs: Array.from({ length: 6 }, (_, k) => ({ x: (k - 2.5) * 3.2 + rnd(i * 10 + k) * 2, y: rnd(i * 20 + k) * 1.8, z: rnd(i * 30 + k) * 3 - 1.5, r: 2.6 + rnd(i * 40 + k) * 2.4 })),
  })), [])
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, transparent: true, opacity: 0.88, flatShading: true }), [])
  useFrame((_, dt) => {
    groups.current.forEach(g => {
      if (!g) return
      g.position.x += dt * 1.6
      if (g.position.x > 260) g.position.x = -260
    })
  })
  return (
    <>
      {clouds.map((c, i) => (
        <group key={i} ref={el => { groups.current[i] = el }} position={[c.x, c.y, c.z]} scale={c.s}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} material={m} castShadow={quality === 'high'}>
              <icosahedronGeometry args={[p.r, 1]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function Bird({ offset }: { offset: [number, number, number] }) {
  const l = useRef<THREE.Mesh>(null)
  const r = useRef<THREE.Mesh>(null)
  const phase = useMemo(() => rnd(offset[0] * 13 + offset[2]) * 6, [offset])
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 9 + phase) * 0.7
    if (l.current) l.current.rotation.x = f
    if (r.current) r.current.rotation.x = -f
  })
  const wing = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0, 0.0, -0.1, 0, 1.3], 3)); g.computeVertexNormals(); return g }, [])
  return (
    <group position={offset}>
      <mesh ref={l} geometry={wing}><meshStandardMaterial attach="material" color={C.charcoal} side={THREE.DoubleSide} /></mesh>
      <mesh ref={r} geometry={wing} scale={[1, 1, -1]}><meshStandardMaterial attach="material" color={C.charcoal} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

function Flock({ radius, height, speed, centre }: { radius: number; height: number; speed: number; centre: [number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const a = clock.elapsedTime * speed
    ref.current.position.set(centre[0] + Math.cos(a) * radius, height + Math.sin(a * 2) * 3, centre[1] + Math.sin(a) * radius * 0.6)
    ref.current.rotation.y = -a - Math.PI
  })
  const v: [number, number, number][] = [[0, 0, 0], [-1.6, 0.2, 1.4], [-1.6, -0.1, -1.4], [-3.2, 0.3, 2.8], [-3.2, 0, -2.8], [-4.8, 0.2, 4.1], [-4.8, -0.2, -4.1]]
  return <group ref={ref} scale={1.3}>{v.map((o, i) => <Bird key={i} offset={o} />)}</group>
}

/* ───────── covered walkways & the people on them ───────── */

const WALKS: { a: [number, number]; b: [number, number] }[] = [
  { a: [-11, -6.5], b: [-11, -31] }, // tower → auditorium
  { a: [-12.6, -2], b: [-31.6, -2] }, // tower → science block
  { a: [-11, -26], b: [-36, -26] }, // → junior wing playground
  { a: [8, -28], b: [27.5, -28] }, // garden → arena
  { a: [12.6, -2], b: [22.5, -2] }, // tower → field
]

function Walkways() {
  const minute = useCampusUi(s => s.minute)
  const people = useCampusUi(s => s.people)
  const roofs = useMemo(() => WALKS.map(w => {
    const cx = (w.a[0] + w.b[0]) / 2, cz = (w.a[1] + w.b[1]) / 2
    const horiz = w.a[1] === w.b[1]
    const len = Math.abs(horiz ? w.b[0] - w.a[0] : w.b[1] - w.a[1])
    return { p: [cx, 3.1, cz] as [number, number, number], s: (horiz ? [len, 0.18, 3.2] : [3.2, 0.18, len]) as [number, number, number] }
  }), [])
  const paths = useMemo(() => roofs.map(r => ({ p: [r.p[0], 0.05, r.p[2]] as [number, number, number], s: [r.s[0], 0.06, r.s[2]] as [number, number, number] })), [roofs])
  const posts = useMemo(() => WALKS.flatMap(w => {
    const horiz = w.a[1] === w.b[1]
    const len = Math.abs(horiz ? w.b[0] - w.a[0] : w.b[1] - w.a[1])
    const n = Math.floor(len / 4)
    return Array.from({ length: n + 1 }, (_, i) => {
      const k = i / Math.max(1, n)
      const x = w.a[0] + (w.b[0] - w.a[0]) * k, z = w.a[1] + (w.b[1] - w.a[1]) * k
      return [-1, 1].map(s => ({ p: [x + (horiz ? 0 : s * 1.45), 1.5, z + (horiz ? s * 1.45 : 0)] as [number, number, number], s: [0.12, 3, 0.12] as [number, number, number] }))
    }).flat()
  }), [])
  // busy at every bell, a trickle otherwise
  const bells = [480, 525, 570, 615, 630, 675, 720, 760, 805, 850]
  const busy = bells.some(b => Math.abs(minute - b) <= 3) || (minute >= 615 && minute < 630) || (minute >= 720 && minute < 760)
  const n = minute < 470 || minute > 865 ? 0 : busy ? 46 : 10
  const walkers = useMemo<Figure[]>(() => Array.from({ length: n }, (_, i) => ({ x: 0, y: 0.08, z: 0, body: i % 9 === 0 ? '#2F2A25' : KIDS[i % 4], skin: SKIN[i % 5], scale: i % 9 === 0 ? 1.05 : 0.94 })), [n])
  const move = (i: number, t: number, f: Figure): [number, number, number, number] => {
    const w = WALKS[i % WALKS.length]
    const sp = 0.035 + rnd(i * 3) * 0.03
    const ph = (t * sp + rnd(i * 7)) % 2
    const k = ph < 1 ? ph : 2 - ph
    const lane = (rnd(i * 11) - 0.5) * 2
    const horiz = w.a[1] === w.b[1]
    const x = w.a[0] + (w.b[0] - w.a[0]) * k + (horiz ? 0 : lane)
    const z = w.a[1] + (w.b[1] - w.a[1]) * k + (horiz ? lane : 0)
    const dir = Math.atan2(-(w.b[1] - w.a[1]), w.b[0] - w.a[0]) + (ph < 1 ? 0 : Math.PI)
    return [x, f.y + Math.abs(Math.sin(t * 7 + i)) * 0.05, z, dir - Math.PI / 2]
  }
  return (
    <group>
      <BoxInstances items={paths} m={mat('#EFE8DC', { rough: 0.9 })} cast={false} />
      <BoxInstances items={roofs} m={mat(C.ivory2, { rough: 0.5 })} />
      <BoxInstances items={posts} m={mat(C.copper, { rough: 0.4, metal: 0.5 })} />
      {people && walkers.length > 0 && <Figures items={walkers} move={move} />}
    </group>
  )
}

/** Busy-ness of the whole campus for the HUD. */
export function campusBusy(minute: number) {
  return [toMin('08:00'), toMin('08:45'), toMin('09:30')].some(b => Math.abs(minute - b) <= 3)
}

export function Ambient() {
  return (
    <group>
      <Garden />
      <Courts />
      <Parking />
      <Gates />
      <Flag />
      <Turbine />
      <Walkways />
      <Clouds />
      <Flock radius={70} height={42} speed={0.08} centre={[0, -10]} />
      <Flock radius={52} height={50} speed={-0.06} centre={[-30, -30]} />
    </group>
  )
}
