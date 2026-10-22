import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { easing } from 'maath'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Tower } from './Tower'
import { Grounds } from './Grounds'
import { Arena, Auditorium, JuniorWing, ScienceBlock } from './Blocks'
import { Ambient } from './Ambient'
import { BAY_Z, EDGE, H, LIFT_GAP, PLACES, ROOMS, roomX } from './layout'
import { useCampusUi } from './ui'

const HOME = PLACES.campus.cam

/** Flies the camera to whatever the principal is looking at. */
function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const selected = useCampusUi(s => s.selected)
  const focusFloor = useCampusUi(s => s.focusFloor)
  const focusField = useCampusUi(s => s.focusField)
  const focusPlace = useCampusUi(s => s.focusPlace)
  const intro = useRef(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (intro.current) {
      // opening shot: start high and wide, settle onto the tower
      c.setLookAt(260, 210, 300, 0, 8, -10, false)
      c.setLookAt(...HOME, true)
      intro.current = false
      return
    }
    const place = focusPlace ?? (focusField ? 'field' : selected?.startsWith('place:') ? selected.slice(6) : null)
    if (place && PLACES[place]) { c.setLookAt(...PLACES[place].cam, true); return }
    if (selected?.startsWith('bus:')) { c.setLookAt(-6, 12, BAY_Z + 30, 0, 1.5, BAY_Z, true); return }
    const room = ROOMS.find(r => r.id === selected)
    if (room) {
      const x = roomX(room.side), y = room.level * H
      c.setLookAt(x * 0.5 + 6, y + 11, EDGE + 30, x, y + 1.3, -1.2, true)
      return
    }
    if (focusFloor !== null) {
      const y = focusFloor * H
      c.setLookAt(16, y + 17, EDGE + 38, -2, y + 1, -1, true)
      return
    }
    c.setLookAt(...HOME, true)
  }, [selected, focusFloor, focusField, focusPlace])

  return (
    <CameraControls ref={ref} makeDefault minDistance={6} maxDistance={320} maxPolarAngle={Math.PI / 2.08} minPolarAngle={0.12} smoothTime={0.55} draggingSmoothTime={0.12} />
  )
}

/** The sun follows the school day: low and warm at 07:30, high at noon, golden by 14:30. */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null)
  const minute = useCampusUi(s => s.minute)
  const quality = useCampusUi(s => s.quality)
  const k = THREE.MathUtils.clamp((minute - 7 * 60) / (8 * 60), 0, 1) // 07:00 → 15:00
  const az = THREE.MathUtils.lerp(-1.1, 1.3, k)
  const el = Math.sin(k * Math.PI) * 0.9 + 0.35
  const target = new THREE.Vector3(Math.sin(az) * 130, Math.sin(el) * 140 + 30, Math.cos(az) * 100 + 30)
  const warm = new THREE.Color('#FFD7A8').lerp(new THREE.Color('#FFF4E2'), Math.sin(k * Math.PI))
  useFrame((_, dt) => {
    if (!light.current) return
    easing.damp3(light.current.position, target, 0.6, dt)
    easing.dampC(light.current.color, warm, 0.6, dt)
  })
  return (
    <directionalLight ref={light} position={[60, 80, 60]} intensity={3.4} castShadow={quality === 'high'}
      shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.03}
      shadow-camera-left={-140} shadow-camera-right={140} shadow-camera-top={140} shadow-camera-bottom={-140} shadow-camera-near={10} shadow-camera-far={420} />
  )
}

function Effects() {
  const quality = useCampusUi(s => s.quality)
  if (quality === 'fast') return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes aoRadius={2.2} distanceFalloff={1.2} intensity={2.6} color="#241F1B" quality="medium" />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  )
}

export default function CampusScene({ eventSource }: { eventSource?: React.RefObject<HTMLElement> }) {
  const set = useCampusUi(s => s.set)
  return (
    <Canvas eventSource={eventSource} shadows dpr={[1, 1.75]} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
      camera={{ position: [140, 120, 170], fov: 30, near: 0.5, far: 900 }}
      onPointerMissed={() => set({ selected: null, focusFloor: null, focusField: false, focusPlace: null })}>
      <color attach="background" args={['#E6DDCD']} />
      <fog attach="fog" args={['#E6DDCD', 220, 560]} />
      <hemisphereLight args={['#FBF1E2', '#A8977A', 0.5]} />
      <Sun />
      <Suspense fallback={null}>
        {/* studio lighting baked into an environment map — no network fetch */}
        <Environment resolution={256} frames={1} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={2.2} color="#FFF3DF" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[40, 20, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#FFE2BD" position={[-20, 4, 10]} rotation-y={Math.PI / 2} scale={[30, 6, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#DDE9EE" position={[20, 6, -10]} rotation-y={-Math.PI / 2} scale={[30, 8, 1]} />
          <Lightformer form="ring" intensity={1.4} color="#FFFFFF" position={[0, 6, 18]} scale={6} />
        </Environment>
      </Suspense>
      {/* the building never sits inside a boundary that can suspend, so its DOM labels stay mounted */}
      <Tower />
      <Grounds />
      <ScienceBlock />
      <JuniorWing />
      <Arena />
      <Auditorium />
      <Ambient />
      <Suspense fallback={null}>
        <Effects />
      </Suspense>
      <CameraRig />
    </Canvas>
  )
}

export { LIFT_GAP }
