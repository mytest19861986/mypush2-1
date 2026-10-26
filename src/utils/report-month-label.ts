import { formatJalaliDateRange } from './formatters'

// Preserve the API's existing monthly buckets; display their exact date span.
// Renaming a Gregorian bucket as one Jalali month would misrepresent its totals.
export function formatReportMonthRange(yearMonth: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth)
  if (!match) return 'بازه نامعتبر'
  const year = Number(match[1])
  if (year < 1000 || year > 9999) return 'بازه نامعتبر'
  const month = Number(match[2])
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return formatJalaliDateRange(`${yearMonth}-01`, `${yearMonth}-${String(lastDay).padStart(2, '0')}`)
}
