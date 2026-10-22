/* Announcement respond sheet — used from Today's "Needs you" and from Me. */
import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button, Sheet, useToast } from '@/components/ui'
import { useData } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago } from '@/lib/format'
import { ChoiceChips, ME, textareaClass } from './shared'

const QUICK = ['Noted — will do.', 'Done for my classes.', 'I have a question about this.'] as const

export function RespondSheet({ announcementId, onClose }: { announcementId: string | null; onClose: () => void }) {
  const d = useData()
  const respond = useSchool(s => s.respondAnnouncement)
  const toast = useToast()
  const a = d.announcements.find(x => x.id === announcementId)
  const [text, setText] = useState('')
  const [quick, setQuick] = useState<string>('')

  const close = () => { setText(''); setQuick(''); onClose() }
  const submit = () => {
    if (!a || !text.trim()) return
    respond(a.id, ME, text.trim())
    toast('Response sent to the principal')
    close()
  }

  return (
    <Sheet open={!!a} onClose={close} title="Respond"
      footer={<Button block size="lg" icon={Send} disabled={!text.trim()} onClick={submit}>Send response</Button>}>
      {a && (
        <>
          <div className="rounded-[14px] bg-paper p-3.5">
            <div className="font-display text-[17px] leading-snug text-ink">{a.title}</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal-2">{a.body}</p>
            <div className="mt-1.5 text-[12px] text-stone">{d.staff.find(s => s.id === a.fromId)?.name} · {ago(a.at)}</div>
          </div>
          {a.responses.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone">{a.responses.length} response{a.responses.length === 1 ? '' : 's'} so far</div>
              {a.responses.map(r => (
                <div key={r.id} className="text-[13.5px] text-charcoal-2">
                  <span className="font-medium text-ink">{r.staffId === ME ? 'You' : d.staff.find(s => s.id === r.staffId)?.name}</span> — {r.text}
                </div>
              ))}
            </div>
          )}
          <ChoiceChips group="respond-quick" className="mt-4" value={quick}
            options={QUICK.map(q => ({ id: q, label: q }))}
            onChange={q => { setQuick(q); setText(q) }} />
          <textarea rows={3} value={text} onChange={e => { setText(e.target.value); setQuick('') }} placeholder="Write a short reply to the principal…" className={`${textareaClass} mt-3`} />
        </>
      )}
    </Sheet>
  )
}
