import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { IndianRupee, Landmark, TriangleAlert, Users } from 'lucide-react'
import { Page, PageHeader, Stat, Tabs, ease } from '@/components/ui'
import { useData, usePulse } from '@/store/hooks'
import { feeStatus } from '@/engine/monitoring'
import { pct, rupeesShort } from '@/lib/format'
import { FeeLedger } from './FeeLedger'
import { FeeDefaulters } from './FeeDefaulters'
import { FeeCollections } from './FeeCollections'
import { FeeStructure } from './FeeStructure'

type TabId = 'ledger' | 'defaulters' | 'collections' | 'structure'
const TABS: TabId[] = ['ledger', 'defaulters', 'collections', 'structure']

export function FeesPage() {
  const d = useData()
  const pulse = usePulse()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = TABS.includes(raw as TabId) ? (raw as TabId) : 'ledger'
  const setTab = (t: TabId) => setParams(t === 'ledger' ? {} : { tab: t }, { replace: true })
  const defaulters = d.students.filter(s => feeStatus(s).overdue > 0).length

  return (
    <Page>
      <PageHeader eyebrow="Fees · 2026–27" title="Fees & collections"
        subtitle={`${pct(pulse.feeCollected / pulse.feeTotal)} of this year's fees are in. ${defaulters} families missed the 15 September instalment — that is where to look first.`} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected this year" value={pulse.feeCollected} format={rupeesShort} icon={IndianRupee} tone="forest" sub={`of ${rupeesShort(pulse.feeTotal)} billed`} />
        <Stat label="Still to come" value={pulse.feeTotal - pulse.feeCollected} format={rupeesShort} icon={Landmark} tone="slate" sub="Mostly Term 3, due 15 Jan" />
        <Stat label="Overdue" value={pulse.feeOverdue} format={rupeesShort} icon={TriangleAlert} tone="rust" sub="Term 2 was due 15 Sep" />
        <Stat label="Families behind" value={defaulters} icon={Users} tone="copper" sub={`of ${d.students.length} students`} />
      </div>

      <Tabs className="mb-5 w-fit max-w-full" value={tab} onChange={setTab} tabs={[
        { id: 'ledger', label: 'Ledger', count: d.students.length },
        { id: 'defaulters', label: 'Defaulters', count: defaulters },
        { id: 'collections', label: 'Collections' },
        { id: 'structure', label: 'Fee structure' },
      ]} />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease: ease.out }}>
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-5">
            {tab === 'ledger' && <FeeLedger />}
            {tab === 'defaulters' && <FeeDefaulters />}
            {tab === 'collections' && <FeeCollections />}
            {tab === 'structure' && <FeeStructure />}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Page>
  )
}
