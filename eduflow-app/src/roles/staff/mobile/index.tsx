/* Ms. Kavya Rao's phone — Mathematics, class teacher 9B. */
import { GraduationCap, MessageCircle, Sun, UserRound, Users } from 'lucide-react'
import { MobileApp } from '@/components/shell/Mobile'
import { useData } from '@/store/hooks'
import { ClassesTab } from './Classes'
import { LearnTab } from './Learn'
import { MeTab } from './Me'
import { MessagesTab } from './Messages'
import { TodayTab } from './Today'
import { ME, isWaiting, myThreads, useNeedsYou, useTeacher } from './shared'

export function StaffMobileApp() {
  const d = useData()
  const me = useTeacher()
  const needs = useNeedsYou()
  const registerOpen = me.classTeacherOf ? !d.registers.find(r => r.classId === me.classTeacherOf)?.markedAt : false
  const waiting = myThreads(d, ME).filter(isWaiting).length
  const unacked = d.announcements.filter(a => a.audience.includes('staff') && !a.acknowledgedBy.includes(ME)).length
  const actionable = needs.filter(n => !(n.kind === 'marks' && n.tone === 'amber')).length

  return (
    <MobileApp
      tabs={[
        { id: 'today', label: 'Today', icon: Sun, badge: actionable + (registerOpen ? 1 : 0), render: () => <TodayTab /> },
        { id: 'classes', label: 'Classes', icon: Users, render: () => <ClassesTab /> },
        { id: 'learn', label: 'Learn', icon: GraduationCap, render: () => <LearnTab /> },
        { id: 'messages', label: 'Messages', icon: MessageCircle, badge: waiting, render: () => <MessagesTab /> },
        { id: 'me', label: 'Me', icon: UserRound, badge: unacked, render: () => <MeTab /> },
      ]}
    />
  )
}
