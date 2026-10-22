import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Check, CircleCheck, X } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Pill, ease, softSpring, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import type { SchoolData } from '@/store/school'
import type { Approval } from '@/data/types'
import { time } from '@/lib/format'
import { ApprovalBody, KIND_LABEL, hoursWaiting } from '@/roles/_shared/approvals'

const THRESHOLD = 110
type Dir = 1 | -1

export function ApprovalsTab() {
  const d = useData()
  const now = useNow()
  const toast = useToast()
  const [dir, setDir] = useState<Dir>(1)
  // oldest first: whoever has waited longest is decided first
  const pending = d.approvals.filter(a => a.status === 'pending').sort((a, b) => a.at.localeCompare(b.at))
  const today = now.slice(0, 10)
  const decidedToday = d.approvals.filter(a => a.status !== 'pending' && a.decidedBy === DEMO.principalId && a.decidedAt?.startsWith(today))
    .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const longest = pending[0] ? hoursWaiting(pending[0], now) : 0

  const decide = (a: Approval, direction: Dir) => {
    setDir(direction)
    d.decideApproval(a.id, direction === 1 ? 'approved' : 'rejected', DEMO.principalId)
    const who = d.staff.find(s => s.id === a.requestedBy)?.name ?? 'the requester'
    toast(direction === 1 ? `Approved · ${who} has been told` : `Declined · ${who} has been told`, direction === 1 ? 'forest' : 'rust')
  }

  return (
    <MobileScreen eyebrow={pending.length ? `${pending.length} waiting · longest ${longest} h` : 'Approvals'} title={pending.length ? 'Decide' : 'Inbox zero'}>
      {pending.length > 0 ? (
        <>
          <p className="px-1 text-[13.5px] text-stone">Swipe right to approve, left to decline. Or use the buttons.</p>
          <div className="relative mt-4 h-[430px]">
            <AnimatePresence custom={dir}>
              {pending.slice(0, 3).reverse().map(a => {
                const depth = pending.indexOf(a)
                return <SwipeCard key={a.id} d={d} approval={a} now={now} depth={depth} onDecide={dir => decide(a, dir)} />
              })}
            </AnimatePresence>
          </div>
          <div className="mt-5 flex items-center justify-center gap-6">
            <RoundButton label="Decline" onClick={() => decide(pending[0], -1)} className="border-rust/25 bg-rust-p text-rust"><X size={26} strokeWidth={2.4} /></RoundButton>
            <span className="tabular text-[13px] text-stone">1 of {pending.length}</span>
            <RoundButton label="Approve" onClick={() => decide(pending[0], 1)} className="border-forest bg-forest text-ivory"><Check size={26} strokeWidth={2.4} /></RoundButton>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }}
          className="mt-2 flex flex-col items-center rounded-[20px] border border-forest/15 bg-forest-p px-6 py-10 text-center">
          <motion.span initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={softSpring}
            className="grid h-16 w-16 place-items-center rounded-full bg-forest text-ivory"><CircleCheck size={30} strokeWidth={1.8} /></motion.span>
          <h2 className="mt-4 font-display text-[24px]">Nobody is waiting on you.</h2>
          <p className="mt-1.5 max-w-[260px] text-[14px] text-forest">
            {decidedToday.length ? `${decidedToday.length} decision${decidedToday.length > 1 ? 's' : ''} made today. Everyone has been told.` : 'New requests will land here the moment they are raised.'}
          </p>
        </motion.div>
      )}

      {decidedToday.length > 0 && (
        <MSection title="Decided today" className="!mt-7">
          <MList>
            <AnimatePresence initial={false}>
              {decidedToday.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
                  <MRow title={a.title} sub={`${KIND_LABEL[a.kind]} · ${d.staff.find(s => s.id === a.requestedBy)?.name ?? ''} · ${a.decidedAt ? time(a.decidedAt) : ''}`}
                    right={<Pill tone={a.status === 'approved' ? 'forest' : 'rust'}>{a.status === 'approved' ? 'Approved' : 'Declined'}</Pill>} />
                </motion.div>
              ))}
            </AnimatePresence>
          </MList>
        </MSection>
      )}
    </MobileScreen>
  )
}

const RoundButton = ({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: ReactNode }) => (
  <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label}
    className={`grid h-16 w-16 place-items-center rounded-full border shadow-2 ${className}`}>{children}</motion.button>
)

function SwipeCard({ d, approval, now, depth, onDecide }: { d: SchoolData; approval: Approval; now: string; depth: number; onDecide: (dir: Dir) => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-14, 14])
  const approveOpacity = useTransform(x, [20, THRESHOLD], [0, 1])
  const declineOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0])
  const top = depth === 0

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > THRESHOLD || info.velocity.x > 700) onDecide(1)
    else if (info.offset.x < -THRESHOLD || info.velocity.x < -700) onDecide(-1)
  }

  return (
    <motion.div
      style={{ x, rotate, zIndex: 10 - depth }}
      drag={top ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      exit="exit"
      variants={{ exit: (dir: Dir) => ({ x: dir * 460, rotate: dir * 22, opacity: 0, transition: { duration: 0.38, ease: ease.out } }) }}
      transition={softSpring}
      className="absolute inset-x-0 top-0 h-[410px] cursor-grab touch-pan-y select-none overflow-hidden rounded-[22px] border border-line bg-ivory-2 p-5 shadow-2 active:cursor-grabbing">
      <ApprovalBody d={d} approval={approval} now={now} />
      {top && (
        <>
          <motion.div style={{ opacity: approveOpacity }} className="pointer-events-none absolute inset-0 rounded-[22px] bg-forest/10 ring-2 ring-inset ring-forest">
            <span className="absolute left-5 top-5 -rotate-12 rounded-[8px] border-2 border-forest px-2.5 py-0.5 font-display text-[22px] text-forest">Approve</span>
          </motion.div>
          <motion.div style={{ opacity: declineOpacity }} className="pointer-events-none absolute inset-0 rounded-[22px] bg-rust/10 ring-2 ring-inset ring-rust">
            <span className="absolute right-5 top-5 rotate-12 rounded-[8px] border-2 border-rust px-2.5 py-0.5 font-display text-[22px] text-rust">Decline</span>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
