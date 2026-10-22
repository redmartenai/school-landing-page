import { toMin } from '@/engine/campus'
import type { Bus as BusT } from '@/data/types'
import { BAY_Z, BUS_SLOTS, ROAD_Z } from './layout'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Where a bus should be at `minute`: off-site, on the road, turning in, parked, or leaving. */
export function busPose(bus: BusT, slotX: number, minute: number): { x: number; z: number; rot: number; moving: boolean; state: 'away' | 'arriving' | 'parked' | 'leaving' } {
  const arrive = toMin(bus.stops[bus.stops.length - 1].at) + bus.delayMin
  const depart = 14 * 60 + 18 + (BUS_SLOTS.indexOf(slotX) * 1)
  const entryX = -36
  if (minute < arrive - 4) return { x: -150, z: ROAD_Z + 1.4, rot: 0, moving: true, state: 'away' }
  if (minute < arrive) {
    const p = (minute - (arrive - 4)) / 4
    if (p < 0.6) return { x: lerp(-150, entryX, p / 0.6), z: ROAD_Z + 1.4, rot: 0, moving: true, state: 'arriving' }
    const q = (p - 0.6) / 0.4
    return { x: lerp(entryX, slotX, q), z: lerp(ROAD_Z + 1.4, BAY_Z, Math.min(1, q * 1.6)), rot: 0, moving: true, state: 'arriving' }
  }
  if (minute < depart) return { x: slotX, z: BAY_Z, rot: 0, moving: false, state: 'parked' }
  const p = Math.min(1, (minute - depart) / 5)
  return { x: lerp(slotX, 160, p), z: lerp(BAY_Z, ROAD_Z - 1.4, Math.min(1, p * 3)), rot: 0, moving: p < 1, state: 'leaving' }
}

