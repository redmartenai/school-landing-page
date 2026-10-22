import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Tabs, cx, listItem, spring, useToast } from '@/components/ui'
import { TwoCol } from '@/components/shell/Web'
import { useData, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago } from '@/lib/format'
import type { ModuleId, PermAction } from '@/data/types'
import { ADMIN_ID, nameOf } from './shared'

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'students', label: 'Students' }, { id: 'attendance', label: 'Attendance' }, { id: 'exams', label: 'Exams & marks' },
  { id: 'fees', label: 'Fees' }, { id: 'payroll', label: 'Payroll' }, { id: 'admissions', label: 'Admissions' },
  { id: 'staff', label: 'Staff & HR' }, { id: 'transport', label: 'Transport' }, { id: 'communication', label: 'Communication' },
  { id: 'reports', label: 'Reports' }, { id: 'approvals', label: 'Approvals' }, { id: 'lms', label: 'Learning (LMS)' },
  { id: 'settings', label: 'Settings & access' },
]
const ACTIONS: PermAction[] = ['view', 'create', 'edit', 'approve', 'export', 'delete']

/** Data scope — the last filter before a record is returned. */
const SCOPE: Record<string, { scope: string; example: string; user: string }> = {
  Principal: { scope: 'Whole school', example: 'Every class, every staff member, all fee totals', user: 'Dr. Meera Iyer' },
  Admin: { scope: 'Whole school · operations', example: 'Fees, payroll, admissions and staff records for Greenfield', user: 'Rakesh Menon' },
  Teacher: { scope: 'Assigned classes only', example: 'Ms. Kavya Rao sees 9B and the sections she teaches — nothing else', user: 'Ms. Kavya Rao' },
  Accountant: { scope: 'Finance records', example: 'Fee ledgers and payroll exports; no marks or attendance', user: 'Smita Gokhale' },
  Parent: { scope: 'Own children only', example: 'Sunita Kulkarni sees Ananya (9B) and Vihaan (6A)', user: 'Sunita Kulkarni' },
  Student: { scope: 'Own record only', example: 'Ananya sees her own attendance, marks and lessons', user: 'Ananya Kulkarni' },
}

/** Cells that would lock the admin office out of this very screen. */
const LOCKED = (role: string, m: ModuleId, a: PermAction) => role === 'Admin' && m === 'settings' && (a === 'view' || a === 'edit')

