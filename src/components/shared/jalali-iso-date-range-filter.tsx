'use client'

import { Button } from '@/components/ui/button'
import { JalaliDateRangeFilter } from './jalali-date-range-filter'
import { gregorianDateToJalaliParts, jalaliDatePartsToIsoDate } from '@/utils/jalali-date'
import { getRecentReportDateRange } from '@/utils/report-date-range'

export function JalaliIsoDateRangeFilter({ from, to, onChange }: {
  from: string
  to: string
  onChange: (value: { from: string; to: string }) => void
}) {
  const recent = getRecentReportDateRange()
  if (!from && !to) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>همهٔ تاریخ‌ها؛ فیلتر زمانی اعمال نشده است.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(recent)}>انتخاب بازهٔ شمسی</Button>
      </div>
    )
  }
  const value = {
    from: gregorianDateToJalaliParts(from || recent.from),
    to: gregorianDateToJalaliParts(to || recent.to),
  }
  const currentYear = gregorianDateToJalaliParts(recent.to).year
  const yearOptions = [...new Set([value.from.year, value.to.year, ...Array.from({ length: 21 }, (_, index) => currentYear - index)])].sort((a, b) => b - a)
  return <JalaliDateRangeFilter value={value} yearOptions={yearOptions} onChange={range => onChange({
    from: jalaliDatePartsToIsoDate(range.from.year, range.from.month, range.from.day),
    to: jalaliDatePartsToIsoDate(range.to.year, range.to.month, range.to.day),
  })} />
}
