/* Notes reader — set like a good textbook page, not a PDF in a box. */
import { motion } from 'framer-motion'
import { useState } from 'react'
import { BookOpenCheck, Lightbulb, MessageCircle } from 'lucide-react'
import { Avatar, Button, cx, useToast } from '@/components/ui'
import { MobileScreen } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { Celebrate } from './Celebrate'
import { AskDoubtSheet } from './Messages'
import { NOTES, type NoteBlock } from './content'
import { SubjectChip, staffName, teacherShort, useStudent } from './shared'
import { UpNext } from './UpNext'

function Block({ b, hi }: { b: NoteBlock; hi: boolean }) {
  switch (b.t) {
    case 'h': return <h2 className={cx('mb-2 mt-7 font-display text-[20px] leading-tight', hi && 'font-sans font-semibold')}>{b.text}</h2>
    case 'p': return <p className="mb-3 text-[15.5px] leading-[1.7] text-charcoal">{b.text}</p>
    case 'math': return (
      <div className="my-3 rounded-[12px] border border-line-2 bg-paper/70 px-4 py-3">
        <div className="text-center font-display text-[19px] tracking-wide text-ink tabular">{b.text}</div>
        {b.note && <div className="mt-1 text-center text-[12.5px] text-stone">{b.note}</div>}
      </div>
    )
    case 'steps': return (
      <ol className="my-3 space-y-2.5">
        {b.items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.6] text-charcoal">
            <span className="mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-forest-p text-[11.5px] font-semibold text-forest tabular">{i + 1}</span>
            <span>{it}</span>
          </li>
        ))}
      </ol>
    )
    case 'callout': return (
      <div className="my-4 rounded-[14px] border border-copper/20 bg-copper-p px-4 py-3.5">
        <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-copper-d"><Lightbulb size={14} /> {b.title}</div>
        <div className="text-[14.5px] leading-[1.6] text-charcoal">{b.text}</div>
      </div>
    )
    case 'quote': return (
      <blockquote className="my-5 border-l-2 border-copper pl-4">
        <p className="font-display text-[18px] italic leading-snug text-ink">{b.text}</p>
        {b.by && <footer className="mt-1 text-[12.5px] text-stone">— {b.by}</footer>}
      </blockquote>
    )
  }
}

export function NotesReader({ lessonId }: { lessonId: string }) {
  const { d, s } = useStudent()
  const setLessonProgress = useSchool(st => st.setLessonProgress)
  const toast = useToast()
  const [celebrate, setCelebrate] = useState(false)
  const [ask, setAsk] = useState(false)
  const lesson = d.lessons.find(l => l.id === lessonId)!
  const pct = lesson.progress[s.id] ?? 0
  const done = pct >= 100
  const notes = NOTES[lesson.id]
  const teacher = staffName(d, lesson.teacherId)
  const hi = notes?.lang === 'hi'

  const markRead = () => {
    if (done) return
    setLessonProgress(lesson.id, s.id, 100)
    setCelebrate(true)
  }

  return (
    <MobileScreen title={lesson.title} large={false}
      footer={done
        ? <div className="flex h-12 items-center justify-center gap-2 text-[14.5px] font-medium text-forest"><BookOpenCheck size={18} /> You've read this one</div>
        : <Button block size="lg" icon={BookOpenCheck} onClick={markRead}>Mark as read · +5 points</Button>}>
      <article className="px-1 pt-2" lang={hi ? 'hi' : 'en'}>
        <div className="flex items-center gap-2"><SubjectChip subject={lesson.subject} /><span className="truncate text-[12.5px] text-stone">{lesson.chapter}</span></div>
        <h1 className="mt-3 font-display text-[28px] leading-[1.12]">{lesson.title}</h1>
        <div className="mt-2.5 flex items-center gap-2 text-[13px] text-stone">
          <Avatar name={teacher} size={22} /> {teacher} · {lesson.minutes} min read
          {pct > 0 && !done && <span className="ml-auto rounded-full bg-copper-p px-2 py-0.5 text-[11.5px] font-medium text-copper-d">{pct}% last time</span>}
        </div>
        {notes ? (
          <>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-5 border-b border-line-2 pb-5 font-display text-[18px] leading-[1.5] text-charcoal">{notes.intro}</motion.p>
            {notes.blocks.map((b, i) => <Block key={i} b={b} hi={hi} />)}
          </>
        ) : (
          <p className="mt-6 text-[15px] leading-[1.7] text-charcoal">{teacher} has shared these notes in class. Read them alongside your textbook, then mark them as read.</p>
        )}
        <Button variant="outline" block className="mt-7" icon={MessageCircle} onClick={() => setAsk(true)}>Something unclear? Ask {teacherShort(teacher)}</Button>
        <UpNext lessonId={lesson.id} />
      </article>
      <AskDoubtSheet open={ask} onClose={() => setAsk(false)} subject={lesson.subject} context={lesson.title} />
      <Celebrate open={celebrate} points={5} title="Notes read" sub={lesson.title} onDone={() => { setCelebrate(false); toast('Notes read · +5 Willow points') }} />
    </MobileScreen>
  )
}
