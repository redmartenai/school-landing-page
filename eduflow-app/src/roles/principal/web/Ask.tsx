import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CornerDownLeft, Search, Sparkles, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Card, CardHeader, Eyebrow, Page, PageHeader, cx, ease, listItem } from '@/components/ui'
import { AskAnswer, useAsk } from '@/components/AskPanel'
import { SUGGESTIONS, ask } from '@/engine/ask'
import { useData, useNow } from '@/store/hooks'
import { TwoCol } from '@/components/shell/Web'

interface Asked { q: string; at: string; summary: string }

export function AskPage() {
  const { question, answer, run, clear } = useAsk()
  const now = useNow()
  const d = useData()
  const [text, setText] = useState('')
  const [history, setHistory] = useState<Asked[]>([])
  const input = useRef<HTMLInputElement>(null)

  const go = (q: string) => {
    const t = q.trim()
    if (!t) return
    setText(t)
    run(t)
    setHistory(h => [{ q: t, at: now.slice(11, 16), summary: ask(d, t).summary }, ...h.filter(x => x.q.toLowerCase() !== t.toLowerCase())].slice(0, 12))
  }

  return (
    <Page>
      <PageHeader eyebrow="Ask EduFlow" title="Ask your school a question" subtitle="Plain English in, a named list out. Every answer reads live from the same data your staff are updating right now." />
      <TwoCol
        main={<>
          <Card padded={false} className="p-2">
            <form onSubmit={e => { e.preventDefault(); go(text) }} className="flex items-center gap-3 px-3">
              <Sparkles size={20} className="shrink-0 text-copper" />
              <input ref={input} value={text} onChange={e => setText(e.target.value)} autoFocus
                placeholder="Who has been absent three days in a row?"
                className="h-[64px] min-w-0 flex-1 bg-transparent font-display text-[19px] text-ink outline-none placeholder:font-sans placeholder:text-[16px] placeholder:text-stone-l md:text-[22px]" />
              {question && (
                <button type="button" onClick={() => { clear(); setText(''); input.current?.focus() }} className="hidden items-center gap-1 rounded-md px-2 py-1 text-[12px] text-stone hover:bg-paper sm:inline-flex">
                  <Undo2 size={13} /> Clear
                </button>
              )}
              <button type="submit" disabled={!text.trim()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-forest px-4 text-[14px] font-medium text-ivory transition-colors hover:bg-forest-d disabled:opacity-40">
                Ask <CornerDownLeft size={14} />
              </button>
            </form>
          </Card>

          <AnimatePresence mode="wait">
            {answer && question ? (
              <motion.div key={question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: ease.out }}>
                <Card>
                  <Eyebrow>You asked · “{question}”</Eyebrow>
                  <div className="mt-2"><AskAnswer answer={answer} onFollowUp={go} /></div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="suggest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card>
                  <Eyebrow>Try asking</Eyebrow>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => go(s)}
                        className="group flex items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-2.5 text-left text-[14px] text-charcoal transition-colors hover:border-line hover:bg-paper">
                        <Search size={14} className="shrink-0 text-stone" />
                        <span className="flex-1">{s}</span>
                        <ArrowUpRight size={13} className="text-stone-l opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>}
        side={
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="This session" title="Recently asked" />
            {history.length === 0 ? (
              <p className="text-[13px] text-stone">Your questions will collect here so you can come back to them during the day.</p>
            ) : (
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {history.map(h => (
                    <motion.li key={h.q} layout variants={listItem} initial="hidden" animate="show" exit="exit">
                      <button onClick={() => go(h.q)} className={cx('w-full rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-paper', h.q === question && 'bg-forest-p/70')}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13.5px] font-medium text-ink">{h.q}</span>
                          <span className="shrink-0 tabular text-[11px] text-stone">{h.at}</span>
                        </div>
                        {h.summary && <div className="truncate text-[12px] text-stone">{h.summary}</div>}
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        }
      />
    </Page>
  )
}
