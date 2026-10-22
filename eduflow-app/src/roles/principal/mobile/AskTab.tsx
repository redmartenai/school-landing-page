import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ArrowUp, Search, Sparkles } from 'lucide-react'
import { MobileScreen, MSection } from '@/components/shell/Mobile'
import { AskAnswer } from '@/components/AskPanel'
import { ease, fadeUp } from '@/components/ui'
import { useData } from '@/store/hooks'
import { ask, SUGGESTIONS } from '@/engine/ask'

interface Turn { id: number; q: string }
let turnSeq = 0

export function AskTab() {
  const d = useData()
  const [text, setText] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  // answers are recomputed against the live school, so a register marked elsewhere updates the answer in place
  const answers = useMemo(() => turns.map(t => ({ ...t, answer: ask(d, t.q) })), [d, turns])

  const run = (q: string) => {
    const clean = q.trim()
    if (!clean) return
    setTurns(ts => [{ id: ++turnSeq, q: clean }, ...ts].slice(0, 12))
    setText('')
  }

  const [latest, ...earlier] = answers

  return (
    <MobileScreen eyebrow="Ask EduFlow" title="What do you want to know?"
      footer={
        <div>
          <div className="no-scrollbar -mx-4 mb-2.5 flex gap-1.5 overflow-x-auto px-4">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => run(s)} className="shrink-0 rounded-full border border-line bg-ivory px-3 py-1.5 text-[12.5px] text-charcoal-2 active:bg-paper">{s}</button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); run(text) }} className="flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-ivory px-4 focus-within:border-forest-l">
              <Sparkles size={15} className="shrink-0 text-copper" />
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Who is absent today?" enterKeyHint="send"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-stone-l" aria-label="Ask a question" />
            </div>
            <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!text.trim()} aria-label="Ask"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-ivory disabled:opacity-40"><ArrowUp size={19} strokeWidth={2.4} /></motion.button>
          </form>
        </div>
      }>
      {!latest ? (
        <motion.div variants={fadeUp}>
          <p className="px-1 text-[14.5px] leading-relaxed text-charcoal-2">Ask in plain words. EduFlow reads attendance, marks, fees, staff and buses together and answers with names.</p>
          <div className="mt-4 space-y-1.5">
            {SUGGESTIONS.slice(0, 6).map((s, i) => (
              <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03, ease: ease.out }}
                onClick={() => run(s)} className="flex w-full items-center gap-3 rounded-[12px] border border-line bg-ivory-2 px-3.5 py-3 text-left text-[14.5px] text-ink active:bg-paper">
                <Search size={15} className="shrink-0 text-stone" /> {s}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={latest.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: ease.out }}>
              <div className="mb-3 ml-auto w-fit max-w-[85%] rounded-[16px] rounded-br-[6px] bg-ink px-3.5 py-2 text-[14.5px] text-ivory">{latest.q}</div>
              <AskAnswer answer={latest.answer} onFollowUp={run} compact />
            </motion.div>
          </AnimatePresence>
          {earlier.length > 0 && (
            <MSection title="Earlier" className="!mt-8">
              <div className="space-y-2">
                {earlier.map(t => (
                  <motion.button layout key={t.id} onClick={() => run(t.q)} className="block w-full rounded-[12px] border border-line bg-ivory-2 px-3.5 py-2.5 text-left">
                    <div className="text-[14px] font-medium text-ink">{t.q}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12.5px] text-stone">{t.answer.summary}</div>
                  </motion.button>
                ))}
              </div>
            </MSection>
          )}
        </>
      )}
    </MobileScreen>
  )
}
