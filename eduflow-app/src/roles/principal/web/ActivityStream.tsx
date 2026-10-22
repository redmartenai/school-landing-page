import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, BellRing, BookOpen, Bus, ClipboardCheck, FileText, GraduationCap, Inbox, Lock, Megaphone, MessageSquare, UserCheck, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardHeader, EmptyState, LiveDot, cx, ease, type Tone } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import type { ActivityEvent } from '@/store/school'
import { ago } from '@/lib/format'
import { ToneIcon, useNameOf } from './shared'

interface Line { id: string; at: string; text: string; who?: string; icon: LucideIcon; tone: Tone }

const KIND: Record<ActivityEvent['kind'], { icon: LucideIcon; tone: Tone }> = {
  attendance: { icon: ClipboardCheck, tone: 'forest' },
  approval: { icon: Inbox, tone: 'slate' },
  fees: { icon: Wallet, tone: 'forest' },
  message: { icon: MessageSquare, tone: 'slate' },
  homework: { icon: BookOpen, tone: 'slate' },
  marks: { icon: GraduationCap, tone: 'copper' },
  announcement: { icon: Megaphone, tone: 'slate' },
  admission: { icon: UserCheck, tone: 'slate' },
  payroll: { icon: Wallet, tone: 'slate' },
  lms: { icon: BookOpen, tone: 'stone' },
  nudge: { icon: BellRing, tone: 'copper' },
  permission: { icon: Lock, tone: 'rust' },
}

export function ActivityStream() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const [more, setMore] = useState(false)
  const today = d.school.today

  const lines = useMemo(() => {
    const out: Line[] = d.events.map(e => ({ id: e.id, at: e.at, text: e.text, who: nameOf(e.actorId), ...KIND[e.kind] }))
    const loggedRegisters = new Set(d.events.filter(e => e.kind === 'attendance').map(e => e.text.split(' ')[0]))
    // The morning before anyone touched the app: seed state rendered as a timeline.
    for (const r of d.registers) {
      if (!r.markedAt || loggedRegisters.has(r.classId)) continue
      const v = Object.values(r.marks)
      const absent = v.filter(m => m === 'A').length
      out.push({ id: `reg-${r.classId}`, at: r.markedAt, who: nameOf(r.markedBy), icon: ClipboardCheck, tone: 'forest', text: `${r.classId} register marked — ${v.length - absent} present, ${absent} absent` })
    }
    for (const b of d.buses) {
      if (b.status !== 'arrived') continue
      const last = b.stops[b.stops.length - 1]
      const [h, m] = last.at.split(':').map(Number)
      const mins = h * 60 + m + b.delayMin
      const at = `${today}T${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`
      out.push({ id: `bus-${b.id}`, at, who: b.driverName, icon: Bus, tone: 'forest', text: `Bus ${b.id} reached school with ${b.studentIds.length} children${b.delayMin ? ` · ${b.delayMin} min late` : ''}` })
    }
    for (const s of d.staff) {
      const t = s.attendance[s.attendance.length - 1]
      if (t?.date === today && t.status === 'late' && t.checkIn) out.push({ id: `late-${s.id}`, at: `${today}T${t.checkIn}:00`, who: s.name, icon: UserCheck, tone: 'amber', text: `${s.name} checked in late at ${t.checkIn}` })
    }
    for (const a of d.audit) {
      if (!/^au-\d+$/.test(a.id) || !a.at.startsWith(today)) continue
      out.push({ id: a.id, at: a.at, who: nameOf(a.actorId), icon: FileText, tone: a.sensitive ? 'copper' : 'slate', text: `${a.action} — ${a.target}` })
    }
    return out.filter(l => l.at <= now || l.at.startsWith(today)).sort((a, b) => b.at.localeCompare(a.at))
  }, [d.events, d.registers, d.buses, d.staff, d.audit, today, now, nameOf])

  const shown = more ? lines.slice(0, 40) : lines.slice(0, 10)

  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="Live" title="What just happened" action={<span className="inline-flex items-center gap-2 text-[12px] text-stone"><LiveDot /> streaming</span>} />
      {lines.length === 0 ? (
        <EmptyState icon={Activity} title="A quiet school so far" body="Registers, payments and replies will appear here the moment they happen." />
      ) : (
        <ol className="relative">
          <span className="absolute bottom-3 left-[16px] top-3 w-px bg-line-2" />
          <AnimatePresence initial={false}>
            {shown.map(l => (
              <motion.li key={l.id} layout initial={{ opacity: 0, y: -14, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: ease.out }} className="relative">
                <div className="flex gap-3 py-2">
                  <span className="relative"><ToneIcon icon={l.icon} tone={l.tone} size={33} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] leading-snug text-ink">{l.text}</div>
                    <div className="mt-0.5 text-[11.5px] text-stone">{l.who && <>{l.who} · </>}<span className="tabular">{l.at.slice(11, 16)}</span> · {ago(l.at, now)}</div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {lines.length > 10 && (
        <button onClick={() => setMore(m => !m)} className={cx('mt-2 text-[12.5px] font-medium text-forest hover:underline')}>
          {more ? 'Show less' : `Show earlier (${Math.min(40, lines.length) - 10} more)`}
        </button>
      )}
    </Card>
  )
}