export function AccessPage() {
  const d = useData()
  const now = useNow()
  const toggle = useSchool(s => s.togglePermission)
  const toast = useToast()
  const roles = Object.keys(d.permissions)
  const [role, setRole] = useState(roles.includes('Teacher') ? 'Teacher' : roles[0])
  const matrix = d.permissions[role] ?? {}
  const granted = MODULES.reduce((a, m) => a + (matrix[m.id]?.length ?? 0), 0)
  const changes = d.audit.filter(a => a.action === 'Changed permission').slice(0, 8)
  const sc = SCOPE[role] ?? { scope: 'Defined per user', example: '—', user: 'A user' }

  const flip = (m: ModuleId, a: PermAction, label: string) => {
    if (LOCKED(role, m, a)) { toast('Admin keeps view & edit on Access control so nobody gets locked out', 'amber'); return }
    const had = (matrix[m] ?? []).includes(a)
    toggle(role, m, a, ADMIN_ID)
    toast(had ? `${role} can no longer ${a} ${label} · logged` : `${role} can now ${a} ${label} · logged`, had ? 'rust' : 'forest')
  }

  return (
    <Page>
      <PageHeader eyebrow="Access control" title="Who can do what"
        subtitle="Every request is checked in the same order: who you are, the role you hold, the module, the action, and finally which records you are allowed to see. Changes here are live and audited." />

      <Card className="mb-5">
        <CardHeader eyebrow="The chain every request passes" title={`How a ${role.toLowerCase()} request is decided`} />
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { k: 'User', v: sc.user },
            { k: 'Role', v: role },
            { k: 'Module', v: 'e.g. Fees' },
            { k: 'Action', v: (matrix.fees ?? []).length ? (matrix.fees ?? []).join(', ') : 'none on Fees' },
            { k: 'Data scope', v: sc.scope },
            { k: 'Record', v: sc.example },
          ].map((s, i, arr) => (
            <motion.div key={s.k} layout className="relative rounded-[12px] border border-line bg-paper/50 p-3">
              <div className="flex items-center gap-2">
                <span className={cx('grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold', i === 4 ? 'bg-copper text-ivory' : 'bg-forest text-ivory')}>{i + 1}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">{s.k}</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={role + s.v} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                  className="mt-1.5 text-[13px] leading-snug text-ink">{s.v}</motion.div>
              </AnimatePresence>
              {i < arr.length - 1 && <ArrowRight size={14} className="absolute -right-[11px] top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-ivory-2 text-stone xl:block" />}
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-copper/25 bg-copper-p/60 px-4 py-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-copper-d" />
          <p className="text-[13.5px] text-charcoal"><span className="font-semibold text-ink">Never rely on frontend hiding.</span> Every API enforces Role + Permission + Data Scope on the server. Hiding a button is a courtesy; the check is the rule.</p>
        </div>
      </Card>

      <TwoCol
        main={
          <Card padded={false}>
            <div className="flex flex-col gap-3 p-4 md:p-5">
              <Tabs value={role} onChange={setRole} tabs={roles.map(r => ({ id: r, label: r }))} className="w-fit max-w-full" />
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-stone">
                <Pill tone="slate">{sc.scope}</Pill>
                <span><span className="tabular text-ink">{granted}</span> permissions across {MODULES.filter(m => (matrix[m.id] ?? []).length).length} modules</span>
              </div>
            </div>
            <div className="scroll-quiet overflow-x-auto px-4 pb-4 md:px-5">
              <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[13.5px]">
                <thead>
                  <tr>
                    <th className="border-b border-line py-2.5 pr-3 text-left text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone">Module</th>
                    {ACTIONS.map(a => <th key={a} className="border-b border-line px-1 py-2.5 text-center text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone">{a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => {
                    const have = matrix[m.id] ?? []
                    return (
                      <tr key={m.id} className="group">
                        <td className="border-b border-line-2 py-2 pr-3">
                          <span className={cx('font-medium', have.length ? 'text-ink' : 'text-stone-l')}>{m.label}</span>
                          {!have.length && <span className="ml-2 text-[11.5px] text-stone-l">no access</span>}
                        </td>
                        {ACTIONS.map(a => {
                          const on = have.includes(a)
                          const locked = LOCKED(role, m.id, a)
                          return (
                            <td key={a} className="border-b border-line-2 px-1 py-1.5 text-center">
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => flip(m.id, a, m.label)}
                                aria-pressed={on} aria-label={`${role} ${a} ${m.label}`} title={locked ? 'Locked to prevent lock-out' : `${on ? 'Revoke' : 'Grant'} ${a}`}
                                className={cx('relative mx-auto grid h-8 w-8 place-items-center rounded-[9px] border transition-colors',
                                  on ? 'border-forest/30 bg-forest-p text-forest hover:bg-[#d6e5df]' : 'border-dashed border-stone-p text-stone-l hover:border-stone hover:bg-paper')}>
                                <AnimatePresence initial={false} mode="popLayout">
                                  {on && (
                                    <motion.span key="on" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={spring}>
                                      <Check size={15} strokeWidth={2.8} />
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                                {locked && <Lock size={9} className="absolute -right-1 -top-1 rounded-full bg-ivory-2 text-copper" />}
                              </motion.button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        }
        side={<>
          <Card>
            <CardHeader eyebrow="Data scope by role" title="What each role can reach" />
            <div className="space-y-1">
              {roles.map(r => (
                <button key={r} onClick={() => setRole(r)} className={cx('flex w-full items-start gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors', r === role ? 'bg-forest-p/70' : 'hover:bg-paper/70')}>
                  <KeyRound size={15} className={cx('mt-0.5 shrink-0', r === role ? 'text-forest' : 'text-stone')} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-ink">{r} <span className="font-normal text-stone">→ {SCOPE[r]?.scope ?? 'Custom'}</span></div>
                    <div className="text-[12px] text-stone">{SCOPE[r]?.example}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Audit" title="Recent permission changes" />
            {changes.length === 0 && <EmptyState icon={ShieldCheck} title="No changes yet" body="Every toggle on this page is recorded here." />}
            <AnimatePresence initial={false}>
              {changes.map(c => (
                <motion.div key={c.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" className="flex gap-3 border-b border-line-2 py-2.5 last:border-0">
                  <Avatar name={nameOf(d, c.actorId)} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-ink">{c.target}</div>
                    <div className="text-[11.5px] text-stone">{nameOf(d, c.actorId)} · {ago(c.at, now)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        </>}
      />
    </Page>
  )
}
