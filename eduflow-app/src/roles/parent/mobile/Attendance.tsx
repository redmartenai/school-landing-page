/* Attendance calendar (pushed screen): Aug–Oct month grids from school.schoolDays + today. */
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cx, ease } from '@/components/ui'
import { MSection, MobileScreen } from '@/components/shell/Mobile'
import { attendanceRate, attendanceSeries, streak, todayMark } from '@/engine/monitoring'
import { firstName, monthLabel } from '@/lib/format'
import type { AttendanceMark, Student } from '@/data/types'
import { useParentScope } from './data'
import { MCard } from './bits'

const MONTHS = ['2026-08', '2026-09', '2026-10']
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
type Cell = { date: string; day: number; mark: AttendanceMark | 'today' | 'weekend' | 'future' | 'none' }

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const markStyle: Record<Cell['mark'], string> = {
  P: 'bg-forest-p text-forest',
  L: 'bg-copper-p text-copper-d ring-1 ring-copper/30',
  A: 'bg-rust text-ivory',
  today: 'bg-amber-p text-[#8a5f14] ring-2 ring-amber',
  weekend: 'text-stone-l',
  future: 'text-stone-l',
  none: 'text-stone-l',
}

export function AttendanceScreen({ studentId }: { studentId: string }) {
  const { d, children } = useParentScope()
  const s = children.find(c => c.id === studentId) as Student // scoped to her own children
  const today = d.school.today
  const byDate = new Map<string, AttendanceMark>()
  d.school.schoolDays.forEach((date, i) => { const m = s.attendance[i]; if (m) byDate.set(date, m) })
  const tMark = todayMark(d, s)
  if (tMark) byDate.set(today, tMark)

  const series = attendanceSeries(d, s)
  const rate = attendanceRate(series)
  const st = streak(d, s)
  const absences = series.filter(m => m === 'A').length
  const lates = series.filter(m => m === 'L').length
  const name = firstName(s.name)

  return (
    <MobileScreen title="Attendance" eyebrow={`${name} · Class ${s.classId}`}>
      <MCard tone={st >= 10 ? 'forest' : 'copper'}>
        <div className="flex items-center gap-3">
          <span className={cx('grid h-12 w-12 place-items-center rounded-full', st >= 10 ? 'bg-forest text-ivory' : 'bg-copper text-ivory')}><Flame size={22} /></span>
          <div>
            <div className="font-display text-[28px] tabular leading-none text-ink">{st} day{st === 1 ? '' : 's'}</div>
            <div className="mt-1 text-[13.5px] text-charcoal-2">{st >= 20 ? `${name} hasn't missed a day in ${st} school days.` : st > 0 ? `In school every day since the last absence.` : `${name} is away today.`}</div>
          </div>
        </div>
      </MCard>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['Attendance', `${Math.round(rate * 100)}%`, rate >= 0.9 ? 'text-forest' : rate >= 0.75 ? 'text-copper-d' : 'text-rust'],
          ['Absent', String(absences), absences ? 'text-rust' : 'text-ink'],
          ['Late', String(lates), lates ? 'text-copper-d' : 'text-ink'],
        ].map(([k, v, c]) => (
          <MCard key={k} className="!p-3">
            <div className="text-[12px] text-stone">{k}</div>
            <div className={cx('font-display text-[22px] tabular', c)}>{v}</div>
          </MCard>
        ))}
      </div>
      <div className="mt-1 px-1 text-[12px] text-stone">Last {series.length} school days</div>

      {[...MONTHS].reverse().map(ym => {
        const [y, m] = ym.split('-').map(Number)
        const days = new Date(y, m, 0).getDate()
        const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
        const cells: (Cell | null)[] = Array.from({ length: lead }, () => null)
        for (let day = 1; day <= days; day++) {
          const date = iso(y, m, day)
          const wd = (new Date(y, m - 1, day).getDay() + 6) % 7
          const mark: Cell['mark'] = wd >= 5 ? 'weekend' : date > today ? 'future' : byDate.get(date) ?? (date === today ? 'today' : 'none')
          cells.push({ date, day, mark })
        }
        const marked = cells.filter((c): c is Cell => !!c && (c.mark === 'P' || c.mark === 'L' || c.mark === 'A'))
        const present = marked.filter(c => c.mark !== 'A').length
        return (
          <MSection key={ym} title={monthLabel(ym)} action={marked.length ? <span className="text-[12.5px] tabular text-stone">{present}/{marked.length} days</span> : undefined}>
            <MCard>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WD.map((w, i) => <div key={i} className="pb-1 text-[11px] font-medium text-stone">{w}</div>)}
                {cells.map((c, i) => c ? (
                  <motion.div key={c.date} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008, duration: 0.3, ease: ease.out }}
                    title={c.date}
                    className={cx('grid aspect-square place-items-center rounded-[9px] text-[13px] tabular', markStyle[c.mark], c.date === today && c.mark !== 'today' && 'ring-2 ring-ink/70')}>
                    {c.day}
                  </motion.div>
                ) : <div key={`e${i}`} />)}
              </div>
            </MCard>
          </MSection>
        )
      })}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-1 text-[12.5px] text-stone">
        {[['bg-forest-p ring-1 ring-forest/20', 'Present'], ['bg-copper-p ring-1 ring-copper/30', 'Late'], ['bg-rust', 'Absent'], ['bg-amber-p ring-2 ring-amber', 'Register not taken yet']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={cx('h-3 w-3 rounded-[4px]', c)} />{l}</span>
        ))}
      </div>
    </MobileScreen>
  )
}
