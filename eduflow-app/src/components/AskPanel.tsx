import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { ArrowUpRight, CornerDownLeft, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ask, SUGGESTIONS, type Answer } from '@/engine/ask'
import { useData } from '@/store/hooks'
import { ease } from '@/components/ui'

/** Answer body shared by the web palette and the mobile Ask screen. */
export function AskAnswer({ answer, onFollowUp, compact }: { answer: Answer; onFollowUp: (q: string) => void; compact?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: ease.out }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-ivory"><Sparkles size={14} /></span>
        <p className="pt-0.5 text-[15px] leading-relaxed text-ink">{answer.summary}</p>
      </div>
      {answer.rows.length > 0 && (
        <div className={clsx('mt-4 overflow-hidden rounded-[12px] border border-line', compact ? '' : 'max-h-[340px] overflow-y-auto scroll-quiet')}>
          {compact ? (
            <div className="divide-y divide-line-2 bg-ivory-2">
              {answer.rows.slice(0, 30).map(r => (
                <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className={clsx('h-2 w-2 shrink-0 rounded-full', r.tone === 'bad' ? 'bg-rust' : r.tone === 'warn' ? 'bg-amber' : r.tone === 'good' ? 'bg-forest-l' : 'bg-stone-l')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-ink">{r.cells[0]}</div>
                    <div className="truncate text-[12.5px] text-stone">{r.cells.slice(1).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-paper">
                <tr>{answer.columns.map(c => <th key={c} className="px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-stone">{c}</th>)}</tr>
              </thead>
              <tbody className="bg-ivory-2">
                {answer.rows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="border-t border-line-2">
                    {r.cells.map((c, j) => (
                      <td key={j} className={clsx('px-3.5 py-2.5', j === 0 && 'font-medium text-ink', j > 0 && 'text-charcoal-2', j === r.cells.length - 1 && 'max-w-[280px] truncate')}>
                        {j === 0 && <span className={clsx('mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle', r.tone === 'bad' ? 'bg-rust' : r.tone === 'warn' ? 'bg-amber' : r.tone === 'good' ? 'bg-forest-l' : 'bg-stone-l')} />}
                        {c}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {answer.followUps.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {answer.followUps.map(f => (
            <button key={f} onClick={() => onFollowUp(f)} className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory-2 px-3 py-1.5 text-[12.5px] text-charcoal-2 transition-colors hover:border-forest-l hover:text-forest">
              {f} <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function useAsk() {
  const d = useData()
  const [q, setQ] = useState<string | null>(null)
  const answer = useMemo(() => (q ? ask(d, q) : null), [d, q])
  return { question: q, answer, run: setQ, clear: () => setQ(null) }
}

/** ⌘K palette for the web shells. */
export function AskPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('')
  const { answer, run, clear, question } = useAsk()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
    else { setText(''); clear() }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (q: string) => { setText(q); run(q) }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.28, ease: ease.out }}
            className="relative w-full max-w-[720px] overflow-hidden rounded-[18px] border border-line bg-ivory-2 shadow-3">
            <form onSubmit={e => { e.preventDefault(); if (text.trim()) run(text) }} className="flex items-center gap-3 border-b border-line-2 px-5">
              <Sparkles size={18} className="text-copper" />
              <input ref={input} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Escape' && onClose()}
                placeholder="Ask EduFlow — “Show students below 75% attendance”"
                className="h-[60px] flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-stone-l" />
              <kbd className="hidden items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-stone sm:inline-flex"><CornerDownLeft size={11} /> ask</kbd>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-stone hover:bg-paper" aria-label="Close"><X size={18} /></button>
            </form>
            <div className="max-h-[62vh] overflow-y-auto p-5 scroll-quiet">
              {answer && question ? (
                <AskAnswer key={question} answer={answer} onFollowUp={go} />
              ) : (
                <div>
                  <div className="mb-3 text-[11.5px] font-medium uppercase tracking-[0.12em] text-stone">Try asking</div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }} onClick={() => go(s)}
                        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] text-charcoal transition-colors hover:bg-paper">
                        <Search size={14} className="text-stone" /> {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
