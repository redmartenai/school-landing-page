import { Edges, Html, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSchool } from '@/store/school'
import { freeTeachers, type ClassNow } from '@/engine/campus'
import { BoxInstances, Box, Glow, PulseRing, mat, glassDarkMat } from './parts'
import { Figures, hash, rnd, type Figure } from './Figures'
import { C, H, HOUSE_COLOR, ROOM_BACK, ROOM_FRONT, ROOM_W, SKIN, SLAB, STATUS_META, EDGE, type RoomDef } from './layout'
import { useCampus, useCampusUi } from './ui'

const HALF = ROOM_W / 2
const DEPTH = ROOM_FRONT - ROOM_BACK
const TEACHER_BODY = '#2F2A25'

const skinOf = (id: string) => SKIN[hash(id) % SKIN.length]

/** 6 × 6 seat grid facing the board on the back wall. */
const SEATS = Array.from({ length: 36 }, (_, i) => ({ x: -3.75 + (i % 6) * 1.5, z: -2.6 + Math.floor(i / 6) * 0.82 }))

function Desks({ n = 36 }: { n?: number }) {
  const tops = useMemo(() => SEATS.slice(0, n).map(s => ({ p: [s.x, 0.74, s.z - 0.12] as [number, number, number], s: [1.05, 0.05, 0.5] as [number, number, number] })), [n])
  const legs = useMemo(() => SEATS.slice(0, n).map(s => ({ p: [s.x, 0.37, s.z - 0.12] as [number, number, number], s: [0.9, 0.72, 0.06] as [number, number, number] })), [n])
  const chairs = useMemo(() => SEATS.slice(0, n).map(s => ({ p: [s.x, 0.24, s.z + 0.32] as [number, number, number], s: [0.42, 0.46, 0.4] as [number, number, number] })), [n])
  return (
    <>
      <BoxInstances items={tops} m={mat(C.oak, { rough: 0.55 })} />
      <BoxInstances items={legs} m={mat(C.charcoal2, { rough: 0.6, metal: 0.3 })} />
      <BoxInstances items={chairs} m={mat(C.slate, { rough: 0.7 })} />
    </>
  )
}

function Board({ color = C.board }: { color?: string }) {
  return (
    <group position={[0, 0, ROOM_BACK + 0.06]}>
      <Box p={[0, 1.75, 0.02]} s={[5, 1.6, 0.08]} m={mat(C.oakDark, { rough: 0.6 })} />
      <Box p={[0, 1.75, 0.07]} s={[4.7, 1.36, 0.04]} m={mat(color, { rough: 0.9 })} />
      {/* chalk lines */}
      {[0.35, 0.05, -0.25].map((y, i) => <Box key={i} p={[-0.6 + i * 0.3, 1.75 + y, 0.095]} s={[2.4 - i * 0.6, 0.035, 0.01]} m={mat('#E9EFE9', { rough: 1 })} cast={false} />)}
      <Box p={[0, 0.98, 0.12]} s={[4.7, 0.05, 0.14]} m={mat(C.oakDark)} />
    </group>
  )
}

function Ghost() {
  // The missing teacher: a translucent, breathing silhouette where they should be standing.
  const ref = useRef<THREE.Group>(null)
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(C.rust).multiplyScalar(1.6), transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }), [])
  useFrame(({ clock }) => { m.opacity = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3)) })
  return (
    <group ref={ref} position={[0, 0, -4.35]}>
      <mesh position={[0, 0.62, 0]} material={m} scale={1.12}><capsuleGeometry args={[0.19, 0.66, 6, 14]} /></mesh>
      <mesh position={[0, 1.42, 0]} material={m}><sphereGeometry args={[0.17, 16, 12]} /></mesh>
      <PulseRing color={C.rust} radius={0.85} strength={4} />
    </group>
  )
}

function TeacherRing({ color }: { color: string }) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.9 }), [color])
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -4.35]} material={m}><ringGeometry args={[0.42, 0.52, 40]} /></mesh>
}

/* ───────── per-kind interiors ───────── */

