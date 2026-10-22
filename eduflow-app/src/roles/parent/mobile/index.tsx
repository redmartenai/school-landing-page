/**
 * Parent mobile app — Sunita Kulkarni, mother of Ananya (9B) and Vihaan (6A).
 * "I stopped calling the office. I just know."
 */
import { BookOpen, BusFront, Ellipsis, House, MessageCircle } from 'lucide-react'
import { MobileApp } from '@/components/shell/Mobile'
import { PARENT_ID, myThreads, useParentNotifications, useParentScope } from './data'
import { ParentProvider, unreadCount, useParentCtx } from './context'
import { HomeScreen } from './Home'
import { LearningScreen } from './Learning'
import { BusScreen } from './Bus'
import { MessagesScreen } from './Messages'
import { MoreScreen } from './More'

function ParentTabs() {
  const { d, childIds } = useParentScope()
  const { seen } = useParentCtx()
  const notes = useParentNotifications()
  const unreadMessages = myThreads(d, childIds).reduce((a, t) => a + unreadCount(t, seen, PARENT_ID), 0)
  const unreadNotes = notes.filter(n => !n.read).length
  return (
    <MobileApp
      tabs={[
        { id: 'home', label: 'Today', icon: House, render: () => <HomeScreen /> },
        { id: 'learning', label: 'Learning', icon: BookOpen, render: () => <LearningScreen /> },
        { id: 'bus', label: 'Bus', icon: BusFront, render: () => <BusScreen /> },
        { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages, render: () => <MessagesScreen /> },
        { id: 'more', label: 'More', icon: Ellipsis, badge: unreadNotes, render: () => <MoreScreen /> },
      ]}
    />
  )
}

export function ParentMobileApp() {
  return (
    <ParentProvider>
      <ParentTabs />
    </ParentProvider>
  )
}
