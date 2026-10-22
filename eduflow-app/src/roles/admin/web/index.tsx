import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'
import { IndianRupee, LayoutDashboard, ScrollText, ShieldCheck, UserPlus, Users, Wallet } from 'lucide-react'
import { WebShell, type NavGroup } from '@/components/shell/Web'
import { useData } from '@/store/hooks'
import { RULES, feeStatus } from '@/engine/monitoring'
import { ADMIN_APPROVAL_KINDS } from './shared'
import { Overview } from './Overview'
import { FeesPage } from './Fees'
import { PayrollPage } from './Payroll'
import { AdmissionsPage } from './Admissions'
import { StaffPage } from './Staff'
import { AccessPage } from './Access'
import { AuditPage } from './Audit'

function useAdminNav(): NavGroup[] {
  const d = useData()
  return useMemo(() => {
    const deskApprovals = d.approvals.filter(a => a.status === 'pending' && (ADMIN_APPROVAL_KINDS as readonly string[]).includes(a.kind)).length
    const defaulters = d.students.filter(s => feeStatus(s).overdue > RULES.feeOverdue).length
    const draftRun = d.payrollRuns.some(r => r.status !== 'paid') ? 1 : 0
    const enquiries = d.admissions.filter(a => a.stage === 'enquiry').length
    const leave = d.approvals.filter(a => a.status === 'pending' && a.kind === 'leave').length
    const sensitiveToday = d.audit.filter(a => a.sensitive && a.at.startsWith(d.school.today)).length
    return [
      { items: [{ to: '/admin', label: 'Control room', icon: LayoutDashboard, badge: deskApprovals, badgeTone: 'copper' }] },
      {
        label: 'Money',
        items: [
          { to: '/admin/fees', label: 'Fees', icon: IndianRupee, badge: defaulters, badgeTone: 'rust' },
          { to: '/admin/payroll', label: 'Payroll & salary', icon: Wallet, badge: draftRun, badgeTone: 'copper' },
        ],
      },
      {
        label: 'People',
        items: [
          { to: '/admin/admissions', label: 'Admissions', icon: UserPlus, badge: enquiries, badgeTone: 'copper' },
          { to: '/admin/staff', label: 'Staff & HR', icon: Users, badge: leave, badgeTone: 'copper' },
        ],
      },
      {
        label: 'Control',
        items: [
          { to: '/admin/access', label: 'Access control', icon: ShieldCheck },
          { to: '/admin/audit', label: 'Audit log', icon: ScrollText, badge: sensitiveToday, badgeTone: 'copper' },
        ],
      },
    ]
  }, [d])
}

export function AdminWebApp() {
  const nav = useAdminNav()
  return (
    <Routes>
      <Route element={<WebShell role="admin" nav={nav} mobileHref="/m/admin" />}>
        <Route index element={<Overview />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Overview />} />
      </Route>
    </Routes>
  )
}