function Classroom({ now }: { now: ClassNow }) {
  const students = useSchool(s => s.students)
  // a class with no teacher stays in its own room — nobody has walked them to the lab or the field
  const stranded = now.status === 'uncovered' || now.status === 'teacher-late'
  const inRoom = (now.location === 'classroom' || stranded) && now.status !== 'break' && now.status !== 'before' && now.status !== 'after'
  const kids = useMemo<Figure[]>(() => {
    if (!inRoom) return []
    return now.presentIds.map((id, i) => {
      const st = students.find(s => s.id === id)!
      const seat = SEATS[i % 36]
      return { x: seat.x, y: 0.02, z: seat.z + 0.32, rot: Math.PI, body: HOUSE_COLOR[st.house], skin: skinOf(id), seated: true, scale: 0.92 }
    })
  }, [inRoom, now.presentIds, students])
  const teacher = useMemo<Figure[]>(() => (inRoom && now.teacherId ? [{ x: 0, y: 0.02, z: -4.35, body: TEACHER_BODY, skin: skinOf(now.teacherId), scale: 1.08 }] : []), [inRoom, now.teacherId])
  // teacher paces gently in front of the board
  const pace = (_i: number, t: number, f: Figure): [number, number, number, number] => [Math.sin(t * 0.35 + hash(now.classId)) * 1.6, f.y, f.z, Math.cos(t * 0.35) * 0.4]

  return (
    <>
      <Board />
      <Box p={[3.2, 0.42, -4.2]} s={[1.6, 0.84, 0.7]} m={mat(C.oakDark, { rough: 0.6 })} />
      <Desks />
      {kids.length > 0 && <Figures items={kids} />}
      {teacher.length > 0 && (
        <>
          <Figures items={teacher} move={pace} />
          <TeacherRing color={now.status === 'substitute' ? C.copper : C.forestL} />
        </>
      )}
      {(now.status === 'uncovered' || now.status === 'teacher-late') && <Ghost />}
    </>
  )
}

function Library() {
  const campus = useCampus()
  const students = useSchool(s => s.students)
  const books = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string }[] = []
    const palette = [C.forest, C.copper, C.slate, C.amber, C.rust, C.ivory, C.oakDark]
    for (let shelf = 0; shelf < 4; shelf++) for (let b = 0; b < 34; b++) {
      const h = 0.32 + rnd(shelf * 50 + b) * 0.12
      out.push({ p: [-4.3 + b * 0.255, 0.42 + shelf * 0.55 + h / 2, ROOM_BACK + 0.32], s: [0.2, h, 0.34], c: palette[Math.floor(rnd(b * 7 + shelf) * palette.length)] })
    }
    return out
  }, [])
  const readers = useMemo<Figure[]>(() => {
    const here = campus.filter(c => c.location === 'library' && c.status === 'library' || c.location === 'library' && c.status === 'substitute')
    return here.flatMap(c => c.presentIds).slice(0, 30).map((id, i) => {
      const st = students.find(s => s.id === id)!
      const table = i % 3, seat = Math.floor(i / 3)
      return { x: -3.3 + table * 3.3 + (seat % 2 ? 0.55 : -0.55), y: 0.02, z: -1.6 + Math.floor(seat / 2) * 0.75, rot: seat % 2 ? -Math.PI / 2 : Math.PI / 2, body: HOUSE_COLOR[st.house], skin: skinOf(id), seated: true, scale: 0.92 }
    })
  }, [campus, students])
  const tables = useMemo(() => [0, 1, 2].map(t => ({ p: [-3.3 + t * 3.3, 0.74, 0.2] as [number, number, number], s: [1.1, 0.06, 4.4] as [number, number, number] })), [])
  return (
    <>
      <Box p={[0, 1.4, ROOM_BACK + 0.32]} s={[ROOM_W - 0.6, 2.6, 0.4]} m={mat(C.oakDark, { rough: 0.7 })} />
      <BoxInstances items={books} m={mat('#ffffff', { rough: 0.8 })} />
      <BoxInstances items={tables} m={mat(C.oak, { rough: 0.5 })} />
      {readers.length > 0 && <Figures items={readers} />}
      <Figures items={[{ x: 3.6, y: 0.02, z: 1.2, body: TEACHER_BODY, skin: SKIN[1], scale: 1.05 }]} />
    </>
  )
}

