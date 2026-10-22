/**
 * Parent-app session state that should survive tab switches:
 * which child is selected, which threads have been read, and PTM bookings.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Student, Thread } from '@/data/types'
import { useParentScope } from './data'

export interface PtmBooking { childId: string; staffId: string; slot: string }

interface ParentCtx {
  childId: string
  setChildId: (id: string) => void
  seen: Record<string, number>
  markSeen: (threadId: string, count: number) => void
  bookings: Record<string, PtmBooking>
  book: (b: PtmBooking) => void
  cancelBooking: (childId: string) => void
}

const Ctx = createContext<ParentCtx | null>(null)

export function ParentProvider({ children }: { children: ReactNode }) {
  const { childIds } = useParentScope()
  const [childId, setChild] = useState(childIds[0])
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [bookings, setBookings] = useState<Record<string, PtmBooking>>({})

  // Scope guard: only ever select one of this parent's own children.
  const setChildId = useCallback((id: string) => { if (childIds.includes(id)) setChild(id) }, [childIds])
  const markSeen = useCallback((threadId: string, count: number) => setSeen(s => (s[threadId] === count ? s : { ...s, [threadId]: count })), [])
  const book = useCallback((b: PtmBooking) => setBookings(s => ({ ...s, [b.childId]: b })), [])
  const cancelBooking = useCallback((cid: string) => setBookings(s => { const n = { ...s }; delete n[cid]; return n }), [])

  const value = useMemo(
    () => ({ childId: childIds.includes(childId) ? childId : childIds[0], setChildId, seen, markSeen, bookings, book, cancelBooking }),
    [childId, childIds, setChildId, seen, markSeen, bookings, book, cancelBooking],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useParentCtx() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useParentCtx must be used inside <ParentProvider>')
  return c
}

/** The currently selected child (always one of the parent's own). */
export function useChild(): Student {
  const { children } = useParentScope()
  const { childId } = useParentCtx()
  return children.find(c => c.id === childId) ?? children[0]
}

/** Unread = teacher messages the parent hasn't opened yet. */
export function unreadCount(t: Thread, seen: Record<string, number>, parentId: string) {
  const from = seen[t.id]
  if (from !== undefined) return t.messages.slice(from).filter(m => m.from !== parentId).length
  let n = 0
  for (let i = t.messages.length - 1; i >= 0 && t.messages[i].from !== parentId; i--) n++
  return n
}
