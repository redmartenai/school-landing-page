/* LMS for the teacher: what she published, who is keeping up, how the quiz went. */
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CirclePlay, FileText, GraduationCap, ListChecks, Plus, Upload } from 'lucide-react'
import { AnimatedNumber, Avatar, AvatarStack, Bars, Button, EmptyState, Pill, Progress, Ring, Sheet, cx, inputClass, useToast, type Tone } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useData } from '@/store/hooks'
import { useSchool, type SchoolData } from '@/store/school'
import type { Lesson, Quiz } from '@/data/types'
import { ago, firstName } from '@/lib/format'
import { ChoiceChips, IconTile, MCard, ME, useTeacher } from './shared'

const KIND = {
  video: { icon: CirclePlay, label: 'Video', tone: 'copper' },
  notes: { icon: FileText, label: 'Notes', tone: 'slate' },
  quiz: { icon: ListChecks, label: 'Quiz', tone: 'forest' },
} as const satisfies Record<Lesson['kind'], { icon: unknown; label: string; tone: Tone }>

function lessonStats(l: Lesson) {
  const v = Object.values(l.progress)
  const total = v.length || 1
  return {
    total: v.length,
    done: v.filter(p => p >= 100).length,
    started: v.filter(p => p > 0 && p < 100).length,
    notStarted: v.filter(p => p === 0).length,
    avg: v.reduce((a, b) => a + b, 0) / total / 100,
  }
}

function quizStats(d: SchoolData, q: Quiz) {
  const n = q.questions.length
  const scores = Object.values(q.attempts)
  const size = d.classes.find(c => c.id === q.classId)?.studentIds.length ?? 0
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length / n : 0
  const dist = Array.from({ length: n + 1 }, (_, k) => scores.filter(s => s === k).length)
  return { n, attempts: scores.length, size, avg, dist }
}

