/* Learn — lessons, notes and quizzes her teachers have published for 9B. */
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react'
import { AnimatedNumber, EmptyState, Ring, Tabs, cx } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import type { Lesson, Subject } from '@/data/types'
import { lessonScreen } from './open'
import { KIND_META, MiniRing, Panel, SUBJECT_STYLE, SubjectChip, SubjectGlyph, staffName, teacherShort, useStudent } from './shared'

export function LearnTab() {
  const { d, s } = useStudent()
  const nav = useMobileNav()
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const lessons = useMemo(() => d.lessons.filter(l => l.classId === s.classId), [d.lessons, s.classId])
  const pctOf = (l: Lesson) => l.progress[s.id] ?? 0

  const done = lessons.filter(l => pctOf(l) >= 100)
  const minutes = Math.round(lessons.reduce((a, l) => a + (l.minutes * pctOf(l)) / 100, 0))
  const quizzes = d.quizzes.filter(q => q.classId === s.classId)
  const quizzesTaken = quizzes.filter(q => q.attempts[s.id] !== undefined).length
  const resume = [...lessons].filter(l => pctOf(l) > 0 && pctOf(l) < 100).sort((a, b) => pctOf(b) - pctOf(a))[0]
    ?? lessons.find(l => pctOf(l) === 0)

  const visible = lessons.filter(l => filter === 'all' || (filter === 'done' ? pctOf(l) >= 100 : pctOf(l) < 100))
  const bySubject = useMemo(() => {
    const m = new Map<Subject, Map<string, Lesson[]>>()
    for (const l of visible) {
      if (!m.has(l.subject)) m.set(l.subject, new Map())
      const ch = m.get(l.subject)!
      ch.set(l.chapter, [...(ch.get(l.chapter) ?? []), l])
    }
    return [...m.entries()]
  }, [visible])

  return (
    <MobileScreen title="Learn" eyebrow={`${s.classId} · ${lessons.length} lessons from your teachers`}>
      {/* progress summary */}
      <Panel className="flex items-center gap-4 p-4">
        <Ring value={lessons.length ? done.length / lessons.length : 0} size={74} stroke={7} tone="forest">
          <div className="font-display text-[20px] leading-none text-ink"><AnimatedNumber value={done.length} /><span className="text-[13px] text-stone">/{lessons.length}</span></div>
        </Ring>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1">
          <div className="col-span-2 font-display text-[18px] leading-tight text-ink">{done.length >= lessons.length ? 'All caught up' : `${lessons.length - done.length} lessons to go`}</div>
          <div><div className="font-display text-[19px] text-ink tabular"><AnimatedNumber value={minutes} /> min</div><div className="text-[11.5px] text-stone">learned</div></div>
          <div><div className="font-display text-[19px] text-ink tabular">{quizzesTaken}/{quizzes.length}</div><div className="text-[11.5px] text-stone">quizzes taken</div></div>
        </div>
      </Panel>

      {/* continue */}
      {resume && (
        <MSection title={pctOf(resume) > 0 ? 'Continue where you left off' : 'Start something new'}>
          <ContinueCard lesson={resume} pct={pctOf(resume)} teacher={teacherShort(staffName(d, resume.teacherId))} onOpen={() => nav.push(lessonScreen(resume))} />
        </MSection>
      )}

      <MSection title="Subjects" action={<span className="text-[12px] text-stone">{done.length} complete</span>}>
        <Tabs size="sm" className="mb-3" value={filter} onChange={setFilter}
          tabs={[{ id: 'all', label: 'All', count: lessons.length }, { id: 'todo', label: 'To do', count: lessons.length - done.length }, { id: 'done', label: 'Done', count: done.length }]} />
        {bySubject.length === 0 && <EmptyState icon={BookOpen} title={filter === 'done' ? 'Nothing finished yet' : 'Nothing left to do'} body={filter === 'done' ? 'Finish a lesson and it will show up here.' : 'Every lesson is complete. Lovely.'} />}
        <div className="space-y-4">
          {bySubject.map(([subject, chapters]) => {
            const all = [...chapters.values()].flat()
            const subjPct = Math.round(all.reduce((a, l) => a + pctOf(l), 0) / all.length)
            return (
              <motion.div key={subject} layout variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                <div className="mb-1.5 flex items-center gap-2.5 px-1">
                  <SubjectGlyph subject={subject} size={30} />
                  <span className="flex-1 text-[15px] font-semibold text-ink">{subject}</span>
                  <span className="text-[12px] tabular text-stone">{subjPct}%</span>
                </div>
                <MList>
                  {[...chapters.entries()].map(([chapter, ls]) => (
                    <div key={chapter}>
                      <div className="bg-paper/50 px-4 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em]" style={{ color: SUBJECT_STYLE[subject].fg }}>{chapter}</div>
                      {ls.map(l => <LessonRow key={l.id} lesson={l} pct={pctOf(l)} onOpen={() => nav.push(lessonScreen(l))} />)}
                    </div>
                  ))}
                </MList>
              </motion.div>
            )
          })}
        </div>
      </MSection>
    </MobileScreen>
  )
}

function ContinueCard({ lesson, pct, teacher, onOpen }: { lesson: Lesson; pct: number; teacher: string; onOpen: () => void }) {
  const K = KIND_META[lesson.kind]
  const left = Math.max(1, Math.round(lesson.minutes * (1 - pct / 100)))
  return (
    <Panel onClick={onOpen} className="overflow-hidden">
      <div className="relative bg-forest px-4 pb-4 pt-3.5 text-ivory">
        <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full border border-ivory/10" />
        <div className="absolute -right-2 -top-4 h-20 w-20 rounded-full border border-ivory/10" />
        <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.12em] text-ivory/70"><K.icon size={14} /> {K.label} · {lesson.chapter}</div>
        <div className="mt-2 pr-10 font-display text-[21px] leading-snug text-ivory">{lesson.title}</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory/15">
          <motion.div className="h-full rounded-full bg-copper-l" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <SubjectChip subject={lesson.subject} />
        <span className="flex-1 truncate text-[12.5px] text-stone">{pct > 0 ? `${pct}% · ${left} min left` : `${lesson.minutes} min`} · {teacher}</span>
        <span className="flex items-center gap-1 text-[13.5px] font-semibold text-forest">{pct > 0 ? 'Resume' : K.verb} <ArrowRight size={15} /></span>
      </div>
    </Panel>
  )
}

function LessonRow({ lesson, pct, onOpen }: { lesson: Lesson; pct: number; onOpen: () => void }) {
  const K = KIND_META[lesson.kind]
  const done = pct >= 100
  return (
    <motion.button whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }} onClick={onOpen}
      className="flex w-full items-center gap-3 border-t border-line-2 px-4 py-3 text-left first:border-t-0">
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', done ? 'bg-forest-p text-forest' : 'bg-paper text-charcoal-2')}><K.icon size={18} strokeWidth={1.8} /></span>
      <span className="min-w-0 flex-1">
        <span className={cx('block truncate text-[15px] font-medium', done ? 'text-charcoal-2' : 'text-ink')}>{lesson.title}</span>
        <span className="block truncate text-[12.5px] text-stone">{K.label} · {lesson.minutes} min{done ? ' · done' : pct > 0 ? ` · ${pct}%` : ''}</span>
      </span>
      <MiniRing pct={pct} />
      <ChevronRight size={16} className="text-stone-l" />
    </motion.button>
  )
}
