import { lazy, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { MobileStage } from '@/pages/MobileStage'
import { LogoMark } from '@/components/shell/Logo'

// Each role ships as its own chunk — a parent's phone never downloads the payroll screens.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, key: K) =>
  lazy(() => load().then(m => ({ default: m[key] })))

const LiveDemo = named(() => import('@/pages/LiveDemo'), 'LiveDemo')
const PrincipalWebApp = named(() => import('@/roles/principal/web'), 'PrincipalWebApp')
const AdminWebApp = named(() => import('@/roles/admin/web'), 'AdminWebApp')
const PrincipalMobileApp = named(() => import('@/roles/principal/mobile'), 'PrincipalMobileApp')
const AdminMobileApp = named(() => import('@/roles/admin/mobile'), 'AdminMobileApp')
const StaffMobileApp = named(() => import('@/roles/staff/mobile'), 'StaffMobileApp')
const ParentMobileApp = named(() => import('@/roles/parent/mobile'), 'ParentMobileApp')
const StudentMobileApp = named(() => import('@/roles/student/mobile'), 'StudentMobileApp')

function Loading() {
  return (
    <div className="grid h-full min-h-[50vh] w-full place-items-center bg-ivory">
      <LogoMark size={36} className="animate-pulse" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/live" element={<LiveDemo />} />
        <Route path="/principal/*" element={<PrincipalWebApp />} />
        <Route path="/admin/*" element={<AdminWebApp />} />
        <Route path="/m/principal" element={<MobileStage role="principal"><Suspense fallback={<Loading />}><PrincipalMobileApp /></Suspense></MobileStage>} />
        <Route path="/m/admin" element={<MobileStage role="admin"><Suspense fallback={<Loading />}><AdminMobileApp /></Suspense></MobileStage>} />
        <Route path="/m/staff" element={<MobileStage role="staff"><Suspense fallback={<Loading />}><StaffMobileApp /></Suspense></MobileStage>} />
        <Route path="/m/parent" element={<MobileStage role="parent"><Suspense fallback={<Loading />}><ParentMobileApp /></Suspense></MobileStage>} />
        <Route path="/m/student" element={<MobileStage role="student"><Suspense fallback={<Loading />}><StudentMobileApp /></Suspense></MobileStage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
