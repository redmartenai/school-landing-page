/* Ask a teacher a doubt — student ↔ teacher threads only. Parents' threads are not hers to read. */
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ArrowUp, MessageCircle } from 'lucide-react'
import { Avatar, Button, EmptyState, Sheet, cx, inputClass, listItem, useToast } from '@/components/ui'
import { MList, MRow, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { useSchool } from '@/store/school'
import { ago, time } from '@/lib/format'
import type { Subject } from '@/data/types'
import { SUBJECT_STYLE, SubjectChip, teacherShort, useStudent } from './shared'

/** Her subject teachers this year, in timetable order. */
export function useMyTeachers() {
  const { d, s } = useStudent()
  return useMemo(
    () => d.staff.filter(t => t.role === 'teacher' && t.subjects.length > 0 && t.classIds.includes(s.classId)),
    [d.staff, s.classId],
  )
}

export function useMyThreads() {
  const { d, s } = useStudent()
  return useMemo(
    () => d.threads
      .filter(t => t.kind === 'student-teacher' && t.studentId === s.id)
      .sort((a, b) => (b.messages.at(-1)?.at ?? '').localeCompare(a.messages.at(-1)?.at ?? '')),
    [d.threads, s.id],
  )
}

export function AskDoubtSheet({ open, onClose, subject: initialSubject, context }: { open: boolean; onClose: () => void; subject?: Subject; context?: string }) {
  const { s } = useStudent()
  const teachers = useMyTeachers()
  const startThread = useSchool(st => st.startThread)
  const toast = useToast()
  const nav = useMobileNav()
  const [staffId, setStaffId] = useState<string | null>(() => (initialSubject ? teachers.find(t => t.subjects.includes(initialSubject))?.id ?? null : null))
  const [text, setText] = useState('')
  const teacher = teachers.find(t => t.id === staffId)

  const send = () => {
    if (!teacher || !text.trim()) return
    const body = context ? `${context} — ${text.trim()}` : text.trim()
    const id = startThread({ kind: 'student-teacher', parentId: null, studentId: s.id, staffId: teacher.id, subject: teacher.subjects[0] }, s.id, body)
    toast(`Sent to ${teacherShort(teacher.name)}`)
    setText('')
    onClose()
    nav.push({ title: teacherShort(teacher.name), render: () => <ThreadScreen id={id} /> })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ask a doubt"
      footer={<Button block size="lg" icon={ArrowUp} disabled={!teacher || !text.trim()} onClick={send}>{teacher ? `Send to ${teacherShort(teacher.name)}` : 'Choose a teacher'}</Button>}>
      {context && <div className="mb-3 rounded-[12px] bg-paper px-3 py-2 text-[13px] text-charcoal-2">About: <span className="font-medium text-ink">{context}</span></div>}
      <div className="mb-2 text-[12.5px] font-medium text-charcoal-2">Who should answer?</div>
      <div className="grid grid-cols-2 gap-2">
        {teachers.map(t => {
          const on = t.id === staffId
          const subj = t.subjects[0]
          return (
            <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => setStaffId(t.id)}
              className={cx('flex items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left transition-colors', on ? 'border-forest bg-forest-p' : 'border-line bg-ivory-2')}>
              <Avatar name={t.name} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{teacherShort(t.name)}</span>
                <span className="block truncate text-[11.5px]" style={{ color: SUBJECT_STYLE[subj].fg }}>{SUBJECT_STYLE[subj].short}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <div className="mb-1.5 mt-4 text-[12.5px] font-medium text-charcoal-2">Your question</div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
        placeholder="e.g. In step 3, why do we add 9 to both sides?"
        className={cx(inputClass, 'h-auto resize-none py-2.5 leading-relaxed')} />
      <p className="mt-2 text-[12px] text-stone">Only you and your teacher can see this conversation.</p>
    </Sheet>
  )
}

export function ThreadScreen({ id }: { id: string }) {
  const { d, s } = useStudent()
  const sendMessage = useSchool(st => st.sendMessage)
  const [text, setText] = useState('')
  const th = d.threads.find(t => t.id === id)
  if (!th) return <MobileScreen title="Conversation"><EmptyState icon={MessageCircle} title="Conversation not found" /></MobileScreen>
  const teacher = d.staff.find(t => t.id === th.staffId)
  const send = () => { if (text.trim()) { sendMessage(th.id, s.id, text.trim()); setText('') } }

  return (
    <MobileScreen title={teacher ? teacherShort(teacher.name) : 'Teacher'} eyebrow={th.subject ? `${th.subject} · doubt` : 'Doubt'} large={false}
      footer={
        <div className="flex items-end gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Reply…" className={cx(inputClass, 'h-11 rounded-full px-4')} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={!text.trim()} aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-ivory disabled:opacity-40"><ArrowUp size={18} /></motion.button>
        </div>
      }>
      <div className="flex flex-col items-center pb-2 pt-4 text-center">
        {teacher && <Avatar name={teacher.name} size={52} />}
        <div className="mt-2 font-display text-[19px]">{teacher?.name}</div>
        {th.subject && <SubjectChip subject={th.subject} className="mt-1.5" />}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {th.messages.map(m => {
            const mine = m.from === s.id
            return (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={cx('max-w-[82%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug', mine ? 'self-end rounded-br-[6px] bg-forest text-ivory' : 'self-start rounded-bl-[6px] border border-line bg-ivory-2 text-ink')}>
                {m.text}
                <div className={cx('mt-0.5 text-right text-[10.5px] tabular', mine ? 'text-ivory/70' : 'text-stone')}>{time(m.at)}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {th.messages.every(m => m.from === s.id) && (
          <div className="mt-2 text-center text-[12.5px] text-stone">{teacher ? teacherShort(teacher.name) : 'Your teacher'} usually replies within a day.</div>
        )}
      </div>
    </MobileScreen>
  )
}

/** Thread rows for the Me tab. */
export function ThreadList() {
  const { d, s } = useStudent()
  const threads = useMyThreads()
  const nav = useMobileNav()
  if (!threads.length) return (
    <div className="rounded-[16px] border border-dashed border-line bg-ivory-2 px-4 py-5 text-center text-[13.5px] text-stone">
      Stuck on something? Ask any of your teachers — it stays between you and them.
    </div>
  )
  return (
    <MList>
      <AnimatePresence initial={false}>
        {threads.map(t => {
          const teacher = d.staff.find(x => x.id === t.staffId)
          const last = t.messages.at(-1)
          const awaiting = last?.from === s.id
          return (
            <motion.div key={t.id} variants={listItem} initial="hidden" animate="show" exit="exit">
              <MRow onClick={() => nav.push({ title: teacher ? teacherShort(teacher.name) : 'Teacher', render: () => <ThreadScreen id={t.id} /> })}
                icon={<Avatar name={teacher?.name ?? '?'} size={36} />}
                title={teacher ? teacherShort(teacher.name) : 'Teacher'}
                sub={last ? `${last.from === s.id ? 'You: ' : ''}${last.text}` : ''}
                right={<div className="flex flex-col items-end gap-1"><span className="text-[11.5px] text-stone">{last ? ago(last.at) : ''}</span>{awaiting ? <span className="text-[11px] font-medium text-[#8a5f14]">Waiting</span> : <span className="text-[11px] font-medium text-forest">Replied</span>}</div>} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </MList>
  )
}
