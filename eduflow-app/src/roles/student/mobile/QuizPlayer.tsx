/* Quiz player — one question at a time, honest feedback, an explanation every time. */
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
import { useState } from 'react'
import { ArrowRight, Check, CircleQuestionMark, RotateCcw, Users, X } from 'lucide-react'
import { AnimatedNumber, Button, EmptyState, Ring, cx, useToast } from '@/components/ui'
import { MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { Celebrate } from './Celebrate'
import { SubjectChip, staffName, useStudent } from './shared'
import { UpNext } from './UpNext'

type Phase = 'intro' | 'question' | 'result'
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function QuizPlayer({ lessonId }: { lessonId: string }) {
  const { d, s } = useStudent()
  const recordQuiz = useSchool(st => st.recordQuiz)
  const setLessonProgress = useSchool(st => st.setLessonProgress)
  const toast = useToast()
  const nav = useMobileNav()
  const lesson = d.lessons.find(l => l.id === lessonId)!
  const quiz = d.quizzes.find(q => q.id === lesson.quizId)
  const [prior, setPrior] = useState<number | undefined>(quiz?.attempts[s.id])

  const [phase, setPhase] = useState<Phase>('intro')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [earned, setEarned] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [scope, animate] = useAnimate()

  if (!quiz) return <MobileScreen title={lesson.title}><EmptyState icon={CircleQuestionMark} title="Quiz not available" body="Your teacher hasn't attached questions yet." /></MobileScreen>

  const total = quiz.questions.length
  const q = quiz.questions[idx]
  const picked = answers[idx]
  const answered = picked !== undefined
  const score = answers.filter((a, i) => a === quiz.questions[i].answer).length

  const pick = (i: number) => {
    if (answered) return
    setAnswers(a => { const n = [...a]; n[idx] = i; return n })
    if (i !== q.answer && scope.current) animate(scope.current, { x: [0, -10, 10, -7, 7, -3, 0] }, { duration: 0.45 })
  }

  const finish = () => {
    const isBetter = prior === undefined || score > prior
    let pts = 0
    if (isBetter) { recordQuiz(quiz.id, s.id, score); pts += score * 2 }
    if ((lesson.progress[s.id] ?? 0) < 100) { setLessonProgress(lesson.id, s.id, 100); pts += 5 }
    setEarned(pts)
    setPhase('result')
    if (pts > 0) setTimeout(() => setCelebrate(true), 900)
  }

  const next = () => (idx + 1 < total ? setIdx(idx + 1) : finish())
  const restart = () => { setPrior(quiz.attempts[s.id]); setAnswers([]); setIdx(0); setEarned(0); setPhase('question') }

  /* ── intro ── */
  if (phase === 'intro') {
    const teacher = staffName(d, lesson.teacherId)
    return (
      <MobileScreen title={lesson.title} large={false}
        footer={<Button block size="lg" iconRight={ArrowRight} onClick={() => setPhase('question')}>{prior !== undefined ? 'Try again' : 'Start quiz'}</Button>}>
        <div className="px-1 pt-6 text-center">
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-forest-p text-forest"><CircleQuestionMark size={36} strokeWidth={1.6} /></motion.span>
          <div className="mt-4 flex justify-center"><SubjectChip subject={quiz.subject} /></div>
          <h1 className="mx-auto mt-3 max-w-[300px] font-display text-[27px] leading-[1.12]">{quiz.title}</h1>
          <p className="mt-2 text-[14px] text-stone">{total} questions · about {lesson.minutes} minutes · set by {teacher}</p>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2 text-center">
          {[
            { k: 'Questions', v: String(total) },
            { k: 'Per correct', v: '+2 pts' },
            { k: prior !== undefined ? 'Your best' : 'Finishing', v: prior !== undefined ? `${prior}/${total}` : '+5 pts' },
          ].map(x => (
            <div key={x.k} className="rounded-[14px] border border-line bg-ivory-2 px-2 py-3">
              <div className="font-display text-[20px] text-ink">{x.v}</div>
              <div className="text-[11.5px] text-stone">{x.k}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 px-2 text-center text-[13px] leading-relaxed text-stone">You'll see the right answer and why after every question. Take your time — there's no clock.</p>
      </MobileScreen>
    )
  }

  /* ── result ── */
  if (phase === 'result') {
    const live = d.quizzes.find(x => x.id === quiz.id)!
    const all = Object.values(live.attempts)
    const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
    const others = Object.keys(live.attempts).filter(id => id !== s.id).length
    const ratio = score / total
    const headline = ratio === 1 ? 'Full marks.' : ratio >= 0.6 ? 'Strong work.' : 'A good start.'
    const line = ratio === 1 ? 'Every answer right. That chapter is yours.' : ratio >= 0.6 ? `${total - score} to look at again — the explanations below will help.` : 'Read the explanations below, then try it once more before Monday.'
    return (
      <MobileScreen title="Your score" large={false}
        footer={<div className="flex gap-2"><Button variant="outline" size="lg" icon={RotateCcw} onClick={restart}>Retake</Button><Button size="lg" className="flex-1" onClick={() => nav.pop()}>Done</Button></div>}>
        <div className="flex flex-col items-center pt-6 text-center">
          <Ring value={ratio} size={152} stroke={10} tone={ratio >= 0.6 ? 'forest' : 'copper'}>
            <div>
              <div className="font-display text-[44px] leading-none text-ink"><AnimatedNumber value={score} duration={1} /><span className="text-[24px] text-stone">/{total}</span></div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">correct</div>
            </div>
          </Ring>
          <h1 className="mt-5 font-display text-[28px] leading-tight">{headline}</h1>
          <p className="mt-1 max-w-[290px] text-[14px] text-stone">{line}</p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className={cx('mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold', earned > 0 ? 'bg-forest-p text-forest' : 'bg-paper text-stone')}>
            {earned > 0 ? `+${earned} house points for Willow` : 'Practice round — your best score is kept'}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-6 rounded-[16px] border border-line bg-ivory-2 p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone"><Users size={14} /> 9B on this quiz</div>
          <div className="mt-3 flex items-end gap-4">
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-medium text-ink">You</span><span className="tabular text-ink">{score}/{total}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-line-2"><motion.div className="h-full rounded-full bg-forest" initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.9, delay: 1.1 }} /></div>
              <div className="mb-1 mt-3 flex justify-between text-[12.5px]"><span className="text-stone">Class average</span><span className="tabular text-stone">{avg.toFixed(1)}/{total}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-line-2"><motion.div className="h-full rounded-full bg-stone-l" initial={{ width: 0 }} animate={{ width: `${(avg / total) * 100}%` }} transition={{ duration: 0.9, delay: 1.2 }} /></div>
            </div>
          </div>
          <div className="mt-3 text-[12.5px] text-stone">{others} classmate{others === 1 ? '' : 's'} have taken it so far{score > avg ? ' · you are above the class average' : ''}.</div>
        </motion.div>

        <div className="mt-6 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Review</div>
        <div className="mt-2 space-y-2">
          {quiz.questions.map((qq, i) => {
            const ok = answers[i] === qq.answer
            return (
              <div key={i} className="rounded-[14px] border border-line bg-ivory-2 px-4 py-3">
                <div className="flex gap-2.5">
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', ok ? 'bg-forest text-ivory' : 'bg-rust text-ivory')}>{ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium leading-snug text-ink">{qq.q}</div>
                    <div className="mt-1 text-[13px] text-forest">{qq.options[qq.answer]}</div>
                    {!ok && <div className="text-[12.5px] text-rust line-through decoration-rust/40">{qq.options[answers[i]]}</div>}
                    <div className="mt-1 text-[12.5px] leading-snug text-stone">{qq.explain}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <UpNext lessonId={lesson.id} />
        <Celebrate open={celebrate} points={earned} title={headline.replace('.', '')} sub={`${score}/${total} on ${quiz.title}`} onDone={() => { setCelebrate(false); toast(`+${earned} Willow points`) }} />
      </MobileScreen>
    )
  }

  /* ── question ── */
  const correct = answered && picked === q.answer
  return (
    <MobileScreen title={quiz.title} large={false}
      footer={<Button block size="lg" disabled={!answered} iconRight={ArrowRight} onClick={next}>{idx + 1 < total ? 'Next question' : 'See my score'}</Button>}>
      <div className="flex items-center justify-between px-1 pt-3">
        <span className="text-[12.5px] font-medium text-stone tabular">Question {idx + 1} of {total}</span>
        <div className="flex items-center gap-1.5" aria-label="Progress">
          {quiz.questions.map((qq, i) => {
            const a = answers[i]
            const state = a === undefined ? (i === idx ? 'current' : 'todo') : a === qq.answer ? 'right' : 'wrong'
            return (
              <motion.span key={i} layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cx('h-2 rounded-full', i === idx ? 'w-6' : 'w-2', state === 'right' ? 'bg-forest' : state === 'wrong' ? 'bg-rust' : state === 'current' ? 'bg-copper' : 'bg-stone-p')} />
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
          <div ref={scope} className="mt-4 rounded-[20px] border border-line bg-ivory-2 p-5 shadow-1">
            <h2 className="font-display text-[22px] leading-snug">{q.q}</h2>
            <div className="mt-5 space-y-2.5">
              {q.options.map((opt, i) => {
                const isPicked = picked === i
                const isAnswer = i === q.answer
                const tone = !answered ? 'idle' : isAnswer ? 'right' : isPicked ? 'wrong' : 'dim'
                return (
                  <motion.button key={i} onClick={() => pick(i)} disabled={answered}
                    whileTap={!answered ? { scale: 0.98 } : undefined}
                    animate={tone === 'right' && isPicked ? { scale: [1, 1.035, 1] } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className={cx('flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left text-[15px] transition-colors disabled:cursor-default',
                      tone === 'idle' && 'border-line bg-ivory-2 text-ink active:bg-paper',
                      tone === 'right' && 'border-forest bg-forest-p text-forest',
                      tone === 'wrong' && 'border-rust/50 bg-rust-p text-rust',
                      tone === 'dim' && 'border-line-2 bg-ivory-2 text-stone opacity-70')}>
                    <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold',
                      tone === 'right' ? 'bg-forest text-ivory' : tone === 'wrong' ? 'bg-rust text-ivory' : 'bg-paper text-charcoal-2')}>
                      {tone === 'right' ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}><Check size={15} strokeWidth={3} /></motion.span>
                        : tone === 'wrong' ? <X size={15} strokeWidth={3} /> : LETTERS[i]}
                    </span>
                    <span className="flex-1 font-medium">{opt}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {answered && (
          <motion.div key={`ex-${idx}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cx('mt-3 rounded-[16px] px-4 py-3.5', correct ? 'bg-forest-p' : 'bg-copper-p')}>
            <div className={cx('text-[14px] font-semibold', correct ? 'text-forest' : 'text-copper-d')}>{correct ? 'Correct.' : `Not quite — it's ${LETTERS[q.answer]}.`}</div>
            <div className="mt-0.5 text-[14px] leading-relaxed text-charcoal">{q.explain}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileScreen>
  )
}
