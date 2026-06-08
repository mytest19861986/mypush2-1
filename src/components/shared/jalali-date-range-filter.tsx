'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JALALI_MONTHS, getJalaliMonthLength, type JalaliDateParts } from '@/utils/jalali-date'

export interface JalaliDateRangeValue {
  from: JalaliDateParts
  to: JalaliDateParts
}

interface JalaliDateRangeFilterProps {
  value: JalaliDateRangeValue
  onChange: (value: JalaliDateRangeValue) => void
  yearOptions: number[]
  fromLabel?: string
  toLabel?: string
}

function getSafeMonthLength(value: JalaliDateParts) {
  try {
    return getJalaliMonthLength(value.year, value.month)
  } catch {
    return 31
  }
}

function clampDate(value: JalaliDateParts): JalaliDateParts {
  const maxDay = getSafeMonthLength(value)
  return {
    ...value,
    day: Math.min(Math.max(value.day, 1), maxDay),
  }
}

function DateFields({
  idPrefix,
  label,
  value,
  onChange,
  yearOptions,
}: {
  idPrefix: string
  label: string
  value: JalaliDateParts
  onChange: (value: JalaliDateParts) => void
  yearOptions: number[]
}) {
  const days = Array.from({ length: getSafeMonthLength(value) }, (_, index) => index + 1)

  const updateValue = (next: Partial<JalaliDateParts>) => {
    onChange(clampDate({ ...value, ...next }))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2">
        <Select
          value={String(value.year)}
          onValueChange={(selectedYear) => updateValue({ year: Number(selectedYear) })}
          dir="rtl"
        >
          <SelectTrigger id={`${idPrefix}-year`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year.toLocaleString('fa-IR', { useGrouping: false })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(value.month)}
          onValueChange={(selectedMonth) => updateValue({ month: Number(selectedMonth) })}
          dir="rtl"
        >
          <SelectTrigger id={`${idPrefix}-month`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JALALI_MONTHS.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(value.day)}
          onValueChange={(selectedDay) => updateValue({ day: Number(selectedDay) })}
          dir="rtl"
        >
          <SelectTrigger id={`${idPrefix}-day`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={String(day)}>
                {day.toLocaleString('fa-IR')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function JalaliDateRangeFilter({
  value,
  onChange,
  yearOptions,
  fromLabel = 'از تاریخ',
  toLabel = 'تا تاریخ',
}: JalaliDateRangeFilterProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2" dir="rtl">
      <DateFields
        idPrefix="jalali-range-from"
        label={fromLabel}
        value={value.from}
        yearOptions={yearOptions}
        onChange={(from) => onChange({ ...value, from })}
      />
      <DateFields
        idPrefix="jalali-range-to"
        label={toLabel}
        value={value.to}
        yearOptions={yearOptions}
        onChange={(to) => onChange({ ...value, to })}
      />
    </div>
  )
}