export function LearnTab() {
  const d = useData()
  const me = useTeacher()
  const nav = useMobileNav()
  const [publishing, setPublishing] = useState(false)
  const lessons = useMemo(() => d.lessons.filter(l => l.teacherId === ME).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [d.lessons])
  const quizzes = d.quizzes.filter(q => me.subjects.includes(q.subject) && me.classIds.includes(q.classId))

  const overall = lessons.length ? lessons.reduce((a, l) => a + lessonStats(l).avg, 0) / lessons.length : 0
  const qAvg = quizzes.length ? quizzes.reduce((a, q) => a + quizStats(d, q).avg, 0) / quizzes.length : 0
  const classes = [...new Set(lessons.map(l => l.classId))]

  return (
    <MobileScreen title="Learn" eyebrow={`${me.subjects[0]} lessons, notes & quizzes`}
      actions={<motion.button whileTap={{ scale: 0.9 }} onClick={() => setPublishing(true)} aria-label="Publish lesson" className="grid h-11 w-11 place-items-center rounded-full text-forest"><Plus size={22} /></motion.button>}>
      <MCard className="flex items-center gap-4">
        <Ring value={overall} size={84} stroke={8} tone={overall >= 0.6 ? 'forest' : 'amber'}>
          <span className="font-display text-[22px] tabular text-ink"><AnimatedNumber value={overall * 100} />%</span>
        </Ring>
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-stone">Class completion</div>
          <p className="mt-0.5 text-[14.5px] leading-snug text-ink">
            {lessons.length ? <>Across {lessons.length} things you published{classes.length ? ` for ${classes.join(', ')}` : ''}, children are <b className="font-semibold">{Math.round(overall * 100)}%</b> of the way through.</> : 'Publish a short lesson — children can finish it on the bus.'}
          </p>
          {quizzes.length > 0 && <div className="mt-1 text-[12.5px] text-stone">Quiz average {Math.round(qAvg * 100)}%</div>}
        </div>
      </MCard>

      <MSection title="Your lessons" action={<button onClick={() => setPublishing(true)} className="min-h-[32px] text-[13px] font-medium text-forest">Publish</button>}>
        {lessons.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Nothing published yet" body="A six-minute video or a page of notes is enough to start." action={<Button icon={Upload} onClick={() => setPublishing(true)}>Publish a lesson</Button>} />
        ) : (
          <div className="space-y-2.5">
            {lessons.map(l => {
              const st = lessonStats(l)
              const k = KIND[l.kind]
              const notStartedNames = Object.entries(l.progress).filter(([, p]) => p === 0).map(([id]) => d.students.find(s => s.id === id)?.name ?? '')
              return (
                <MCard key={l.id} onClick={() => nav.push({ title: l.title, render: () => <LessonDetail lessonId={l.id} /> })}>
                  <div className="flex items-start gap-3">
                    <IconTile icon={k.icon} tone={k.tone} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium leading-snug text-ink">{l.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-stone">{l.classId} · {k.label} · {l.minutes} min · {ago(l.publishedAt)}</div>
                    </div>
                    <span className="font-display text-[20px] tabular text-ink">{Math.round(st.avg * 100)}%</span>
                  </div>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line-2">
                    <motion.div className="h-full bg-forest" initial={{ width: 0 }} animate={{ width: `${(st.done / Math.max(1, st.total)) * 100}%` }} transition={{ duration: 0.8 }} />
                    <motion.div className="h-full bg-amber" initial={{ width: 0 }} animate={{ width: `${(st.started / Math.max(1, st.total)) * 100}%` }} transition={{ duration: 0.8, delay: 0.15 }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[12.5px] text-charcoal-2"><b className="font-semibold text-forest">{st.done}</b> finished · <b className="font-semibold text-[#8a5f14]">{st.started}</b> going</span>
                    {st.notStarted > 0 ? (
                      <span className="flex items-center gap-1.5 text-[12.5px] text-copper-d"><AvatarStack names={notStartedNames} max={3} size={22} />{st.notStarted} not started</span>
                    ) : <span className="text-[12.5px] text-forest">Everyone started</span>}
                  </div>
                </MCard>
              )
            })}
          </div>
        )}
      </MSection>

      {quizzes.map(q => <QuizCard key={q.id} q={q} />)}

      <PublishSheet open={publishing} onClose={() => setPublishing(false)} />
    </MobileScreen>
  )
}

function QuizCard({ q }: { q: Quiz }) {
  const d = useData()
  const st = quizStats(d, q)
  const missing = (d.classes.find(c => c.id === q.classId)?.studentIds ?? []).filter(id => q.attempts[id] === undefined)
  return (
    <MSection title={`Quiz · ${q.classId}`}>
      <MCard>
        <div className="text-[15px] font-medium text-ink">{q.title}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <div className="text-[11.5px] text-stone">Average</div>
            <div className="font-display text-[24px] leading-tight tabular text-ink">{Math.round(st.avg * 100)}%</div>
          </div>
          <div>
            <div className="text-[11.5px] text-stone">Attempted</div>
            <div className="font-display text-[24px] leading-tight tabular text-ink">{st.attempts}<span className="text-[14px] text-stone">/{st.size}</span></div>
          </div>
          <div>
            <div className="text-[11.5px] text-stone">Full marks</div>
            <div className="font-display text-[24px] leading-tight tabular text-forest">{st.dist[st.n]}</div>
          </div>
        </div>
        <div className="mt-4">
          <Bars height={120} data={st.dist.map((v, k) => ({ label: `${k}/${st.n}`, value: v, tone: k / st.n >= 0.8 ? 'forest' : k / st.n >= 0.5 ? 'amber' : 'rust' }))} format={n => `${Math.round(n)} children`} />
        </div>
        <p className="mt-2 text-[12.5px] text-stone">Score out of {st.n}. {st.dist.slice(0, Math.ceil(st.n / 2)).reduce((a, b) => a + b, 0)} children scored under half — worth five minutes at the start of the next class.</p>
        {missing.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-copper-p px-3 py-2 text-[12.5px] text-copper-d">
            <AvatarStack names={missing.map(id => d.students.find(s => s.id === id)?.name ?? '')} max={4} size={22} />
            {missing.length} haven’t tried it yet
          </div>
        )}
      </MCard>
    </MSection>
  )
}

