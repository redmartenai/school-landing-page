/* Messages: threads with her children's teachers, a chat screen, and "New message". */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, MessageCircle, Send, SquarePen } from 'lucide-react'
import { Avatar, EmptyState, IconButton, Pill, Sheet, Tabs, cx, ease, listItem, spring, useToast } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { ago, firstName, time, dateLabel } from '@/lib/format'
import type { Subject, Thread } from '@/data/types'
import { PARENT_ID, lastMessage, myThreads, staffName, teachersFor, useParentScope } from './data'
import { unreadCount, useParentCtx } from './context'

export interface ChatDraft { studentId: string; staffId: string; subject?: Subject }

/** Open a conversation: reuse an existing thread with that teacher about that child, or start a draft. */
export function useOpenChat() {
  const nav = useMobileNav()
  const { d, childIds } = useParentScope()
  return (draft: ChatDraft) => {
    if (!childIds.includes(draft.studentId)) return // scope guard
    const existing = myThreads(d, childIds).find(t => t.studentId === draft.studentId && t.staffId === draft.staffId)
    nav.push({ title: staffName(d, draft.staffId), render: () => <ChatScreen threadId={existing?.id ?? null} draft={draft} /> })
  }
}

function roleLabel(d: ReturnType<typeof useParentScope>['d'], t: Pick<Thread, 'studentId' | 'staffId' | 'subject'>) {
  const s = d.students.find(x => x.id === t.studentId)
  const cls = d.classes.find(c => c.id === s?.classId)
  if (cls?.classTeacherId === t.staffId) return `Class teacher · ${cls.id}`
  return `${t.subject ?? d.staff.find(x => x.id === t.staffId)?.subjects[0] ?? 'Teacher'} · ${s?.classId ?? ''}`
}