function Lab() {
  const campus = useCampus()
  const students = useSchool(s => s.students)
  const here = campus.filter(c => c.location === 'lab' && (c.status === 'lab' || c.status === 'substitute'))
  const desks = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ p: [-3.6 + (i % 6) * 1.45, 0.74, -2.6 + Math.floor(i / 6) * 1.6] as [number, number, number], s: [1.2, 0.06, 0.62] as [number, number, number] })), [])
  const screens = useMemo(() => desks.map(d => ({ p: [d.p[0], 1.08, d.p[2] - 0.18] as [number, number, number], s: [0.62, 0.4, 0.04] as [number, number, number] })), [desks])
  const kids = useMemo<Figure[]>(() => here.flatMap(c => c.presentIds).slice(0, 34).map((id, i) => {
    const st = students.find(s => s.id === id)!
    const d = desks[i % 18]
    return { x: d.p[0] + (i >= 18 ? 0.35 : -0.3), y: 0.02, z: d.p[2] + 0.55, rot: Math.PI, body: HOUSE_COLOR[st.house], skin: skinOf(id), seated: true, scale: 0.92 }
  }), [here, students, desks])
  const teacher = here.find(c => c.teacherId)
  return (
    <>
      <BoxInstances items={desks} m={mat('#E9E4DA', { rough: 0.4 })} />
      <BoxInstances items={screens} m={mat('#1E2427', { rough: 0.3, emissive: '#9CC3D5', ei: here.length ? 0.9 : 0.15 })} cast={false} />
      <Board color="#1F2B31" />
      {kids.length > 0 && <Figures items={kids} />}
      {teacher && <Figures items={[{ x: 0, y: 0.02, z: -4.35, body: TEACHER_BODY, skin: skinOf(teacher.teacherId!), scale: 1.08 }]} />}
    </>
  )
}

function StaffRoom() {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  const free = useMemo(() => freeTeachers(d, minute), [d, minute])
  const people = useMemo<Figure[]>(() => free.slice(0, 12).map((t, i) => ({
    x: -3 + (i % 4) * 2, y: 0.02, z: -2.2 + Math.floor(i / 4) * 1.6, rot: rnd(i) * 6, body: TEACHER_BODY, skin: skinOf(t.id), seated: i % 3 !== 0, scale: 1.05,
  })), [free])
  const tables = useMemo(() => [0, 1, 2].map(i => ({ p: [-3 + i * 3, 0.72, -1.4] as [number, number, number], s: [1.6, 0.06, 1.6] as [number, number, number] })), [])
  return (
    <>
      <BoxInstances items={tables} m={mat(C.oak, { rough: 0.5 })} />
      <Box p={[0, 0.4, ROOM_BACK + 0.6]} s={[6, 0.8, 0.9]} m={mat(C.forest, { rough: 0.9 })} />
      <Box p={[3.9, 1, ROOM_BACK + 0.4]} s={[1.2, 2, 0.6]} m={mat(C.stoneL)} />
      {people.length > 0 && <Figures items={people} />}
    </>
  )
}

function Cafeteria({ busy }: { busy: boolean }) {
  const tables = useMemo(() => [0, 1, 2, 3].map(i => ({ p: [-3.6 + i * 2.4, 0.72, -1.2] as [number, number, number], s: [1, 0.06, 4.6] as [number, number, number] })), [])
  const crowd = useMemo<Figure[]>(() => (busy ? Array.from({ length: 36 }, (_, i) => {
    const t = i % 4, k = Math.floor(i / 4)
    return { x: -3.6 + t * 2.4 + (k % 2 ? 0.5 : -0.5), y: 0.02, z: -3.1 + Math.floor(k / 2) * 0.95, rot: k % 2 ? -Math.PI / 2 : Math.PI / 2, body: Object.values(HOUSE_COLOR)[i % 4], skin: SKIN[i % 5], seated: true, scale: 0.92 }
  }) : []), [busy])
  return (
    <>
      <BoxInstances items={tables} m={mat(C.oak, { rough: 0.5 })} />
      <Box p={[0, 0.55, ROOM_BACK + 0.5]} s={[7.5, 1.1, 0.8]} m={mat(C.ivory2, { rough: 0.4 })} />
      <Box p={[0, 1.12, ROOM_BACK + 0.5]} s={[7.5, 0.05, 0.86]} m={mat(C.copper, { rough: 0.35, metal: 0.4 })} />
      {/* reception desk by the entrance */}
      <Box p={[3.4, 0.55, 1.4]} s={[2.4, 1.1, 0.7]} m={mat(C.forest, { rough: 0.6 })} />
      <Figures items={[{ x: 3.4, y: 0.02, z: 0.7, body: C.slate, skin: SKIN[2], scale: 1.05 }, ...crowd]} />
    </>
  )
}

