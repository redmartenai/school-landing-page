import clsx from 'clsx'

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#2E5D4E" />
      <path d="M9 21c3-7 7-10 14-11-4 3-6 7-7 12" stroke="#F8F5EF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="10" r="2.2" fill="#D19A5C" />
    </svg>
  )
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('font-display text-[21px] tracking-[-0.02em]', light ? 'text-ivory' : 'text-ink')}>EduFlow</span>
    </span>
  )
}