export function LessonDetail({ lessonId }: { lessonId: string }) {
  const d = useData()
  const l = d.lessons.find(x => x.id === lessonId)
  if (!l) return <MobileScreen title="Lesson"><EmptyState icon={GraduationCap} title="Lesson not found" /></MobileScreen>
  const st = lessonStats(l)
  const rows = Object.entries(l.progress).map(([id, p]) => ({ s: d.students.find(x => x.id === id)!, p })).filter(r => r.s).sort((a, b) => a.p - b.p || a.s.rollNo - b.s.rollNo)
  const groups: { title: string; tone: Tone; items: typeof rows }[] = [
    { title: 'Not started', tone: 'copper', items: rows.filter(r => r.p === 0) },
    { title: 'Part way', tone: 'amber', items: rows.filter(r => r.p > 0 && r.p < 100) },
    { title: 'Finished', tone: 'forest', items: rows.filter(r => r.p >= 100) },
  ]
  const k = KIND[l.kind]
  return (
    <MobileScreen title={l.title} eyebrow={`${l.classId} · ${l.chapter}`}>
      <MCard className="flex items-center gap-4">
        <Ring value={st.avg} size={76} stroke={7} tone="forest"><span className="font-display text-[20px] tabular text-ink">{Math.round(st.avg * 100)}%</span></Ring>
        <div className="text-[14px] leading-snug text-charcoal-2">
          <Pill tone={k.tone} icon={k.icon}>{k.label} · {l.minutes} min</Pill>
          <p className="mt-1.5"><b className="text-ink">{st.done}</b> of {st.total} finished. {st.notStarted ? <><b className="text-copper-d">{st.notStarted}</b> haven’t opened it.</> : 'Everyone has opened it.'}</p>
        </div>
      </MCard>
      {groups.map(g => g.items.length > 0 && (
        <MSection key={g.title} title={`${g.title} · ${g.items.length}`}>
          <MList>
            {g.items.map(({ s, p }) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={s.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-[14.5px] text-ink">{s.name}</span>
                {g.tone === 'amber' ? <div className="w-20"><Progress value={p / 100} tone="amber" /></div> : null}
                <span className={cx('w-10 text-right text-[12.5px] tabular', g.tone === 'forest' ? 'text-forest' : g.tone === 'copper' ? 'text-copper-d' : 'text-stone')}>{p}%</span>
              </div>
            ))}
          </MList>
        </MSection>
      ))}
      <p className="mt-4 px-2 text-center text-[12.5px] text-stone">Ask {firstName(groups[0].items[0]?.s.name ?? 'them')} and the others to open it before your next {l.classId} period.</p>
    </MobileScreen>
  )
}

function PublishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useTeacher()
  const d = useData()
  const publish = useSchool(s => s.publishLesson)
  const toast = useToast()
  const [classId, setClassId] = useState(me.classTeacherOf ?? me.classIds[0])
  const [kind, setKind] = useState<Lesson['kind']>('video')
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('Ch 4 · Quadratic Equations')
  const [minutes, setMinutes] = useState<'5' | '10' | '15' | '20'>('10')
  const size = d.classes.find(c => c.id === classId)?.studentIds.length ?? 0

  const submit = () => {
    if (!title.trim()) return
    publish({ classId, subject: me.subjects[0] ?? 'Mathematics', title: title.trim(), kind, minutes: Number(minutes), chapter: chapter.trim() || 'General' }, ME)
    toast(`Published to ${size} children in ${classId}`)
    setTitle('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Publish a lesson"
      footer={<Button block size="lg" icon={Upload} disabled={!title.trim()} onClick={submit}>Publish to {classId} · {size} children</Button>}>
      <span className="mb-2 block text-[12.5px] font-medium text-charcoal-2">Class</span>
      <ChoiceChips group="pub-class" value={classId} onChange={setClassId} options={me.classIds.map(id => ({ id, label: id }))} />
      <span className="mb-2 mt-4 block text-[12.5px] font-medium text-charcoal-2">Kind</span>
      <ChoiceChips group="pub-kind" value={kind} onChange={setKind}
        options={(Object.keys(KIND) as Lesson['kind'][]).map(k => ({ id: k, label: KIND[k].label }))} />
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">Title</span>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Nature of roots, in five examples" className={cx(inputClass, 'h-12 text-[15px]')} />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">Chapter</span>
        <input value={chapter} onChange={e => setChapter(e.target.value)} className={cx(inputClass, 'h-12 text-[15px]')} />
      </label>
      <span className="mb-2 mt-4 block text-[12.5px] font-medium text-charcoal-2">Length</span>
      <ChoiceChips group="pub-min" value={minutes} onChange={setMinutes} options={(['5', '10', '15', '20'] as const).map(m => ({ id: m, label: `${m} min` }))} />
    </Sheet>
  )
}

