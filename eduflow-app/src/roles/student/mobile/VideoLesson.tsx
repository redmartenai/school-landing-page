/* Lesson player — a calm, dark 16:9 stage. Playing moves real progress into the school store at each quarter. */
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { Avatar, Button, cx, useToast } from '@/components/ui'
import { MobileScreen } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { Celebrate } from './Celebrate'
import { AskDoubtSheet } from './Messages'
import { VIDEO_CHAPTERS, fallbackChapters } from './content'
import { SubjectChip, staffName, teacherShort, useStudent } from './shared'
import { UpNext } from './UpNext'

/** Demo playback runs faster than real time so a 14-minute lesson can be finished on stage. */
const DEMO_RATE = 14
const MILESTONES = [25, 50, 75, 100]

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

export function VideoLesson({ lessonId }: { lessonId: string }) {
  const { d, s } = useStudent()
  const setLessonProgress = useSchool(st => st.setLessonProgress)
  const toast = useToast()
  const lesson = d.lessons.find(l => l.id === lessonId)!
  const total = lesson.minutes * 60
  const stored = lesson.progress[s.id] ?? 0
  const chapters = VIDEO_CHAPTERS[lesson.id] ?? fallbackChapters(lesson.title)

  const [pos, setPos] = useState(() => (stored >= 100 ? 0 : (stored / 100) * total))
  const [playing, setPlaying] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [ask, setAsk] = useState(false)
  const reached = useRef(stored) // highest milestone already written to the store
  const wasComplete = useRef(stored >= 100)

  // playback clock
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setPos(p => Math.min(total, p + DEMO_RATE * 0.1)), 100)
    return () => clearInterval(t)
  }, [playing, total])

  // quarter milestones → store; completion → +5 house points (awarded by the store, once)
  useEffect(() => {
    if (!playing) return
    const pct = (pos / total) * 100
    for (const m of MILESTONES) {
      if (pct >= m - 0.01 && reached.current < m) {
        reached.current = m
        if (m === 100 && wasComplete.current) continue
        setLessonProgress(lesson.id, s.id, m)
        if (m === 100) { wasComplete.current = true; setCelebrate(true) }
      }
    }
    if (pos >= total) setPlaying(false)
  }, [pos, playing, total, lesson.id, s.id, setLessonProgress])

  const frac = pos / total
  const chapterIdx = Math.max(0, chapters.findLastIndex(c => c.at <= frac + 1e-6))
  const chapter = chapters[chapterIdx]
  const done = stored >= 100

  // scrubbing
  const bar = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const seekTo = useCallback((clientX: number) => {
    const r = bar.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * total)
  }, [total])

  const toggle = () => {
    if (pos >= total) setPos(0)
    setPlaying(p => !p)
  }
  const teacher = staffName(d, lesson.teacherId)

  return (
    <MobileScreen title={lesson.title} large={false}>
      {/* stage */}
      <div className="-mx-4 mt-1 overflow-hidden bg-[#1b1714] text-ivory shadow-3">
        <div className="relative aspect-video select-none" onClick={toggle}>
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#F8F5EF 1px, transparent 1px), linear-gradient(90deg, #F8F5EF 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="absolute left-3.5 top-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ivory/55">
            <span className="tabular">{String(chapterIdx + 1).padStart(2, '0')}</span>
            <span className="h-px w-4 bg-ivory/30" />
            <span className="truncate">{chapter.title}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={chapterIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="font-display text-[25px] leading-tight text-ivory">{chapter.board}</div>
              <div className="mt-2 max-w-[290px] text-[12.5px] leading-snug text-ivory/65">{chapter.caption}</div>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {!playing && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15 }} transition={{ duration: 0.22 }}
                className="absolute inset-0 grid place-items-center bg-[#1b1714]/70">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-ivory/92 text-ink shadow-3">
                  <Play size={26} fill="currentColor" className="ml-1" />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* controls */}
        <div className="px-4 pb-3.5 pt-1">
          <div ref={bar} className="relative h-6 cursor-pointer touch-none"
            onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekTo(e.clientX) }}
            onPointerMove={e => { if (dragging.current) seekTo(e.clientX) }}
            onPointerUp={() => { dragging.current = false }}>
            <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-ivory/15" />
            <div className="absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-ivory/25" style={{ width: `${Math.max(stored, frac * 100)}%` }} />
            <div className="absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-copper-l" style={{ width: `${frac * 100}%` }} />
            {chapters.slice(1).map(c => <span key={c.at} className="absolute top-1/2 h-[8px] w-[2px] -translate-y-1/2 rounded bg-[#1b1714]" style={{ left: `${c.at * 100}%` }} />)}
            <motion.span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory shadow" style={{ left: `${frac * 100}%` }} whileTap={{ scale: 1.3 }} />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="w-20 text-[12px] tabular text-ivory/60">{clock(pos)} / {clock(total)}</span>
            <div className="flex items-center gap-4">
              <motion.button whileTap={{ scale: 0.88 }} aria-label="Back 10 seconds" onClick={() => setPos(p => Math.max(0, p - 10))} className="text-ivory/80"><RotateCcw size={20} /></motion.button>
              <motion.button whileTap={{ scale: 0.9 }} aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full bg-ivory text-ink">
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} aria-label="Forward 10 seconds" onClick={() => setPos(p => Math.min(total, p + 10))} className="text-ivory/80"><RotateCw size={20} /></motion.button>
            </div>
            <span className="w-20 text-right text-[11px] text-ivory/45">{playing ? `${DEMO_RATE}× demo` : ''}</span>
          </div>
        </div>
      </div>

      {/* meta */}
      <div className="mt-4 px-1">
        <div className="flex items-center gap-2"><SubjectChip subject={lesson.subject} /><span className="text-[12.5px] text-stone">{lesson.chapter}</span></div>
        <h1 className="mt-2 font-display text-[23px] leading-tight">{lesson.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-stone">
          <Avatar name={teacher} size={22} /> {teacher} · {lesson.minutes} min
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-line bg-ivory-2 px-3.5 py-3">
          <div className="flex-1">
            <div className="text-[13px] font-medium text-ink">{done ? 'Watched — nicely done' : stored > 0 ? `You've watched ${stored}%` : 'Not started yet'}</div>
            <div className="text-[12px] text-stone">{done ? 'Rewatch any chapter before the test.' : `Finish it for +5 Willow points · ${Math.max(1, Math.round(lesson.minutes * (1 - stored / 100)))} min left`}</div>
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line-2">
            <motion.div className={cx('h-full rounded-full', done ? 'bg-forest' : 'bg-copper')} animate={{ width: `${stored}%` }} transition={{ duration: 0.6 }} />
          </div>
        </div>
      </div>

      {/* chapters */}
      <div className="mt-5 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">In this lesson</div>
      <div className="mt-2 overflow-hidden rounded-[16px] border border-line bg-ivory-2">
        {chapters.map((c, i) => {
          const on = i === chapterIdx
          const watched = Math.max(stored / 100, frac) > (chapters[i + 1]?.at ?? 1) - 0.001
          return (
            <motion.button key={c.at} whileTap={{ scale: 0.99 }} onClick={() => { setPos(c.at * total); setPlaying(true) }}
              className={cx('flex w-full items-center gap-3 border-b border-line-2 px-4 py-3 text-left last:border-0', on && 'bg-copper-p/50')}>
              <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold tabular', watched ? 'bg-forest-p text-forest' : on ? 'bg-copper text-ivory' : 'bg-paper text-stone')}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium text-ink">{c.title}</span>
                <span className="block truncate text-[12px] text-stone">{c.board}</span>
              </span>
              <span className="text-[12px] tabular text-stone">{clock(c.at * total)}</span>
            </motion.button>
          )
        })}
      </div>

      <Button variant="outline" block className="mt-4" icon={MessageCircle} onClick={() => setAsk(true)}>Ask {teacherShort(teacher)} a doubt</Button>
      <UpNext lessonId={lesson.id} />

      <AskDoubtSheet open={ask} onClose={() => setAsk(false)} subject={lesson.subject} context={`${lesson.title} · ${chapter.title}`} />
      <Celebrate open={celebrate} points={5} title="Lesson complete" sub={lesson.title} onDone={() => { setCelebrate(false); toast('Lesson complete · +5 Willow points') }} />
    </MobileScreen>
  )
}
