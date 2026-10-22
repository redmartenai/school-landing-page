import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Phone, Send } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, Button, Pill, Ring, Sheet, inputClass, toneClass, type Tone, useToast } from '@/components/ui'
import { useData, useNow, DEMO } from '@/store/hooks'
import type { Staff } from '@/data/types'
import { teacherScorecard, type Scorecard } from '@/engine/monitoring'
import { firstNameWithTitle } from './lib'

const GRADE_TONE: Record<Scorecard['grade'], Tone> = { 'Needs support': 'copper', Good: 'slate', Excellent: 'forest' }
const GRADES: Scorecard['grade'][] = ['Needs support', 'Good', 'Excellent']

/** The one thing worth saying to this teacher, written the way a principal would say it. */
function suggestedNote(t: Staff, sc: Scorecard) {
  const first = firstNameWithTitle(t)
  if (sc.pendingMarks) return `${first}, Unit Test 2 marks for ${sc.pendingMarks} class${sc.pendingMarks > 1 ? 'es are' : ' is'} still pending — report cards are waiting on them. Could you submit by tomorrow?`
  if (sc.unanswered) return `${first}, ${sc.unanswered} parent message${sc.unanswered > 1 ? 's have' : ' has'} waited more than a day. A short reply today would help a lot.`
  if (sc.unreviewed >= 25) return `${first}, there are ${sc.unreviewed} homework submissions waiting for feedback. Could you clear them this week?`
  if (sc.punctuality < 0.8) return `${first}, I've noticed a few late mornings this month. Is anything making the commute hard? Let's talk.`
  return `${first}, thank you — your classes are in great shape. It shows.`
}

export function PeopleTab() {
  const d = useData()
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = useMemo(
    () => d.staff.filter(s => s.role === 'teacher' && s.subjects.length).map(t => ({ t, sc: teacherScorecard(d, t) })).sort((a, b) => a.sc.score - b.sc.score),
    [d],
  )
  const open = rows.find(r => r.t.id === openId) ?? null
  const support = rows.filter(r => r.sc.grade === 'Needs support').length

  return (
    <MobileScreen eyebrow={`${rows.length} teachers`} title="People">
      <p className="px-1 text-[14px] text-charcoal-2">
        {support ? <><span className="font-medium text-copper-d">{support} need{support === 1 ? 's' : ''} support</span> this month. Everyone else is doing well.</> : 'Every teacher is on track this month.'}
      </p>
      {GRADES.map(g => {
        const group = rows.filter(r => r.sc.grade === g)
        if (!group.length) return null
        return (
          <MSection key={g} title={`${g} · ${group.length}`}>
            <MList>
              {group.map(({ t, sc }) => {
                const today = t.attendance[t.attendance.length - 1]
                const away = today?.status === 'absent' || today?.status === 'leave'
                return (
                  <MRow key={t.id} onClick={() => setOpenId(t.id)}
                    icon={<Ring value={sc.score / 100} size={42} stroke={4} tone={GRADE_TONE[g]}><span className="font-display tabular text-[13px] text-ink">{sc.score}</span></Ring>}
                    title={t.name}
                    sub={<>{t.subjects[0]}{t.classTeacherOf ? ` · ${t.classTeacherOf}` : ''}{away && <span className="text-rust"> · {today.status === 'leave' ? 'on leave' : 'absent'} today</span>}</>}
                    right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
                )
              })}
            </MList>
          </MSection>
        )
      })}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.t.name}>
        {open && <TeacherDetail t={open.t} sc={open.sc} />}
      </Sheet>
    </MobileScreen>
  )
}

