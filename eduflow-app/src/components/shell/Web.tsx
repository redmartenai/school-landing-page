import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { Bell, ChevronsUpDown, Menu, RotateCcw, Smartphone, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Avatar, IconButton, LiveDot, ToastProvider, ease, pageTransition, spring, useToast } from '@/components/ui'
import { AskPalette } from '@/components/AskPanel'
import { Logo } from './Logo'
import { useMe, useNotifications, useNow } from '@/store/hooks'
import { useSchool } from '@/store/school'
import { ago, dateLabel } from '@/lib/format'
import type { RoleId } from '@/data/types'

export interface NavItem { to: string; label: string; icon: LucideIcon; badge?: number; badgeTone?: 'copper' | 'rust' }
export interface NavGroup { label?: string; items: NavItem[] }

export function WebShell({ role, nav, mobileHref }: { role: Extract<RoleId, 'principal' | 'admin'>; nav: NavGroup[]; mobileHref: string }) {
  const [askOpen, setAskOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAskOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => setDrawer(false), [loc.pathname])

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-ivory">
        {/* sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-line bg-ivory-2 lg:flex">
          <Sidebar role={role} nav={nav} mobileHref={mobileHref} />
        </aside>
        <AnimatePresence>
          {drawer && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
              <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.32, ease: ease.out }} className="absolute inset-y-0 left-0 flex w-[272px] flex-col bg-ivory-2 shadow-3">
                <Sidebar role={role} nav={nav} mobileHref={mobileHref} onClose={() => setDrawer(false)} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div className="lg:pl-[256px]">
          <TopBar role={role} onAsk={() => setAskOpen(true)} onMenu={() => setDrawer(true)} />
          <main className="px-4 pb-16 pt-6 md:px-8 md:pt-8">
            <AnimatePresence mode="wait">
              <motion.div key={loc.pathname} {...pageTransition}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AskPalette open={askOpen} onClose={() => setAskOpen(false)} />
      </div>
    </ToastProvider>
  )
}

function Sidebar({ role, nav, mobileHref, onClose }: { role: 'principal' | 'admin'; nav: NavGroup[]; mobileHref: string; onClose?: () => void }) {
  const me = useMe(role)
  const school = useSchool(s => s.school)
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link to="/"><Logo /></Link>
        {onClose && <IconButton icon={X} label="Close menu" onClick={onClose} />}
      </div>
      <div className="mx-4 mb-3 rounded-[12px] border border-line bg-paper/60 px-3 py-2.5">
        <div className="text-[13px] font-semibold text-ink">{school.name}</div>
        <div className="text-[12px] text-stone">{school.city} · {school.board} · {school.academicYear}</div>
      </div>
      <nav className="scroll-quiet flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((g, gi) => (
          <div key={gi} className="mt-3 first:mt-1">
            {g.label && <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-l">{g.label}</div>}
            {g.items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.to.split('/').length <= 2}
                className={({ isActive }) => clsx('group relative mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors', isActive ? 'font-medium text-ink' : 'text-charcoal-2 hover:bg-paper/70 hover:text-ink')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId={`nav-${role}`} className="absolute inset-0 rounded-[10px] bg-forest-p" transition={spring} />}
                    {isActive && <motion.span layoutId={`nav-bar-${role}`} className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-forest" transition={spring} />}
                    <it.icon size={17} strokeWidth={isActive ? 2 : 1.7} className={clsx('relative', isActive ? 'text-forest' : 'text-stone group-hover:text-charcoal')} />
                    <span className="relative flex-1">{it.label}</span>
                    {!!it.badge && <span className={clsx('relative rounded-full px-1.5 py-px text-[11px] font-semibold tabular', it.badgeTone === 'rust' ? 'bg-rust text-ivory' : 'bg-copper-p text-copper-d')}>{it.badge}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-line-2 p-3">
        <Link to={mobileHref} className="mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-stone transition-colors hover:bg-paper hover:text-ink">
          <Smartphone size={15} /> Open the mobile app
        </Link>
        <RoleSwitcher role={role} me={me} />
      </div>
    </>
  )
}

function RoleSwitcher({ role, me }: { role: string; me: { name: string; title: string } }) {
  const [open, setOpen] = useState(false)
  const reset = useSchool(s => s.reset)
  const toast = useToast()
  const roles: { to: string; label: string; sub: string }[] = [
    { to: '/principal', label: 'Principal', sub: 'Web · Monitoring Center' },
    { to: '/admin', label: 'Administrator', sub: 'Web · Fees, payroll, admissions' },
    { to: '/m/staff', label: 'Teacher', sub: 'Mobile · Ms. Kavya Rao' },
    { to: '/m/parent', label: 'Parent', sub: 'Mobile · Sunita Kulkarni' },
    { to: '/m/student', label: 'Student', sub: 'Mobile · Ananya Kulkarni' },
    { to: '/live', label: 'Live: all at once', sub: 'Watch one action ripple through' },
  ]
  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-[12px] border border-line bg-ivory-2 p-1 shadow-2">
            <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-l">Switch role</div>
            {roles.map(r => (
              <Link key={r.to} to={r.to} onClick={() => setOpen(false)} className={clsx('block rounded-[8px] px-3 py-2 hover:bg-paper', r.to.endsWith(role) && 'bg-paper')}>
                <div className="text-[13.5px] font-medium text-ink">{r.label}</div>
                <div className="text-[12px] text-stone">{r.sub}</div>
              </Link>
            ))}
            <button onClick={() => { reset(); setOpen(false); toast('Demo school reset to 08:24') }} className="mt-1 flex w-full items-center gap-2 rounded-[8px] border-t border-line-2 px-3 py-2 text-[12.5px] text-stone hover:bg-paper">
              <RotateCcw size={13} /> Reset demo data
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-paper">
        <Avatar name={me.name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium text-ink">{me.name}</div>
          <div className="truncate text-[12px] text-stone">{me.title}</div>
        </div>
        <ChevronsUpDown size={15} className="text-stone" />
      </button>
    </div>
  )
}

function TopBar({ role, onAsk, onMenu }: { role: 'principal' | 'admin'; onAsk: () => void; onMenu: () => void }) {
  const now = useNow()
  const me = useMe(role)
  const notes = useNotifications(role, me.id)
  const read = useSchool(s => s.readNotifications)
  const [open, setOpen] = useState(false)
  const unread = notes.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-ivory/85 px-4 backdrop-blur-xl md:px-8">
      <IconButton icon={Menu} label="Menu" onClick={onMenu} className="lg:hidden" />
      <button onClick={onAsk} className="group flex h-10 min-w-0 max-w-[460px] flex-1 items-center gap-2.5 rounded-[11px] border border-line bg-ivory-2 px-3.5 text-left text-[14px] text-stone-l transition-[border,box-shadow] hover:border-stone-p hover:shadow-1">
        <Sparkles size={16} className="text-copper" />
        <span className="flex-1 truncate">Ask EduFlow anything about your school…</span>
        <kbd className="hidden rounded-md border border-line px-1.5 text-[11px] text-stone sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-line bg-ivory-2 px-3 py-1.5 text-[12.5px] text-charcoal-2 md:flex">
          <LiveDot /> Live · {dateLabel(now, { weekday: 'short', day: 'numeric', month: 'short' })} · <span className="tabular">{now.slice(11, 16)}</span>
        </div>
        <div className="relative">
          <IconButton icon={Bell} label="Notifications" badge={unread} tone="outline" onClick={() => { setOpen(o => !o); if (!open) setTimeout(() => read(role, me.id), 1500) }} />
          <AnimatePresence>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: ease.out }}
                  className="absolute right-0 top-12 z-20 w-[360px] overflow-hidden rounded-[14px] border border-line bg-ivory-2 shadow-3">
                  <div className="flex items-center justify-between border-b border-line-2 px-4 py-3">
                    <span className="font-display text-[17px]">Notifications</span>
                    <span className="text-[12px] text-stone">{unread} new</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto scroll-quiet">
                    {notes.length === 0 && <div className="px-4 py-10 text-center text-[13px] text-stone">You're all caught up.</div>}
                    {notes.slice(0, 30).map(n => (
                      <div key={n.id} className={clsx('flex gap-3 border-b border-line-2 px-4 py-3 last:border-0', !n.read && 'bg-copper-p/40')}>
                        <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-stone-p' : 'bg-copper')} />
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-ink">{n.title}</div>
                          <div className="text-[12.5px] text-stone">{n.body}</div>
                          <div className="mt-0.5 text-[11.5px] text-stone-l">{ago(n.at, now)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

/** Small helper for page sections that need a side panel layout */
export const TwoCol = ({ main, side }: { main: ReactNode; side: ReactNode }) => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
    <div className="min-w-0 space-y-5">{main}</div>
    <div className="min-w-0 space-y-5">{side}</div>
  </div>
)
