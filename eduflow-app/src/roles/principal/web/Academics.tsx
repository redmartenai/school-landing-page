import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, Check, CheckCheck, Clock, GraduationCap, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, Bars, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Tabs, cx, spring, useToast } from '@/components/ui'
import { useData, useNow } from '@/store/hooks'
import { useSchool, SUBJECTS } from '@/store/school'
import { daysBetween } from '@/lib/format'
import type { Exam, Subject } from '@/data/types'
import { HEX, ME, plural, useNameOf } from './shared'

const SHORT: Record<Subject, string> = { Mathematics: 'Maths', Science: 'Science', English: 'English', Hindi: 'Hindi', 'Social Studies': 'Social St.', 'Computer Science': 'Computer' }
const CELL: Record<Exam['status'], { bg: string; border: string; ink: string; label: string }> = {
  pending: { bg: HEX.rustP, border: HEX.rust, ink: HEX.rust, label: 'Not submitted' },
  submitted: { bg: HEX.amberP, border: HEX.amber, ink: '#8a5f14', label: 'Ready to publish' },
  published: { bg: HEX.forestP, border: '#C9DCD4', ink: HEX.forest, label: 'Published' },
}

export function AcademicsPage() {
  const d = useData()
  const now = useNow()
  const nameOf = useNameOf()
  const publish = useSchool(s => s.publishMarks)
  const nudge = useSchool(s => s.nudge)
  const toast = useToast()
  const [scope, setScope] = useState('all')

  const exam = (c: string, s: Subject) => d.exams.find(e => e.classId === c && e.subject === s)
  const counts = { pending: 0, submitted: 0, published: 0 }
  for (const e of d.exams) counts[e.status]++
  const submitted = d.exams.filter(e => e.status === 'submitted')

  const pendingByTeacher = useMemo(() => {
    const m = new Map<string, Exam[]>()
    for (const e of d.exams) if (e.status === 'pending') m.set(e.teacherId, [...(m.get(e.teacherId) ?? []), e])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [d.exams])

  const averages = useMemo(() => SUBJECTS.map(sub => {
    const pool = d.students.filter(s => scope === 'all' || s.classId === scope)
    const ut2 = pool.map(s => s.marks[sub].unitTest2).filter((x): x is number => x !== null)
    const before = pool.map(s => (s.marks[sub].unitTest1 + s.marks[sub].term1) / 2)
    const b = before.reduce((a, x) => a + x, 0) / (before.length || 1)
    const n = ut2.length ? ut2.reduce((a, x) => a + x, 0) / ut2.length : 0
    return { sub, now: n, before: b, has: ut2.length > 0 }
  }), [d.students, scope])

  const publishOne = (e: Exam) => { publish(e.id, ME); toast(`${e.classId} ${e.subject} published to parents`) }
  const publishAll = () => { for (const e of submitted) publish(e.id, ME); toast(`${plural(submitted.length, 'result')} published to parents`) }
  const remind = (tid: string, list: Exam[]) => {
    nudge(tid, 'Unit Test 2 marks overdue', `Please submit ${list.map(e => `${e.classId} ${e.subject}`).join(', ')}. The 3 October deadline has passed and report cards are blocked. — Dr. Iyer`, ME)
    toast(`Reminded ${nameOf(tid)}`)
  }

  return (
    <Page>
      <PageHeader eyebrow="Academics · Unit Test 2"
        title={counts.pending ? `${counts.pending} result sets are holding up report cards` : 'Every Unit Test 2 result is in'}
        subtitle={`${counts.published} published, ${counts.submitted} waiting for your sign-off, ${counts.pending} not submitted. Deadline was 3 October.`}
        actions={submitted.length > 0 && <Button icon={CheckCheck} onClick={publishAll}>Publish all {submitted.length} ready</Button>} />

      <Card padded={false} className="p-4 md:p-5">
        <CardHeader eyebrow="Submission matrix" title="Classes × subjects"
          action={<div className="hidden flex-wrap gap-1.5 sm:flex"><Pill tone="rust" dot>{counts.pending} pending</Pill><Pill tone="amber" dot>{counts.submitted} submitted</Pill><Pill tone="forest" dot>{counts.published} published</Pill></div>} />
        <div className="scroll-quiet overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-1.5 text-[12.5px]">
            <thead>
              <tr>
                <th className="w-14 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-stone">Class</th>
                {SUBJECTS.map(s => <th key={s} className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-stone">{SHORT[s]}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.classes.map(c => (
                <tr key={c.id}>
                  <td className="font-display text-[17px] text-ink">{c.id}</td>
                  {SUBJECTS.map(s => {
                    const e = exam(c.id, s)
                    if (!e) return <td key={s} className="text-stone-l">—</td>
                    const st = CELL[e.status]
                    const overdue = e.status === 'pending' ? daysBetween(e.deadline, now) : 0
                    return (
                      <td key={s} className="p-0">
                        <motion.div initial={false} animate={{ backgroundColor: st.bg, borderColor: st.border }} transition={{ duration: 0.5 }}
                          style={{ borderWidth: 1, borderStyle: 'solid' }} className="flex h-[58px] flex-col justify-between rounded-[9px] px-2 py-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-[11.5px] text-charcoal-2">{nameOf(e.teacherId).replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ').slice(-1)[0]}</span>
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span key={e.status} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} style={{ color: st.ink }}>
                                {e.status === 'published' ? <Check size={13} strokeWidth={2.6} /> : e.status === 'submitted' ? <Clock size={13} /> : <span className="text-[11px] font-semibold">{overdue}d</span>}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                          {e.status === 'submitted' ? (
                            <button onClick={() => publishOne(e)} className="inline-flex items-center gap-1 self-start rounded-[6px] bg-ivory-2/80 px-1.5 py-0.5 text-[11px] font-medium text-forest hover:bg-ivory-2">
                              <Send size={10} /> Publish to parents
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium" style={{ color: st.ink }}>{e.status === 'pending' ? `${overdue} days late` : 'Parents told'}</span>
                          )}
                        </motion.div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padded={false} className="min-w-0 p-4 md:p-5">
          <CardHeader eyebrow="Unit Test 2 average by subject" title={scope === 'all' ? 'Whole school' : `Class ${scope}`} />
          <Tabs size="sm" className="mb-4" value={scope} onChange={setScope} tabs={[{ id: 'all', label: 'School' }, ...d.classes.map(c => ({ id: c.id, label: c.id }))]} />
          <Bars height={190} max={100} format={n => `${Math.round(n)}`}
            data={averages.map(a => ({ label: SHORT[a.sub], value: a.has ? a.now : 0, tone: !a.has ? 'stone' : a.now < a.before - 5 ? 'rust' : a.now < a.before - 1 ? 'copper' : 'forest' }))} />
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-3">
            {averages.map(a => (
              <div key={a.sub} className="flex justify-between gap-2">
                <span className="text-stone">{SHORT[a.sub]}</span>
                {a.has ? (
                  <span className={cx('tabular font-medium', a.now < a.before - 1 ? 'text-rust' : 'text-forest')}>
                    {Math.round(a.now)} <span className="font-normal text-stone">({a.now - a.before >= 0 ? '+' : '−'}{Math.abs(a.now - a.before).toFixed(1)})</span>
                  </span>
                ) : <span className="text-[#8a5f14]">awaiting marks</span>}
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false} className="h-fit p-4 md:p-5">
          <CardHeader eyebrow="Who to chase" title="Marks not submitted" />
          {pendingByTeacher.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Every teacher has submitted" body="Nothing to chase. Publish what is ready." />
          ) : (
            <div className="divide-y divide-line-2">
              {pendingByTeacher.map(([tid, list]) => (
                <div key={tid} className="flex items-center gap-3 py-3">
                  <Avatar name={nameOf(tid)} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">{nameOf(tid)}</div>
                    <div className="truncate text-[12px] text-rust">{list[0].subject} · {list.map(e => e.classId).join(', ')}</div>
                  </div>
                  <Button size="sm" variant="outline" icon={BellRing} onClick={() => remind(tid, list)}>Remind</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  )
}
