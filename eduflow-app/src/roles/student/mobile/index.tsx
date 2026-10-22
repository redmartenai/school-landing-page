/* EduFlow — Student app for Ananya Kulkarni (9B, Willow House). */
import { BookOpen, ChartColumn, ClipboardList, House, UserRound } from 'lucide-react'
import { MobileApp } from '@/components/shell/Mobile'
import { useNotifications } from '@/store/hooks'
import { HomeTab } from './Home'
import { HomeworkTab, useMyHomework } from './Homework'
import { LearnTab } from './Learn'
import { MeTab } from './Me'
import { ResultsTab } from './Results'
import { useStudent } from './shared'

export function StudentMobileApp() {
  const { s } = useStudent()
  const unread = useNotifications('student', s.id).filter(n => !n.read).length
  const due = useMyHomework().filter(h => h.submissions[s.id] === 'pending').length
  return (
    <MobileApp
      tabs={[
        { id: 'home', label: 'Home', icon: House, badge: unread, render: () => <HomeTab /> },
        { id: 'learn', label: 'Learn', icon: BookOpen, render: () => <LearnTab /> },
        { id: 'homework', label: 'Homework', icon: ClipboardList, badge: due, render: () => <HomeworkTab /> },
        { id: 'results', label: 'Results', icon: ChartColumn, render: () => <ResultsTab /> },
        { id: 'me', label: 'Me', icon: UserRound, render: () => <MeTab /> },
      ]}
    />
  )
}
