import { LayoutGrid, Inbox, Sparkles, Sun, Users } from 'lucide-react'
import { MobileApp, type MobileTab } from '@/components/shell/Mobile'
import { useAlerts, useData } from '@/store/hooks'
import { TodayTab } from './TodayTab'
import { WallTab } from './WallTab'
import { ApprovalsTab } from './ApprovalsTab'
import { AskTab } from './AskTab'
import { PeopleTab } from './PeopleTab'

/** Dr. Meera Iyer's phone — the wall, in her pocket. */
export function PrincipalMobileApp() {
  const alerts = useAlerts()
  const d = useData()
  const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledgedAt).length
  const pending = d.approvals.filter(a => a.status === 'pending').length
  const tabs: MobileTab[] = [
    { id: 'today', label: 'Today', icon: Sun, badge: critical, render: () => <TodayTab /> },
    { id: 'wall', label: 'Wall', icon: LayoutGrid, render: () => <WallTab /> },
    { id: 'approvals', label: 'Approvals', icon: Inbox, badge: pending, render: () => <ApprovalsTab /> },
    { id: 'ask', label: 'Ask', icon: Sparkles, render: () => <AskTab /> },
    { id: 'people', label: 'People', icon: Users, render: () => <PeopleTab /> },
  ]
  return <MobileApp tabs={tabs} />
}
