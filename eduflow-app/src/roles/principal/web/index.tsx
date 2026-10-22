import { BookOpen, Bus, CalendarCheck, GraduationCap, Inbox, Megaphone, Radar, School, Sparkles, UserCheck, Wallet } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { WebShell, type NavGroup } from '@/components/shell/Web'
import { useAlerts, useData, useNow } from '@/store/hooks'
import { RULES } from '@/engine/monitoring'
import { hoursBetween } from '@/lib/format'
import { MonitoringCenter } from './Monitoring'
import { StudentsPage } from './Students'
import { StaffPage } from './Staff'
import { AcademicsPage } from './Academics'
import { AttendancePage } from './Attendance'
import { ApprovalsPage } from './Approvals'
import { CommunicationPage } from './Communication'
import { FeesPage } from './Fees'
import { TransportPage } from './Transport'
import { AskPage } from './Ask'
import { BASE, staffToday } from './shared'
import { toMin, uncoveredToday } from '@/engine/campus'

// three.js only loads for the principal, and only when the campus is opened
const CampusPage = lazy(() => import('./campus/CampusPage').then(m => ({ default: m.CampusPage })))

function usePrincipalNav(): NavGroup[] {
  const d = useData()
  const alerts = useAlerts()
  const now = useNow()
  return useMemo<NavGroup[]>(() => {
    const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledgedAt).length
    const studentAlerts = alerts.filter(a => a.domain === 'students' && !a.acknowledgedAt && a.severity === 'critical').reduce((n, a) => n + a.items.length, 0)
    const staffAway = d.staff.filter(s => staffToday(s, d.school.today)?.status === 'absent').length
    const toPublish = d.exams.filter(e => e.status === 'submitted').length
    const unmarked = d.registers.filter(r => !r.markedAt).length
    const pending = d.approvals.filter(a => a.status === 'pending')
    const stale = pending.some(a => hoursBetween(a.at, now) >= RULES.approvalHours)
    const openComplaints = d.complaints.filter(c => c.status === 'open').length
    const delayed = d.buses.filter(b => b.status === 'delayed').length
    const uncovered = uncoveredToday(d, toMin(now.slice(11, 16))).length
    return [
      {
        items: [
          { to: BASE, label: 'Monitoring Center', icon: Radar, badge: critical, badgeTone: 'rust' },
          { to: `${BASE}/campus`, label: 'Campus 3D', icon: School, badge: uncovered, badgeTone: 'rust' },
        ],
      },
      {
        label: 'People',
        items: [
          { to: `${BASE}/students`, label: 'Students', icon: GraduationCap, badge: studentAlerts },
          { to: `${BASE}/staff`, label: 'Staff', icon: UserCheck, badge: staffAway, badgeTone: 'rust' },
        ],
      },
      {
        label: 'Teaching',
        items: [
          { to: `${BASE}/academics`, label: 'Academics', icon: BookOpen, badge: toPublish },
          { to: `${BASE}/attendance`, label: 'Attendance', icon: CalendarCheck, badge: unmarked, badgeTone: 'rust' },
        ],
      },
      {
        label: 'Operations',
        items: [
          { to: `${BASE}/approvals`, label: 'Approvals', icon: Inbox, badge: pending.length, badgeTone: stale ? 'rust' : 'copper' },
          { to: `${BASE}/communication`, label: 'Communication', icon: Megaphone, badge: openComplaints },
          { to: `${BASE}/fees`, label: 'Fees', icon: Wallet },
          { to: `${BASE}/transport`, label: 'Transport', icon: Bus, badge: delayed, badgeTone: 'rust' },
        ],
      },
      { label: 'Intelligence', items: [{ to: `${BASE}/ask`, label: 'Ask EduFlow', icon: Sparkles }] },
    ]
  }, [d, alerts, now])
}

export function PrincipalWebApp() {
  const nav = usePrincipalNav()
  return (
    <Routes>
      <Route element={<WebShell role="principal" nav={nav} mobileHref="/m/principal" />}>
        <Route index element={<MonitoringCenter />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="communication" element={<CommunicationPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="transport" element={<TransportPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="campus" element={<Suspense fallback={null}><CampusPage /></Suspense>} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Route>
    </Routes>
  )
}
