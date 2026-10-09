import { CalendarDays } from 'lucide-react'
import { formatDate } from '@/core/utils/format'
import { PERIOD_PRESETS, type DateRange, type PeriodPreset } from '@/core/utils/dates'
import { SegmentedControl } from './Tabs'

export function PeriodPicker({ preset, range, onChange }: { preset: PeriodPreset; range: DateRange; onChange: (p: PeriodPreset) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="hidden items-center gap-1.5 text-xs font-medium text-fg-subtle md:flex">
        <CalendarDays className="size-3.5" />
        {formatDate(`${range.from}T12:00:00Z`)} → {formatDate(`${range.to}T12:00:00Z`)}
      </span>
      <SegmentedControl
        label="Période"
        value={preset}
        onChange={onChange}
        options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: p.short, title: p.label }))}
      />
    </div>
  )
}