function PrincipalOffice() {
  return (
    <>
      <Box p={[0, 0.4, -2.4]} s={[3, 0.8, 1.3]} m={mat(C.oakDark, { rough: 0.45 })} />
      <Box p={[0, 0.82, -2.4]} s={[3.1, 0.05, 1.4]} m={mat(C.ink, { rough: 0.3 })} />
      <Box p={[0, 1.4, ROOM_BACK + 0.25]} s={[7, 2.4, 0.4]} m={mat(C.forest, { rough: 0.85 })} />
      <Box p={[-3.6, 0.45, 0.6]} s={[2.2, 0.9, 0.9]} m={mat(C.copperP)} />
      <mesh position={[3.8, 0.7, 0.8]} castShadow material={mat('#6E8B6A', { rough: 0.9 })}><icosahedronGeometry args={[0.6, 1]} /></mesh>
      <Figures items={[{ x: 0, y: 0.02, z: -3.3, body: C.forest, skin: SKIN[1], seated: true, scale: 1.05 }]} />
    </>
  )
}

function Conference() {
  return (
    <>
      <mesh position={[0, 0.74, -1.4]} scale={[1, 1, 0.5]} castShadow receiveShadow material={mat(C.oak, { rough: 0.45 })}>
        <cylinderGeometry args={[3, 3, 0.07, 48]} />
      </mesh>
      <Box p={[0, 1.6, ROOM_BACK + 0.08]} s={[3.6, 2, 0.06]} m={glassDarkMat} />
    </>
  )
}

/* ───────── the room shell + interaction ───────── */

