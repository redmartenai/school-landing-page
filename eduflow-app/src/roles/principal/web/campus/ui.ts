import { create } from 'zustand'
import { useMemo } from 'react'
import { useSchool } from '@/store/school'
import { campusAt, toMin } from '@/engine/campus'
import { demoNow } from '@/lib/format'

/** View state of the 3D campus — shared between the DOM HUD and the WebGL scene. */
interface CampusUi {
  minute: number
  live: boolean
  playing: boolean
  selected: string | null // room id
  focusFloor: number | null
  focusField: boolean
  /** camera shot from PLACES, e.g. 'science' */
  focusPlace: string | null
  labels: boolean
  people: boolean
  quality: 'high' | 'fast'
  hovered: string | null
  set: (p: Partial<CampusUi>) => void
  select: (id: string | null) => void
}

export const useCampusUi = create<CampusUi>(set => ({
  minute: toMin(demoNow().slice(11, 16)),
  live: true,
  playing: false,
  selected: null,
  focusFloor: null,
  focusField: false,
  focusPlace: null,
  labels: true,
  people: true,
  quality: 'high',
  hovered: null,
  set: p => set(p),
  select: id => set({ selected: id, focusField: false, focusPlace: null }),
}))

/** Campus state at the scrubbed minute. */
export function useCampus() {
  const d = useSchool()
  const minute = useCampusUi(s => s.minute)
  return useMemo(() => campusAt(d, minute), [d, minute])
}