export function MessagesScreen() {
  const { d, childIds, children } = useParentScope()
  const { seen } = useParentCtx()
  const nav = useMobileNav()
  const [composeOpen, setComposeOpen] = useState(false)
  const threads = myThreads(d, childIds)
    .map(t => ({ t, unread: unreadCount(t, seen, PARENT_ID) }))
    .sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || lastMessage(b.t).at.localeCompare(lastMessage(a.t).at))
  const totalUnread = threads.reduce((a, x) => a + x.unread, 0)

  return (
    <MobileScreen title="Messages" eyebrow={totalUnread ? `${totalUnread} new from teachers` : 'Talk to teachers directly'}
      actions={<IconButton icon={SquarePen} label="New message" onClick={() => setComposeOpen(true)} />}>
      <MSection>
        {threads.length ? (
          <MList>
            <AnimatePresence initial={false}>
              {threads.map(({ t, unread }) => {
                const last = lastMessage(t)
                const child = children.find(c => c.id === t.studentId)!
                const waiting = last.from === PARENT_ID
                return (
                  <motion.button key={t.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" whileTap={{ scale: 0.985 }}
                    onClick={() => nav.push({ title: staffName(d, t.staffId), render: () => <ChatScreen threadId={t.id} draft={{ studentId: t.studentId, staffId: t.staffId, subject: t.subject }} /> })}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
                    <Avatar name={staffName(d, t.staffId)} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cx('truncate text-[15px] text-ink', unread ? 'font-semibold' : 'font-medium')}>{staffName(d, t.staffId)}</span>
                        <span className={cx('shrink-0 text-[12px]', unread ? 'font-medium text-forest' : 'text-stone')}>{ago(last.at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-stone">
                        <span className="rounded-full bg-paper px-1.5 py-px font-medium text-charcoal-2">{firstName(child.name)}</span>
                        <span className="truncate">{roleLabel(d, t)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className={cx('line-clamp-2 flex-1 text-[13.5px] leading-snug', unread ? 'text-charcoal' : 'text-stone')}>
                          {waiting && <span className="text-stone">You: </span>}{last.text}
                        </p>
                        {unread > 0 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}
                            className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1.5 text-[11px] font-semibold text-ivory">{unread}</motion.span>
                        )}
                      </div>
                      {waiting && <div className="mt-1 text-[12px] text-[#8a5f14]">Waiting for a reply</div>}
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </MList>
        ) : (
          <EmptyState icon={MessageCircle} title="No conversations yet" body="Message a class teacher or subject teacher — they usually reply the same day." />
        )}
      </MSection>
      <NewMessageSheet open={composeOpen} onClose={() => setComposeOpen(false)} />
    </MobileScreen>
  )
}

/** "New message" → pick child → pick teacher. */
export function NewMessageSheet({ open, onClose, initialChildId }: { open: boolean; onClose: () => void; initialChildId?: string }) {
  const { d, children } = useParentScope()
  const { childId: selected } = useParentCtx()
  const [childId, setChildId] = useState(initialChildId ?? selected)
  const openChat = useOpenChat()
  useEffect(() => { if (open) setChildId(initialChildId ?? selected) }, [open, initialChildId, selected])
  const child = children.find(c => c.id === childId) ?? children[0]
  const teachers = teachersFor(d, child)

  return (
    <Sheet open={open} onClose={onClose} title="New message">
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">About</div>
      <Tabs value={child.id} onChange={setChildId} className="mb-4" tabs={children.map(c => ({ id: c.id, label: `${firstName(c.name)} · ${c.classId}` }))} />
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">To</div>
      <div className="divide-y divide-line-2 overflow-hidden rounded-[14px] border border-line bg-ivory">
        {teachers.map(t => {
          const st = d.staff.find(s => s.id === t.staffId)
          if (!st) return null
          return (
            <motion.button key={t.staffId} whileTap={{ scale: 0.985 }} className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              onClick={() => { onClose(); openChat({ studentId: child.id, staffId: t.staffId, subject: t.subject }) }}>
              <Avatar name={st.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{st.name}</span>
                <span className="block truncate text-[12.5px] text-stone">{t.role === 'class-teacher' ? `Class teacher${t.subject ? ` · ${t.subject}` : ''}` : t.subject}</span>
              </span>
              {t.role === 'class-teacher' && <Pill tone="forest">Class teacher</Pill>}
              <ChevronRight size={18} className="text-stone-l" />
            </motion.button>
          )
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-stone">Teachers usually reply within a school day. Urgent? Call the office on +91 20 2546 1100.</p>
    </Sheet>
  )
}

export function ChatScreen({ threadId: initialId, draft }: { threadId: string | null; draft: ChatDraft }) {
  const { d, childIds } = useParentScope()
  const { markSeen } = useParentCtx()
  const sendMessage = useSchool(s => s.sendMessage)
  const startThread = useSchool(s => s.startThread)
  const toast = useToast()
  const [threadId, setThreadId] = useState(initialId)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const thread = threadId ? myThreads(d, childIds).find(t => t.id === threadId) ?? null : null
  const messages = thread?.messages ?? []
  const child = d.students.find(s => s.id === draft.studentId)!
  const teacher = staffName(d, draft.staffId)

  useEffect(() => { if (thread) markSeen(thread.id, thread.messages.length) }, [thread, markSeen])
  useEffect(() => {
    const el = scrollRef.current?.closest('.overflow-y-auto')
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = () => {
    const body = text.trim()
    if (!body) return
    if (thread) sendMessage(thread.id, PARENT_ID, body)
    else {
      const cls = d.classes.find(c => c.id === child.classId)
      const id = startThread({
        kind: cls?.classTeacherId === draft.staffId ? 'parent-class-teacher' : 'parent-subject-teacher',
        parentId: PARENT_ID, studentId: child.id, staffId: draft.staffId, subject: draft.subject,
      }, PARENT_ID, body)
      setThreadId(id)
      toast(`Sent to ${teacher}`)
    }
    setText('')
  }

  let lastDay = ''
  return (
    <MobileScreen title={teacher} large={false}
      footer={
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder={`Message ${teacher.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ')[0]}…`}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[21px] border border-line bg-ivory px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-stone-l focus:border-forest-l" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={!text.trim()} aria-label="Send"
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-forest text-ivory transition-opacity disabled:opacity-35">
            <Send size={18} />
          </motion.button>
        </div>
      }>
      <div ref={scrollRef} className="pt-2">
        <div className="mb-4 flex flex-col items-center text-center">
          <Avatar name={teacher} size={56} />
          <div className="mt-2 font-display text-[19px]">{teacher}</div>
          <div className="text-[12.5px] text-stone">{roleLabel(d, { studentId: draft.studentId, staffId: draft.staffId, subject: draft.subject })} · about {firstName(child.name)}</div>
        </div>
        {!messages.length && (
          <p className="mx-auto max-w-[260px] text-center text-[13.5px] text-stone">Say hello. {teacher} will see this on their phone straight away.</p>
        )}
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {messages.map(m => {
              const mine = m.from === PARENT_ID
              const day = m.at.slice(0, 10)
              const showDay = day !== lastDay
              lastDay = day
              return (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: ease.out }}>
                  {showDay && <div className="my-3 text-center text-[11.5px] font-medium uppercase tracking-[0.1em] text-stone">{dateLabel(m.at, { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
                  <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[80%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug', mine ? 'rounded-br-[6px] bg-forest text-ivory' : 'rounded-bl-[6px] border border-line bg-ivory-2 text-charcoal')}>
                      {m.text}
                      <div className={cx('mt-0.5 text-right text-[10.5px] tabular', mine ? 'text-ivory/70' : 'text-stone')}>{time(m.at)}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </MobileScreen>
  )
}
