/* Homework — what's due, what's in, and a submit flow that feels like handing in a notebook. */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Camera, Check, ChevronRight, CircleCheck, ClipboardList, ImagePlus, ScanLine } from 'lucide-react'
import { Avatar, Button, EmptyState, Pill, Sheet, Tabs, cx, listItem, useToast } from '@/components/ui'
import type { Tone } from '@/components/ui'
import { MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { useNow } from '@/store/hooks'
import { daysBetween, dateLabel, dueLabel, time } from '@/lib/format'
import type { Homework } from '@/data/types'
import { Panel, SubjectChip, staffName, teacherShort, useStudent } from './shared'

type HwState = Homework['submissions'][string]

export function useMyHomework() {
  const { d, s } = useStudent()
  return useMemo(() => d.homework.filter(h => h.classId === s.classId && h.submissions[s.id] !== undefined), [d.homework, s.classId, s.id])
}

export function statusPill(state: HwState, due: string, now: string, teacher: string): { tone: Tone; text: string } {
  if (state === 'pending') {
    const days = daysBetween(now, due)
    if (days < 0) return { tone: 'rust', text: dueLabel(due, now) }
    return { tone: days <= 2 ? 'copper' : 'amber', text: `Due ${dueLabel(due, now).replace(/^(Today|Tomorrow)$/, m => m.toLowerCase())}` }
  }
  if (state === 'late') return { tone: 'rust', text: 'Submitted late' }
  if (state === 'reviewed') return { tone: 'forest', text: `Reviewed by ${teacher}` }
  return { tone: 'forest', text: 'Submitted' }
}

export function HomeworkTab() {
  const { d, s } = useStudent()
  const now = useNow()
  const nav = useMobileNav()
  const all = useMyHomework()
  const [tab, setTab] = useState<'due' | 'done'>('due')
  const due = all.filter(h => h.submissions[s.id] === 'pending').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const done = all.filter(h => h.submissions[s.id] !== 'pending').sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const list = tab === 'due' ? due : done
  const next = due[0]

  return (
    <MobileScreen title="Homework" eyebrow={due.length ? `${due.length} to hand in${next ? ` · next ${dueLabel(next.dueDate, now).toLowerCase()}` : ''}` : 'Nothing due — well done'}>
      <Tabs className="mb-3" value={tab} onChange={setTab} tabs={[{ id: 'due', label: 'Due', count: due.length }, { id: 'done', label: 'Submitted', count: done.length }]} />
      <motion.div className="space-y-2.5" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map(h => {
            const st = h.submissions[s.id]
            const teacher = teacherShort(staffName(d, h.teacherId))
            const pill = statusPill(st, h.dueDate, now, teacher)
            return (
              <motion.div key={h.id} layout variants={listItem} initial="hidden" animate="show" exit="exit">
                <Panel onClick={() => nav.push({ title: h.title, render: () => <HomeworkDetail id={h.id} /> })} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <SubjectChip subject={h.subject} />
                    <Pill tone={pill.tone} dot>{pill.text}</Pill>
                  </div>
                  <div className="mt-2.5 flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[18px] leading-snug text-ink">{h.title}</div>
                      <div className="mt-1 text-[12.5px] text-stone">{teacher} · set {dateLabel(h.assignedAt, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    </div>
                    <ChevronRight size={18} className="mb-0.5 shrink-0 text-stone-l" />
                  </div>
                </Panel>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && (tab === 'due'
        ? <EmptyState icon={CircleCheck} title="All handed in" body="Nothing due right now. Enjoy the evening." />
        : <EmptyState icon={ClipboardList} title="Nothing submitted yet" body="When you hand something in, it will show here with your teacher's review." />)}
    </MobileScreen>
  )
}

export function HomeworkDetail({ id }: { id: string }) {
  const { d, s } = useStudent()
  const now = useNow()
  const [open, setOpen] = useState(false)
  const [sheetKey, setSheetKey] = useState(0)
  const h = d.homework.find(x => x.id === id)
  if (!h) return <MobileScreen title="Homework"><EmptyState icon={ClipboardList} title="Not found" /></MobileScreen>
  const st = h.submissions[s.id]
  const teacherFull = staffName(d, h.teacherId)
  const teacher = teacherShort(teacherFull)
  const pill = statusPill(st, h.dueDate, now, teacher)
  const late = st === 'pending' && h.dueDate < now.slice(0, 10)

  return (
    <MobileScreen title={h.title} large={false}
      footer={st === 'pending'
        ? <Button block size="lg" variant={late ? 'copper' : 'primary'} icon={ImagePlus} onClick={() => { setSheetKey(k => k + 1); setOpen(true) }}>{late ? 'Add photos · submit late' : 'Add photos'}</Button>
        : undefined}>
      <div className="px-1 pt-3">
        <div className="flex items-center justify-between"><SubjectChip subject={h.subject} /><Pill tone={pill.tone} dot>{pill.text}</Pill></div>
        <h1 className="mt-3 font-display text-[27px] leading-[1.12]">{h.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-[13.5px] text-stone"><Avatar name={teacherFull} size={24} /> Set by {teacherFull}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-line bg-ivory-2 px-3.5 py-3">
          <div className="text-[11.5px] uppercase tracking-[0.1em] text-stone">Set on</div>
          <div className="mt-0.5 font-display text-[17px] text-ink">{dateLabel(h.assignedAt, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        </div>
        <div className={cx('rounded-[14px] border px-3.5 py-3', late ? 'border-rust/25 bg-rust-p' : 'border-line bg-ivory-2')}>
          <div className="text-[11.5px] uppercase tracking-[0.1em] text-stone">Due</div>
          <div className={cx('mt-0.5 font-display text-[17px]', late ? 'text-rust' : 'text-ink')}>{dateLabel(h.dueDate, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-line bg-ivory-2 p-4">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">What to do</div>
        <p className="mt-1.5 text-[15px] leading-[1.65] text-charcoal">{h.description}</p>
        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-paper px-3 py-2 text-[12.5px] text-charcoal-2"><Camera size={15} className="text-stone" /> Hand in a clear photo of each page — EduFlow straightens and sharpens them.</div>
      </div>

      <AnimatePresence>
        {st !== 'pending' && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className={cx('mt-4 flex items-center gap-3 rounded-[16px] px-4 py-3.5', st === 'late' ? 'bg-rust-p' : 'bg-forest-p')}>
            <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full text-ivory', st === 'late' ? 'bg-rust' : 'bg-forest')}><Check size={20} strokeWidth={2.6} /></span>
            <div>
              <div className={cx('text-[15px] font-semibold', st === 'late' ? 'text-rust' : 'text-forest')}>{st === 'reviewed' ? `Reviewed by ${teacher}` : st === 'late' ? 'Handed in late' : 'Handed in'}</div>
              <div className="text-[13px] text-charcoal-2">{st === 'reviewed' ? 'Feedback is in your notebook.' : `${teacher} will review it. ${st === 'late' ? 'It still counts — thank you for finishing it.' : 'Nothing else to do.'}`}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SubmitSheet key={sheetKey} open={open} onClose={() => setOpen(false)} homework={h} teacher={teacher} late={late} />
    </MobileScreen>
  )
}

/* ───────── submit flow ───────── */

type Stage = 'pick' | 'scan' | 'ready' | 'done'
const LIBRARY = [0, 1, 2, 3, 4]

function PageThumb({ n, seed, className }: { n: number; seed: number; className?: string }) {
  const widths = [88, 72, 94, 60, 82, 90, 54, 76, 86, 64].map((w, i) => ((w + seed * 13 + i * 7) % 45) + 50)
  return (
    <div className={cx('relative aspect-[3/4] overflow-hidden rounded-[8px] bg-[#FBF8F1] shadow-[0_1px_3px_rgba(36,31,27,.18)]', className)}
      style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 9px, rgba(78,90,102,.13) 9px 10px)', backgroundPositionY: 14 }}>
      <div className="absolute inset-y-0 left-[14%] w-px bg-rust/25" />
      <div className="absolute left-[20%] right-[8%] top-[16px] space-y-[5px]">
        {widths.slice(0, 7 + (seed % 3)).map((w, i) => <div key={i} className="h-[4px] rounded-full bg-charcoal/35" style={{ width: `${w}%` }} />)}
      </div>
      <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold text-stone">{n}</span>
    </div>
  )
}

function SubmitSheet({ open, onClose, homework, teacher, late }: { open: boolean; onClose: () => void; homework: Homework; teacher: string; late: boolean }) {
  const { s } = useStudent()
  const submitHomework = useSchool(st => st.submitHomework)
  const toast = useToast()
  const now = useNow()
  const [stage, setStage] = useState<Stage>('pick')
  const [picked, setPicked] = useState<number[]>([])
  const [scanned, setScanned] = useState(0)

  // scan one page at a time — each sweep ends with a tick
  useEffect(() => {
    if (stage !== 'scan') return
    if (scanned >= picked.length) { const t = setTimeout(() => setStage('ready'), 350); return () => clearTimeout(t) }
    const t = setTimeout(() => setScanned(n => n + 1), 1000)
    return () => clearTimeout(t)
  }, [stage, scanned, picked.length])

  const toggle = (i: number) => setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]))
  const submit = () => {
    submitHomework(homework.id, s.id)
    setStage('done')
    toast(`${homework.subject} homework handed in`)
  }

  const footer =
    stage === 'pick' ? <Button block size="lg" icon={ScanLine} disabled={!picked.length} onClick={() => setStage('scan')}>{picked.length ? `Scan ${picked.length} page${picked.length > 1 ? 's' : ''}` : 'Choose your pages'}</Button>
    : stage === 'scan' ? <Button block size="lg" disabled>Scanning {Math.min(scanned + 1, picked.length)} of {picked.length}…</Button>
    : stage === 'ready' ? <div className="flex gap-2"><Button variant="outline" size="lg" onClick={() => setStage('pick')}>Change</Button><Button size="lg" className="flex-1" variant={late ? 'copper' : 'primary'} onClick={submit}>{late ? 'Submit late' : `Hand in to ${teacher}`}</Button></div>
    : <Button block size="lg" onClick={onClose}>Done</Button>

  return (
    <Sheet open={open} onClose={onClose} title={stage === 'done' ? undefined : stage === 'pick' ? 'Add photos' : 'Your pages'} footer={footer}>
      <AnimatePresence mode="wait">
        {stage === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="mb-3 text-[13.5px] text-stone">Pick the pages for “{homework.title}”, in order.</p>
            <div className="grid grid-cols-3 gap-2.5">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => toast('Camera opens on a real phone — pick from recent photos for now', 'slate')}
                className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-stone-p bg-paper/60 text-stone">
                <Camera size={22} strokeWidth={1.6} /><span className="text-[11.5px] font-medium">Camera</span>
              </motion.button>
              {LIBRARY.map(i => {
                const order = picked.indexOf(i)
                return (
                  <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => toggle(i)} className="relative">
                    <PageThumb n={i + 1} seed={i} className={cx('transition-[outline] outline-2 outline-offset-2', order >= 0 ? 'outline outline-forest' : 'outline-transparent')} />
                    <AnimatePresence>
                      {order >= 0 && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-forest text-[12px] font-semibold text-ivory ring-2 ring-ivory-2">{order + 1}</motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
            <p className="mt-3 text-[12px] text-stone">Recent photos · Today</p>
          </motion.div>
        )}

        {(stage === 'scan' || stage === 'ready') && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 pt-1">
              {picked.map((p, i) => {
                const state = i < scanned ? 'done' : i === scanned && stage === 'scan' ? 'scanning' : 'waiting'
                return (
                  <div key={p} className="relative w-[118px] shrink-0">
                    <PageThumb n={i + 1} seed={p} className={cx('transition-opacity', state === 'waiting' && 'opacity-50')} />
                    {state === 'scanning' && (
                      <>
                        <div className="absolute inset-0 rounded-[8px] ring-2 ring-copper" />
                        <motion.div className="absolute inset-x-0 h-[3px] rounded-full bg-copper shadow-[0_0_12px_2px_rgba(180,118,58,.55)]"
                          initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
                      </>
                    )}
                    <AnimatePresence>
                      {state === 'done' && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-forest text-ivory ring-2 ring-ivory-2"><Check size={13} strokeWidth={3} /></motion.span>
                      )}
                    </AnimatePresence>
                    <div className="mt-1.5 text-center text-[11.5px] text-stone">{state === 'done' ? 'Sharpened' : state === 'scanning' ? 'Straightening…' : 'Waiting'}</div>
                  </div>
                )
              })}
            </div>
            <AnimatePresence>
              {stage === 'ready' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-[12px] bg-forest-p px-3.5 py-2.5 text-[13.5px] text-forest">
                  {picked.length} page{picked.length > 1 ? 's' : ''} ready · clear and readable.
                  {late && <span className="mt-0.5 block text-[12.5px] text-rust">This will be marked as a late submission.</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-6 text-center">
            <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 15 }}
              className={cx('grid h-20 w-20 place-items-center rounded-full text-ivory', late ? 'bg-copper' : 'bg-forest')}>
              <Check size={40} strokeWidth={2.6} />
            </motion.span>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 className="mt-5 font-display text-[24px]">{late ? 'Handed in — late, but in' : 'Handed in'}</h3>
              <p className="mt-1.5 text-[14px] text-stone">{picked.length} page{picked.length > 1 ? 's' : ''} sent to {teacher} at {time(now)}.<br />Your parents can see it's in, too.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
