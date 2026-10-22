import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/** One person. Students wear their house colour; teachers wear ink with a coloured lanyard ring under them. */
export interface Figure {
  x: number; y: number; z: number
  rot?: number
  body: string
  skin: string
  seated?: boolean
  scale?: number
}

/** Returns [x, y, z, rotation] for figure i at time t (seconds). */
export type Mover = (i: number, t: number, f: Figure) => [number, number, number, number]

const bodyGeo = new THREE.CapsuleGeometry(0.19, 0.66, 6, 14)
const headGeo = new THREE.SphereGeometry(0.155, 18, 14)
const tmp = new THREE.Object3D()
const col = new THREE.Color()

/**
 * Instanced crowd: two draw calls for any number of people.
 * Pass `move` to animate (walkers, players); otherwise matrices are set once.
 */
export function Figures({ items, move, castShadow = true }: { items: Figure[]; move?: Mover; castShadow?: boolean }) {
  const bodies = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const count = Math.max(1, items.length)
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }), [])
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.55 }), [])

  const place = (i: number, f: Figure, x: number, y: number, z: number, rot: number) => {
    const s = f.scale ?? 1
    const sy = f.seated ? 0.62 : 1
    // body
    tmp.position.set(x, y + (f.seated ? 0.5 : 0.55) * s, z)
    tmp.rotation.set(0, rot, 0)
    tmp.scale.set(s, s * sy, s)
    tmp.updateMatrix()
    bodies.current!.setMatrixAt(i, tmp.matrix)
    // head
    tmp.position.set(x, y + (f.seated ? 1.02 : 1.27) * s, z)
    tmp.scale.setScalar(s)
    tmp.updateMatrix()
    heads.current!.setMatrixAt(i, tmp.matrix)
  }

  useLayoutEffect(() => {
    if (!bodies.current || !heads.current) return
    items.forEach((f, i) => {
      place(i, f, f.x, f.y, f.z, f.rot ?? 0)
      bodies.current!.setColorAt(i, col.set(f.body))
      heads.current!.setColorAt(i, col.set(f.skin))
    })
    bodies.current.count = items.length
    heads.current.count = items.length
    bodies.current.instanceMatrix.needsUpdate = true
    heads.current.instanceMatrix.needsUpdate = true
    if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true
    bodies.current.computeBoundingSphere()
    heads.current.computeBoundingSphere()
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    if (!move || !bodies.current || !heads.current) return
    const t = clock.elapsedTime
    for (let i = 0; i < items.length; i++) {
      const [x, y, z, r] = move(i, t, items[i])
      place(i, items[i], x, y, z, r)
    }
    bodies.current.instanceMatrix.needsUpdate = true
    heads.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh key={`b${count}`} ref={bodies} args={[bodyGeo, bodyMat, count]} castShadow={castShadow} frustumCulled={false} />
      <instancedMesh key={`h${count}`} ref={heads} args={[headGeo, headMat, count]} castShadow={castShadow} frustumCulled={false} />
    </group>
  )
}

/* ───────── deterministic helpers ───────── */

export const hash = (s: string) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 2166136261)
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
