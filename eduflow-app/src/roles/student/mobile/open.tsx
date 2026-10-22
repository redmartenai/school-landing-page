/* One place that knows which screen plays which kind of lesson. */
import type { Lesson } from '@/data/types'
import type { PushedScreen } from '@/components/shell/Mobile'
import { NotesReader } from './NotesReader'
import { QuizPlayer } from './QuizPlayer'
import { VideoLesson } from './VideoLesson'

export function lessonScreen(l: Lesson): PushedScreen {
  if (l.kind === 'quiz') return { title: l.title, render: () => <QuizPlayer lessonId={l.id} /> }
  if (l.kind === 'notes') return { title: l.title, render: () => <NotesReader lessonId={l.id} /> }
  return { title: l.title, render: () => <VideoLesson lessonId={l.id} /> }
}
