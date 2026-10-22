/* After a lesson: the next thing in the same subject, else the next unfinished thing anywhere. */
import { ChevronRight } from 'lucide-react'
import { MList, MRow, useMobileNav } from '@/components/shell/Mobile'
import { lessonScreen } from './open'
import { KIND_META, MiniRing, SubjectGlyph, useStudent } from './shared'

export function UpNext({ lessonId }: { lessonId: string }) {
  const { d, s } = useStudent()
  const nav = useMobileNav()
  const mine = d.lessons.filter(l => l.classId === s.classId)
  const cur = mine.find(l => l.id === lessonId)
  const open = mine.filter(l => l.id !== lessonId && (l.progress[s.id] ?? 0) < 100)
  const next = open.find(l => l.subject === cur?.subject) ?? open[0]
  if (!next) return null
  const pct = next.progress[s.id] ?? 0
  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Up next</div>
      <MList>
        <MRow onClick={() => { nav.pop(); nav.push(lessonScreen(next)) }} icon={<SubjectGlyph subject={next.subject} />}
          title={next.title} sub={`${KIND_META[next.kind].label} · ${next.minutes} min · ${next.chapter}`}
          right={<span className="flex items-center gap-1.5"><MiniRing pct={pct} /><ChevronRight size={16} className="text-stone-l" /></span>} />
      </MList>
    </div>
  )
}
