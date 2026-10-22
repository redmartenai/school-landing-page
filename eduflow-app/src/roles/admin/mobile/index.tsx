import { House, IndianRupee, Inbox, UserPlus, Wallet } from 'lucide-react'
import { MobileApp, type MobileTab } from '@/components/shell/Mobile'
import { useData } from '@/store/hooks'
import { HomeTab } from './HomeTab'
import { FeesTab } from './FeesTab'
import { PayrollTab } from './PayrollTab'
import { AdmissionsTab } from './AdmissionsTab'
import { ApprovalsTab } from './ApprovalsTab'
import { currentRun, decidable } from './lib'

/** Rakesh Menon's phone — money in, money out, families joining, decisions waiting. */
export function AdminMobileApp() {
  const d = useData()
  const waiting = decidable(d).length
  const run = currentRun(d)
  const tabs: MobileTab[] = [
    { id: 'home', label: 'Home', icon: House, render: () => <HomeTab /> },
    { id: 'fees', label: 'Fees', icon: IndianRupee, render: () => <FeesTab /> },
    { id: 'payroll', label: 'Payroll', icon: Wallet, badge: run && run.status !== 'paid' ? 1 : 0, render: () => <PayrollTab /> },
    { id: 'admissions', label: 'Admissions', icon: UserPlus, render: () => <AdmissionsTab /> },
    { id: 'approvals', label: 'Approvals', icon: Inbox, badge: waiting, render: () => <ApprovalsTab /> },
  ]
  return <MobileApp tabs={tabs} />
}
