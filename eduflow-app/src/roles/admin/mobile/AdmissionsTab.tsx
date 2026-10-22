import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { useState } from 'react'
import { ArrowRight, Phone, Plus, UserPlus } from 'lucide-react'
import { MobileScreen } from '@/components/shell/Mobile'
import { Button, EmptyState, Field, IconButton, Pill, Sheet, Tabs, ease, inputClass, softSpring, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import type { Admission, AdmissionStage } from '@/data/types'
import { ago, firstName, rupees } from '@/lib/format'
import { NEXT_ACTION, STAGES, STAGE_LABEL, nextStage } from './lib'

const SOURCES: Admission['source'][] = ['Walk-in', 'Website', 'Referral', 'Social', 'Newspaper']

export function AdmissionsTab() {
  const d = useData()
  const now = useNow()
  const toast = useToast()
  const [stage, setStage] = useState<AdmissionStage>('enquiry')
  const [adding, setAdding] = useState(false)
  const list = d.admissions.filter(a => a.stage === stage).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))
  const counts = Object.fromEntries(STAGES.map(s => [s, d.admissions.filter(a => a.stage === s).length])) as Record<AdmissionStage, number>
  const max = Math.max(...STAGES.map(s => counts[s]), 1)

  const move = (a: Admission) => {
    const to = nextStage(a.stage)
    if (!to) return
    d.moveAdmission(a.id, to, DEMO.adminId)
    toast(`${firstName(a.childName)} moved to ${STAGE_LABEL[to].toLowerCase()}`)
  }
  const drop = (a: Admission) => {
    d.moveAdmission(a.id, 'dropped', DEMO.adminId)
    toast(`${firstName(a.childName)} marked as dropped`, 'stone')
  }

  return (
    <MobileScreen eyebrow={`${d.admissions.filter(a => a.stage !== 'dropped').length} families in the pipeline`} title="Admissions"
      actions={<IconButton icon={Plus} label="New enquiry" onClick={() => setAdding(true)} />}>
      {/* the funnel, as five bars that grow and shrink as families move */}
      <div className="flex items-end gap-1.5 px-1">
        {STAGES.map(s => (
          <button key={s} onClick={() => setStage(s)} className="flex flex-1 flex-col items-center gap-1">
            <span className="tabular text-[12px] font-medium text-ink">{counts[s]}</span>
            <span className="flex h-12 w-full items-end">
              <motion.span className={clsx('block w-full rounded-t-[5px]', s === stage ? 'bg-forest' : s === 'enrolled' ? 'bg-forest-l/50' : 'bg-stone-p')}
                initial={false} animate={{ height: `${Math.max(8, (counts[s] / max) * 100)}%` }} transition={softSpring} />
            </span>
          </button>
        ))}
      </div>

      <Tabs size="sm" className="mt-3" value={stage} onChange={setStage} tabs={STAGES.map(s => ({ id: s, label: STAGE_LABEL[s] }))} />

      <div className="mt-3">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map(a => <AdmissionCard key={a.id} a={a} now={now} onMove={() => move(a)} onDrop={() => drop(a)} />)}
        </AnimatePresence>
        {!list.length && <EmptyState icon={UserPlus} title={`No one at ${STAGE_LABEL[stage].toLowerCase()}`} body={stage === 'enquiry' ? 'New enquiries from the website and front desk land here.' : 'Families move here as you take them forward.'} />}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="New enquiry">
        <NewEnquiry onDone={name => { setAdding(false); setStage('enquiry'); toast(`Enquiry added for ${name}`) }} />
      </Sheet>
    </MobileScreen>
  )
}

function AdmissionCard({ a, now, onMove, onDrop }: { a: Admission; now: string; onMove: () => void; onDrop: () => void }) {
  const next = nextStage(a.stage)
  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 140, transition: { duration: 0.32, ease: ease.ez } }} transition={{ duration: 0.35, ease: ease.out }}
      className="mb-2.5 rounded-[16px] border border-line bg-ivory-2 p-4 shadow-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[19px] leading-tight">{a.childName}</h3>
          <div className="mt-0.5 text-[13px] text-stone">Grade {a.grade} · {a.parentName}</div>
        </div>
        <a href={`tel:${a.phone.replace(/\s/g, '')}`} aria-label={`Call ${a.parentName}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-forest"><Phone size={15} /></a>
      </div>
      <p className="mt-2 text-[13.5px] leading-snug text-charcoal-2">{a.notes}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Pill tone="slate">{a.source}</Pill>
        <Pill tone="stone">{rupees(a.feeQuoted)} / yr</Pill>
        <Pill tone="stone">Updated {ago(a.updatedAt, now).toLowerCase()}</Pill>
      </div>
      {next && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" iconRight={ArrowRight} onClick={onMove}>{NEXT_ACTION[a.stage] ?? `Move to ${STAGE_LABEL[next]}`}</Button>
          <Button size="sm" variant="ghost" onClick={onDrop}>Drop</Button>
        </div>
      )}
    </motion.article>
  )
}

function NewEnquiry({ onDone }: { onDone: (name: string) => void }) {
  const d = useData()
  const [childName, setChild] = useState('')
  const [grade, setGrade] = useState(1)
  const [parentName, setParent] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState<Admission['source']>('Walk-in')
  const [notes, setNotes] = useState('')
  const ok = childName.trim() && parentName.trim() && phone.replace(/\D/g, '').length >= 10

  const save = () => {
    if (!ok) return
    d.addAdmission({ childName: childName.trim(), grade, parentName: parentName.trim(), phone: phone.trim(), source, notes: notes.trim() || 'New enquiry from the front desk.' }, DEMO.adminId)
    onDone(childName.trim())
  }

  return (
    <div className="space-y-3.5">
      <Field label="Child's name"><input className={inputClass} value={childName} onChange={e => setChild(e.target.value)} placeholder="Aarav Sharma" /></Field>
      <Field label="Grade">
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
            <button key={g} onClick={() => setGrade(g)} className={clsx('h-9 w-9 shrink-0 rounded-full text-[14px] font-medium tabular', g === grade ? 'bg-forest text-ivory' : 'border border-line bg-ivory text-charcoal-2')}>{g}</button>
          ))}
        </div>
      </Field>
      <Field label="Parent's name"><input className={inputClass} value={parentName} onChange={e => setParent(e.target.value)} placeholder="Pooja Sharma" /></Field>
      <Field label="Phone"><input className={inputClass} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98220 00000" /></Field>
      <Field label="How did they hear about us?">
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map(s => (
            <button key={s} onClick={() => setSource(s)} className={clsx('rounded-full px-3 py-1.5 text-[13px] font-medium', s === source ? 'bg-ink text-ivory' : 'border border-line bg-ivory text-charcoal-2')}>{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Notes"><textarea className={clsx(inputClass, 'h-auto resize-none py-2')} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Interested in the sports programme" /></Field>
      <Button block size="lg" icon={UserPlus} disabled={!ok} onClick={save}>Add enquiry</Button>
    </div>
  )
}
