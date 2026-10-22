/* Parent conversations: waiting ones first, a calm chat, quick replies. */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import { Avatar, EmptyState, Pill, cx, ease, spring, useToast } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago, dateLabel, firstName, time } from '@/lib/format'
import { ME, counterpart, isWaiting, lastMessage, myThreads, waitingLabel } from './shared'

export function MessagesTab() {
  const d = useData()
  const now = useNow()
  const nav = useMobileNav()
  const threads = myThreads(d, ME)
  const waiting = threads.filter(isWaiting)
  const rest = threads.filter(t => !isWaiting(t))

  const row = (id: string) => {
    const t = d.threads.find(x => x.id === id)!
    const c = counterpart(d, t)
    const last = lastMessage(t)
    const w = isWaiting(t)
    return (
      <motion.button key={t.id} layout="position" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }}
        onClick={() => nav.push({ title: c.name, render: () => <ChatScreen threadId={t.id} /> })}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
        <span className="relative">
          <Avatar name={c.name} size={44} />
          {w && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-copper ring-2 ring-ivory-2" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cx('truncate text-[15px] text-ink', w ? 'font-semibold' : 'font-medium')}>{c.name}</span>
            <span className="shrink-0 text-[12px] text-stone">{ago(last.at, now)}</span>
          </div>
          <div className="truncate text-[12.5px] text-stone">{c.relation ? `${c.relation} of ` : ''}{c.student?.name} · {c.student?.classId}</div>
          <div className={cx('mt-0.5 line-clamp-2 text-[13.5px] leading-snug', w ? 'text-charcoal' : 'text-stone')}>
            {last.from === ME && <span className="text-stone">You: </span>}{last.text}
          </div>
          {w && <Pill tone="copper" className="mt-1.5">{waitingLabel(t, now)}</Pill>}
        </div>
      </motion.button>
    )
  }

  return (
    <MobileScreen title="Messages" eyebrow={waiting.length ? `${waiting.length} famil${waiting.length === 1 ? 'y is' : 'ies are'} waiting on you` : 'Every family has heard back'}>
      {threads.length === 0 && <EmptyState icon={MessageCircle} title="No conversations yet" body="When a parent writes to you, it lands here." />}
      {waiting.length > 0 && (
        <MSection title="Waiting on you">
          <MList>{waiting.map(t => row(t.id))}</MList>
        </MSection>
      )}
      {rest.length > 0 && (
        <MSection title={waiting.length ? 'Answered' : 'Recent'}>
          <MList>{rest.map(t => row(t.id))}</MList>
        </MSection>
      )}
      <p className="mt-5 px-2 text-center text-[12.5px] text-stone">Your average reply time is part of how the school sees your week. You’re doing well.</p>
    </MobileScreen>
  )
}

const QUICK_REPLIES = [
  'Thank you — I’ll check and get back to you today.',
  'Let’s talk at the PTM on 17 October.',
  'I’ll share practice material in Learn tonight.',
  'Noted. I’ll keep an eye on this in class.',
]

export function ChatScreen({ threadId }: { threadId: string }) {
  const d = useData()
  const send = useSchool(s => s.sendMessage)
  const toast = useToast()
  const t = d.threads.find(x => x.id === threadId)
  const [text, setText] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const count = t?.messages.length ?? 0
  const firstRender = useRef(true)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: firstRender.current ? 'auto' : 'smooth', block: 'end' })
    firstRender.current = false
  }, [count])

  if (!t) return <MobileScreen title="Conversation"><EmptyState icon={MessageCircle} title="This conversation has moved" /></MobileScreen>
  const c = counterpart(d, t)

  const submit = (msg = text) => {
    const v = msg.trim()
    if (!v) return
    send(t.id, ME, v)
    setText('')
    if (isWaiting(t)) toast(`${firstName(c.name)} will see your reply now`)
  }

  let lastDay = ''
  return (
    <MobileScreen title={c.name} large={false}
      footer={
        <div>
          <div className="no-scrollbar -mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4">
            {QUICK_REPLIES.map(q => (
              <motion.button key={q} whileTap={{ scale: 0.95 }} onClick={() => submit(q)}
                className="min-h-[36px] shrink-0 rounded-full border border-line bg-ivory-2 px-3.5 text-[13px] text-charcoal-2">{q}</motion.button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); submit() }} className="flex items-end gap-2">
            <input value={text} onChange={e => setText(e.target.value)} placeholder={`Reply to ${firstName(c.name)}…`}
              className="h-11 min-w-0 flex-1 rounded-full border border-line bg-ivory-2 px-4 text-[15px] text-ink outline-none placeholder:text-stone-l focus:border-forest-l" />
            <motion.button type="submit" whileTap={{ scale: 0.9 }} disabled={!text.trim()} aria-label="Send"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-ivory transition-opacity disabled:opacity-40">
              <SendHorizontal size={19} />
            </motion.button>
          </form>
        </div>
      }>
      <div className="flex flex-col items-center pt-2 pb-4 text-center">
        <Avatar name={c.name} size={56} />
        <div className="mt-2 font-display text-[19px] text-ink">{c.name}</div>
        <div className="text-[13px] text-stone">{c.relation ? `${c.relation} of ` : ''}{c.student?.name} · {c.student?.classId}{t.subject ? ` · ${t.subject}` : ''}</div>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {t.messages.map(m => {
            const mine = m.from === ME
            const day = m.at.slice(0, 10)
            const showDay = day !== lastDay
            lastDay = day
            return (
              <motion.div key={m.id} layout="position" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, opacity: { duration: 0.2, ease: ease.out } }}>
                {showDay && <div className="my-3 text-center text-[11.5px] font-medium uppercase tracking-[0.1em] text-stone">{dateLabel(m.at, { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
                <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[80%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug', mine ? 'rounded-br-[6px] bg-forest text-ivory' : 'rounded-bl-[6px] border border-line bg-ivory-2 text-ink')}>
                    {m.text}
                    <div className={cx('mt-0.5 text-right text-[10.5px] tabular', mine ? 'text-ivory/65' : 'text-stone')}>{time(m.at)}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      <div ref={bottom} className="h-1" />
    </MobileScreen>
  )
}
