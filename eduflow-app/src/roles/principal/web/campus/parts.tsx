/* Small building blocks shared by the tower, rooms and grounds. */
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

const cache = new Map<string, THREE.MeshStandardMaterial>()
/** Shared standard materials keyed by colour + options (hundreds of meshes, a handful of materials). */
export function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; ei?: number; opacity?: number } = {}) {
  const key = `${color}|${o.rough ?? 0.8}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.ei ?? 0}|${o.opacity ?? 1}`
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0,
      ...(o.emissive ? { emissive: new THREE.Color(o.emissive), emissiveIntensity: o.ei ?? 1 } : {}),
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, depthWrite: (o.opacity ?? 1) >= 1,
    })
    cache.set(key, m)
  }
  return m
}

export const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#DCEBEE', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, reflectivity: 0.6, clearcoat: 1,
})
export const glassDarkMat = new THREE.MeshPhysicalMaterial({ color: '#2B3236', roughness: 0.15, metalness: 0.3, clearcoat: 1 })

export function Box({ p, s, m, cast = true, receive = true, children, rot }: {
  p: [number, number, number]; s: [number, number, number]; m: THREE.Material; cast?: boolean; receive?: boolean; children?: ReactNode; rot?: [number, number, number]
}) {
  return (
    <mesh position={p} rotation={rot} material={m} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={s} />
      {children}
    </mesh>
  )
}

/** Instanced boxes — used for desks, books, steps, solar panels. */
export function BoxInstances({ items, m, cast = true }: { items: { p: [number, number, number]; s: [number, number, number]; c?: string; r?: number }[]; m: THREE.Material; cast?: boolean }) {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => (items.some(i => i.c) ? (() => { const x = (m as THREE.MeshStandardMaterial).clone(); x.color.set('#ffffff'); return x })() : m), [m, items])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(0, it.r ?? 0, 0)
      o.scale.set(...it.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (it.c) mesh.setColorAt(i, c.set(it.c))
    })
    mesh.count = items.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh key={items.length} ref={ref} args={[geo, material, Math.max(1, items.length)]} castShadow={cast} receiveShadow />
}

/** A breathing emissive ring — used for "no teacher" alarms and selection. */
export function PulseRing({ color, radius = 0.7, y = 0.03, speed = 2.2, strength = 3 }: { color: string; radius?: number; y?: number; speed?: number; strength?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), transparent: true, toneMapped: false, depthWrite: false }), [color, strength])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const k = (clock.elapsedTime * speed) % 1
    ref.current.scale.setScalar(0.6 + k * 1.1)
    m.opacity = (1 - k) * 0.9
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={m}>
      <ringGeometry args={[radius * 0.82, radius, 48]} />
    </mesh>
  )
}

/** Emissive panel whose glow can pulse (status lights, beacons). */
export function Glow({ p, s, color, intensity = 2, pulse = false }: { p: [number, number, number]; s: [number, number, number]; color: string; intensity?: number; pulse?: boolean }) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }), [color, intensity])
  useFrame(({ clock }) => {
    if (!pulse) return
    const k = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 4)
    m.color.set(color).multiplyScalar(intensity * (0.4 + k))
  })
  return (
    <mesh position={p} material={m}>
      <boxGeometry args={s} />
    </mesh>
  )
}
