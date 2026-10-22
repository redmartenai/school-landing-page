import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, type PanInfo } from 'framer-motion'
import { ChevronDown, Ellipsis, GripVertical, Inbox, Phone, Plus, UserPlus } from 'lucide-react'
import { Button, Card, CardHeader, Field, Page, PageHeader, Pill, Sheet, cx, ease, inputClass, spring, toneClass, useToast } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago, daysBetween, rupees, rupeesShort } from '@/lib/format'
import type { Admission, AdmissionStage } from '@/data/types'
import { ADMIN_ID, STAGES } from './shared'
import { FunnelBars, funnelStats } from './AdmissionFunnel'

const BOARD = STAGES.filter(s => s.id !== 'dropped')
const SOURCES: Admission['source'][] = ['Website', 'Walk-in', 'Referral', 'Social', 'Newspaper']

export function AdmissionsPage() {
  const d = useData()
  const now = useNow()
  const move = useSchool(s => s.moveAdmission)
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [showDropped, setShowDropped] = useState(false)
  const [over, setOver] = useState<AdmissionStage | null>(null)
  const cols = useRef<Partial<Record<AdmissionStage, HTMLDivElement | null>>>({})

  const byStage = useMemo(() => {
    const m: Record<AdmissionStage, Admission[]> = { enquiry: [], visit: [], assessment: [], offer: [], enrolled: [], dropped: [] }
    for (const a of [...d.admissions].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))) m[a.stage].push(a)
    return m
  }, [d.admissions])

  const stats = funnelStats(d.admissions)
  const offerValue = byStage.offer.reduce((a, x) => a + x.feeQuoted, 0)
  const enrolledValue = byStage.enrolled.reduce((a, x) => a + x.feeQuoted, 0)

  const doMove = (a: Admission, stage: AdmissionStage) => {
    if (a.stage === stage) return
    move(a.id, stage, ADMIN_ID)
    const first = a.childName.split(' ')[0]
    const msg: Record<AdmissionStage, string> = {
      enquiry: `${first} is back to enquiry`,
      visit: `Campus visit noted for ${first}`,
      assessment: `${first} moved to assessment`,
      offer: `Offer sent to ${a.parentName} · ${rupees(a.feeQuoted)} a year`,
      enrolled: `${first} is enrolled in Grade ${a.grade}. Welcome to Greenfield.`,
      dropped: `${first} marked as dropped`,
    }
    toast(msg[stage], stage === 'dropped' ? 'stone' : stage === 'enrolled' ? 'forest' : 'copper')
  }

  const hit = (info: PanInfo): AdmissionStage | null => {
    const x = info.point.x - window.scrollX, y = info.point.y - window.scrollY
    for (const s of STAGES) {
      const el = cols.current[s.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top - 40 && y <= r.bottom + 120) return s.id
    }
    return null
  }

  return (
    <Page>
      <PageHeader eyebrow="Admissions · 2027–28 intake" title="Admissions pipeline"
        subtitle={`${byStage.enquiry.length} new enquiries to call back and ${byStage.offer.length} offers awaiting fee payment (${rupeesShort(offerValue)} a year). Drag a family to the next stage.`}
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>New enquiry</Button>} />

      <LayoutGroup>
        <div className="scroll-quiet -mx-4 mb-5 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:overflow-visible xl:px-0">
          <div className="grid min-w-[1180px] grid-cols-5 gap-3 xl:min-w-0">
            {BOARD.map(col => {
              const list = byStage[col.id]
              return (
                <motion.div key={col.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } } }}
                  ref={el => { cols.current[col.id] = el }}
                  className={cx('flex min-h-[320px] flex-col rounded-[14px] border p-2.5 transition-colors', over === col.id ? 'border-forest-l bg-forest-p/60' : 'border-line bg-paper/50')}>
                  <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <span className={cx('h-2 w-2 rounded-full', toneClass[col.tone].dot)} />{col.label}
                    </span>
                    <motion.span key={list.length} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={spring} className="rounded-full bg-ivory-2 px-2 text-[12px] font-semibold tabular text-stone">{list.length}</motion.span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {list.map(a => (
                      <KanbanCard key={a.id} a={a} now={now}
                        onDrag={info => setOver(hit(info))}
                        onDrop={info => { const t = hit(info); setOver(null); if (t) doMove(a, t) }}
                        onMove={st => doMove(a, st)} />
                    ))}
                    {list.length === 0 && (
                      <div className="grid flex-1 place-items-center rounded-[10px] border border-dashed border-stone-p px-3 py-8 text-center text-[12.5px] text-stone">Drop a family here</div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <Card className="mb-5" padded={false}>
          <button onClick={() => setShowDropped(v => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
            <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <span className="h-2 w-2 rounded-full bg-stone-l" /> Dropped <span className="text-stone">· {byStage.dropped.length}</span>
            </span>
            <span className="flex items-center gap-2 text-[12.5px] text-stone">{showDropped ? 'Hide' : 'Show'} <motion.span animate={{ rotate: showDropped ? 180 : 0 }}><ChevronDown size={16} /></motion.span></span>
          </button>
          <AnimatePresence initial={false}>
            {showDropped && (
              <motion.div initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }} transition={{ duration: 0.3, ease: ease.out }}>
                <div ref={el => { cols.current.dropped = el }} className="grid gap-2 border-t border-line-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  {byStage.dropped.map(a => <KanbanCard key={a.id} a={a} now={now} onMove={st => doMove(a, st)} />)}
                  {byStage.dropped.length === 0 && <p className="col-span-full py-4 text-center text-[13px] text-stone">No family has dropped out. Good sign.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </LayoutGroup>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader eyebrow="Conversion" title={`${Math.round(stats.conversion * 100)}% of enquiries enrol`}
            action={<span className="text-[12.5px] text-stone">{rupeesShort(enrolledValue)} in annual fees secured</span>} />
          <FunnelBars list={d.admissions} />
          <p className="mt-3 text-[12px] text-stone">Bars show families who reached each stage; the right column is the step-to-step conversion.</p>
        </Card>
        <Card>
          <CardHeader eyebrow="Where families hear about us" title="Sources" />
          <div className="space-y-3">
            {SOURCES.map(src => ({ src, all: d.admissions.filter(a => a.source === src), won: d.admissions.filter(a => a.source === src && a.stage === 'enrolled').length }))
              .sort((a, b) => b.all.length - a.all.length)
              .map((x, i) => {
                const max = Math.max(1, ...SOURCES.map(s => d.admissions.filter(a => a.source === s).length))
                return (
                  <div key={x.src}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="text-charcoal">{x.src}</span>
                      <span className="tabular text-stone"><span className="text-ink">{x.all.length}</span> enquiries · {x.won} enrolled</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-line-2">
                      <motion.div className="absolute inset-y-0 left-0 rounded-full bg-stone-p" initial={{ width: 0 }} animate={{ width: `${(x.all.length / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.06, ease: ease.out }} />
                      <motion.div className="absolute inset-y-0 left-0 rounded-full bg-forest" initial={{ width: 0 }} animate={{ width: `${(x.won / max) * 100}%` }} transition={{ duration: 0.7, delay: 0.2 + i * 0.06, ease: ease.out }} />
                    </div>
                  </div>
                )
              })}
            {d.admissions.length === 0 && <p className="py-6 text-center text-[13px] text-stone">No enquiries yet.</p>}
          </div>
          <div className="mt-4 flex gap-4 text-[12px] text-stone">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-stone-p" /> Enquiries</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest" /> Enrolled</span>
          </div>
        </Card>
      </div>

      <NewEnquiry open={adding} onClose={() => setAdding(false)} />
    </Page>
  )
}

function KanbanCard({ a, now, onDrag, onDrop, onMove }: { a: Admission; now: string; onDrag?: (i: PanInfo) => void; onDrop?: (i: PanInfo) => void; onMove: (s: AdmissionStage) => void }) {
  const [menu, setMenu] = useState(false)
  const [dragging, setDragging] = useState(false)
  const age = daysBetween(a.updatedAt, now)
  const stale = a.stage !== 'enrolled' && a.stage !== 'dropped' && age >= 7
  return (
    <motion.div layoutId={a.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ layout: spring, duration: 0.25 }}
      drag={!!onDrop} dragSnapToOrigin dragElastic={0.9} dragMomentum={false}
      onDragStart={() => { setDragging(true); setMenu(false) }}
      onDrag={(_, info) => onDrag?.(info)}
      onDragEnd={(_, info) => { setDragging(false); onDrop?.(info) }}
      whileDrag={{ scale: 1.04, rotate: -1.5, zIndex: 40, boxShadow: '0 24px 40px -18px rgba(36,31,27,.4)' }}
      style={{ position: 'relative', zIndex: menu ? 30 : dragging ? 40 : 1 }}
      className={cx('group rounded-[11px] border border-line bg-ivory-2 p-3 shadow-1', onDrop && 'cursor-grab active:cursor-grabbing')}>
      <div className="flex items-start gap-1.5">
        {onDrop && <GripVertical size={14} className="mt-0.5 shrink-0 text-stone-p group-hover:text-stone" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium text-ink">{a.childName}</div>
          <div className="text-[12px] text-stone">Grade {a.grade} · {a.source}</div>
        </div>
        <button aria-label={`Move ${a.childName}`} onPointerDown={e => e.stopPropagation()} onClick={() => setMenu(m => !m)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-stone hover:bg-paper hover:text-ink">
          <Ellipsis size={15} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-stone"><Phone size={11} /> <span className="truncate">{a.parentName}</span></div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[12px] tabular text-charcoal">{rupeesShort(a.feeQuoted)}/yr</span>
        {stale ? <Pill tone="amber">{age}d idle</Pill> : <span className="text-[11.5px] text-stone-l">{ago(a.updatedAt + 'T09:00:00', now)}</span>}
      </div>

      <AnimatePresence>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onPointerDown={e => e.stopPropagation()} onClick={() => setMenu(false)} />
            <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
              onPointerDown={e => e.stopPropagation()}
              className="absolute right-2 top-9 z-20 w-[180px] overflow-hidden rounded-[11px] border border-line bg-ivory-2 p-1 shadow-3">
              <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-l">Move to</div>
              {STAGES.map(s => (
                <button key={s.id} disabled={s.id === a.stage} onClick={() => { setMenu(false); onMove(s.id) }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] text-charcoal hover:bg-paper disabled:cursor-default disabled:text-stone-l disabled:hover:bg-transparent">
                  <span className={cx('h-1.5 w-1.5 rounded-full', toneClass[s.tone].dot)} />{s.label}
                  {s.id === a.stage && <span className="ml-auto text-[11px]">current</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function NewEnquiry({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useSchool(s => s.addAdmission)
  const toast = useToast()
  const blank = { childName: '', grade: '6', parentName: '', phone: '', source: 'Walk-in' as Admission['source'], notes: '' }
  const [f, setF] = useState(blank)
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF(p => ({ ...p, [k]: v }))
  const ok = f.childName.trim().length > 1 && f.parentName.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 10

  const submit = () => {
    if (!ok) return
    add({ childName: f.childName.trim(), grade: Number(f.grade), parentName: f.parentName.trim(), phone: f.phone.trim(), source: f.source, notes: f.notes.trim() || 'New enquiry — call back to schedule a campus visit.' }, ADMIN_ID)
    toast(`${f.childName.trim().split(' ')[0]} added to enquiries · Grade ${f.grade}`)
    setF(blank)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="New enquiry"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={UserPlus} disabled={!ok} onClick={submit}>Add to pipeline</Button></div>}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Child's name"><input autoFocus value={f.childName} onChange={e => set('childName', e.target.value)} className={inputClass} placeholder="e.g. Ishaan Joshi" /></Field>
        <Field label="Applying for">
          <select value={f.grade} onChange={e => set('grade', e.target.value)} className={inputClass}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Grade {i + 1}</option>)}
          </select>
        </Field>
        <Field label="Parent's name"><input value={f.parentName} onChange={e => set('parentName', e.target.value)} className={inputClass} placeholder="e.g. Priya Joshi" /></Field>
        <Field label="Phone" hint="10-digit mobile"><input inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="+91 98xxx xxxxx" /></Field>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">How did they hear about us?</span>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map(s => (
              <button key={s} onClick={() => set('source', s)} className={cx('relative rounded-full border px-3 py-1.5 text-[13px]', f.source === s ? 'border-forest text-ivory' : 'border-line bg-ivory-2 text-charcoal hover:bg-paper')}>
                {f.source === s && <motion.span layoutId="enq-src" className="absolute inset-0 rounded-full bg-forest" transition={spring} />}
                <span className="relative">{s}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes"><textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} className={cx(inputClass, 'h-auto py-2')} placeholder="Siblings, transport needs, preferred visit time…" /></Field>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-stone"><Inbox size={13} /> Lands in Enquiry. Fee is quoted automatically from the grade.</p>
    </Sheet>
  )
}