export function Room({ def, now }: { def: RoomDef; now?: ClassNow }) {
  const selected = useCampusUi(s => s.selected === def.id)
  const select = useCampusUi(s => s.select)
  const set = useCampusUi(s => s.set)
  const labels = useCampusUi(s => s.labels && !(s.selected === def.id) && (s.focusFloor === null || s.focusFloor === def.level))
  const peopleOn = useCampusUi(s => s.people)
  const minute = useCampusUi(s => s.minute)
  const campus = useCampus()
  const [hover, setHover] = useState(false)
  useCursor(hover)

  const meta = now ? STATUS_META[now.status] : null
  const glow = meta?.glow ?? '#F6E7CE'
  const alarm = !!meta?.alarm
  const isBreak = minute >= 10 * 60 + 15 && minute < 10 * 60 + 30 || minute >= 12 * 60 && minute < 12 * 60 + 40
  const staffCount = useSchool(s => (def.kind === 'staff' ? freeTeachers(s, minute).length : 0))

  const chip = now
    ? { title: def.id, sub: `${now.slot?.subject && !['Break', 'Lunch'].includes(now.slot.subject) ? now.slot.subject : meta!.label}`, tone: meta!.tone, alarm, reg: !now.registerMarked }
    : def.kind === 'library' ? { title: 'Library', sub: `${campus.filter(c => c.location === 'library' && c.status !== 'break').map(c => c.classId).join(', ') || 'Quiet'}`, tone: 'slate' as const, alarm: false, reg: false }
    : def.kind === 'lab' ? { title: 'Lab', sub: `${campus.filter(c => c.location === 'lab' && c.status !== 'break').map(c => c.classId).join(', ') || 'Empty'}`, tone: 'slate' as const, alarm: false, reg: false }
    : def.kind === 'staff' ? { title: 'Staff room', sub: `${staffCount} free`, tone: 'stone' as const, alarm: false, reg: false }
    : def.kind === 'principal' ? { title: 'You', sub: 'Principal’s office', tone: 'forest' as const, alarm: false, reg: false }
    : def.kind === 'cafeteria' ? { title: 'Cafeteria', sub: isBreak ? 'Busy' : 'Reception', tone: 'stone' as const, alarm: false, reg: false }
    : { title: 'Conference', sub: 'Free', tone: 'stone' as const, alarm: false, reg: false }

  return (
    <group>
      {/* floor finish */}
      <Box p={[0, 0.01, (ROOM_BACK + ROOM_FRONT) / 2]} s={[ROOM_W - 0.1, 0.02, DEPTH - 0.05]} m={mat(def.kind === 'class' ? '#E2D3B8' : def.kind === 'library' ? '#D6C3A2' : '#E6DED0', { rough: 0.7 })} cast={false} />
      {/* status line along the glass */}
      <Glow p={[0, 0.03, ROOM_FRONT - 0.12]} s={[ROOM_W - 0.4, 0.03, 0.06]} color={now ? meta!.color : C.stoneL} intensity={now ? 2.4 : 0.9} pulse={alarm} />
      {/* ceiling light in the status colour */}
      <Glow p={[0, H - SLAB - 0.1, -1.6]} s={[ROOM_W - 2.6, 0.05, 2.6]} color={glow} intensity={alarm ? 1.6 : 1.1} pulse={alarm} />
      {alarm && <pointLight position={[0, H - 1, -1]} color={C.rust} intensity={6} distance={9} decay={1.6} />}

      {peopleOn && (
        <>
          {def.kind === 'class' && now && <Classroom now={now} />}
          {def.kind === 'library' && <Library />}
          {def.kind === 'lab' && <Lab />}
          {def.kind === 'staff' && <StaffRoom />}
          {def.kind === 'cafeteria' && <Cafeteria busy={isBreak} />}
          {def.kind === 'principal' && <PrincipalOffice />}
          {def.kind === 'conference' && <Conference />}
        </>
      )}
      {!peopleOn && def.kind === 'class' && <><Board /><Desks /></>}

      {/* alarm ring out in the corridor so it's visible from anywhere */}
      {alarm && <group position={[0, 0.02, (ROOM_FRONT + EDGE) / 2]}><PulseRing color={C.rust} radius={1.4} strength={4} speed={1.4} /></group>}

      {/* interaction volume */}
      <mesh position={[0, H / 2 - 0.1, (ROOM_BACK + ROOM_FRONT) / 2]}
        onPointerOver={e => { e.stopPropagation(); setHover(true); set({ hovered: def.id }) }}
        onPointerOut={() => { setHover(false); set({ hovered: null }) }}
        onClick={e => { e.stopPropagation(); select(def.id); set({ focusFloor: def.level }) }}>
        <boxGeometry args={[ROOM_W - 0.2, H - SLAB - 0.2, DEPTH - 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {(selected || hover) && <Edges color={selected ? '#F2B36B' : '#FFFFFF'} lineWidth={selected ? 2.5 : 1.2} />}
      </mesh>

      {/* labels stay mounted and are hidden with CSS — drei's Html roots don't like being torn down */}
      {(
        <Html position={[0, H - 0.75, EDGE + 0.4]} center distanceFactor={26} zIndexRange={[30, 0]} style={{ pointerEvents: labels ? 'auto' : 'none', display: labels ? 'block' : 'none' }}>
          <button onClick={() => { select(def.id); set({ focusFloor: def.level }) }}
            className={`campus-chip campus-chip--${chip.tone} ${chip.alarm ? 'is-alarm' : ''} ${selected ? 'is-selected' : ''}`}>
            <span className="campus-chip__title">{chip.title}</span>
            <span className="campus-chip__sub">{chip.sub}</span>
            {chip.reg && now?.status !== 'before' && now?.status !== 'after' && <span className="campus-chip__reg" title="Register not taken" />}
          </button>
        </Html>
      )}
    </group>
  )
}

export const ROOM_HALF = HALF