function TeacherDetail({ t, sc }: { t: Staff; sc: Scorecard }) {
  const d = useData()
  const now = useNow()
  const toast = useToast()
  const [note, setNote] = useState(() => suggestedNote(t, sc))
  useEffect(() => setNote(suggestedNote(t, sc)), [t.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const today = t.attendance[t.attendance.length - 1]
  const status = today?.date === now.slice(0, 10)
    ? today.status === 'absent' ? 'Absent today' : today.status === 'leave' ? 'On leave today' : `In at ${today.checkIn}${today.status === 'late' ? ' (late)' : ''}`
    : '—'

  const metrics: { label: string; value: string; tone: Tone }[] = [
    { label: 'On time', value: `${Math.round(sc.punctuality * 100)}%`, tone: sc.punctuality >= 0.9 ? 'forest' : sc.punctuality >= 0.8 ? 'amber' : 'copper' },
    { label: 'Marks on time', value: `${Math.round(sc.marksOnTime * 100)}%`, tone: sc.pendingMarks ? 'copper' : 'forest' },
    { label: 'Homework reviewed', value: `${Math.round(sc.reviewRate * 100)}%`, tone: sc.reviewRate >= 0.8 ? 'forest' : sc.reviewRate >= 0.6 ? 'amber' : 'copper' },
    { label: 'Parent reply', value: `${sc.replyHours} h`, tone: sc.replyHours <= 12 ? 'forest' : sc.replyHours <= 24 ? 'amber' : 'copper' },
    { label: 'Class results', value: `${sc.classAvgDelta >= 0 ? '+' : '−'}${Math.abs(sc.classAvgDelta).toFixed(1)}`, tone: sc.classAvgDelta >= 0 ? 'forest' : sc.classAvgDelta > -5 ? 'amber' : 'copper' },
  ]
  const flags = [
    sc.pendingMarks && `${sc.pendingMarks} mark sheet${sc.pendingMarks > 1 ? 's' : ''} pending`,
    sc.unreviewed >= 10 && `${sc.unreviewed} submissions unreviewed`,
    sc.unanswered && `${sc.unanswered} parent${sc.unanswered > 1 ? 's' : ''} waiting`,
  ].filter((x): x is string => !!x)

  const send = () => {
    if (!note.trim()) return
    d.nudge(t.id, 'A note from Dr. Iyer', note.trim(), DEMO.principalId)
    toast(`Note sent to ${firstNameWithTitle(t)}`)
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Ring value={sc.score / 100} size={84} stroke={7} tone={GRADE_TONE[sc.grade]}>
          <span className="font-display tabular text-[26px] leading-none text-ink">{sc.score}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <Pill tone={GRADE_TONE[sc.grade]} dot>{sc.grade}</Pill>
          <div className="mt-1.5 text-[13.5px] text-charcoal-2">{t.designation}</div>
          <div className={clsx('text-[12.5px]', today?.status === 'absent' ? 'text-rust' : 'text-stone')}>{status}</div>
        </div>
        <a href={`tel:${t.phone.replace(/\s/g, '')}`} aria-label={`Call ${t.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-forest"><Phone size={17} /></a>
      </div>

      <div className="mt-4 divide-y divide-line-2 rounded-[14px] border border-line bg-ivory">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[14px] text-charcoal-2">{m.label}</span>
            <span className="flex items-center gap-2 font-display tabular text-[16px] text-ink">
              <span className={clsx('h-1.5 w-1.5 rounded-full', toneClass[m.tone].dot)} />{m.value}
            </span>
          </motion.div>
        ))}
      </div>
      {flags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{flags.map(f => <Pill key={f} tone="copper">{f}</Pill>)}</div>}

      <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Send a note</div>
      <div className="mt-2 flex items-start gap-2.5">
        <Avatar name="Dr. Meera Iyer" size={30} />
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} aria-label="Note"
          className={clsx(inputClass, 'h-auto flex-1 resize-none py-2.5 leading-relaxed')} />
      </div>
      <Button block size="lg" className="mt-3" icon={Send} onClick={send} disabled={!note.trim()}>Send to {firstNameWithTitle(t)}</Button>
    </div>
  )
}
