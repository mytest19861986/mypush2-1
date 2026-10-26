export interface ReportDateFilter {
  gte?: Date
  lte?: Date
  lt?: Date
}

const dateOnly = /^\d{4}-\d{2}-\d{2}$/
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const dayMs = 24 * 60 * 60 * 1000
const tehranCalendar = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
})

function tehranDate(value: Date | number) {
  const parts = tehranCalendar.formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`
}

// Find the first actual instant of the selected local date. This also handles
// historical Tehran DST changes, including dates whose midnight was skipped.
function startOfTehranDay(value: string) {
  const utcMidnight = new Date(`${value}T00:00:00Z`).getTime()
  let low = utcMidnight - dayMs
  let high = utcMidnight + dayMs
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (tehranDate(middle) < value) low = middle + 1
    else high = middle
  }
  return new Date(low)
}

function parseBoundary(value: string) {
  if (!dateOnly.test(value) && !timestamp.test(value)) throw new Error('قالب تاریخ نامعتبر است.')
  const datePart = value.slice(0, 10)
  const calendarCheck = new Date(`${datePart}T00:00:00Z`)
  if (Number(datePart.slice(0, 4)) < 1 || Number.isNaN(calendarCheck.getTime()) || calendarCheck.toISOString().slice(0, 10) !== datePart) {
    throw new Error('تاریخ نامعتبر است.')
  }
  const parsed = dateOnly.test(value) ? startOfTehranDay(value) : new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('تاریخ نامعتبر است.')
  return parsed
}

// Date-only selections represent complete Tehran calendar days. Explicit ISO
// timestamps keep their existing instant semantics; end timestamps are inclusive.
export function parseReportDateRange(from?: string | null, to?: string | null): ReportDateFilter {
  const filter: ReportDateFilter = {}
  if (from) filter.gte = parseBoundary(from)
  if (to) {
    const end = parseBoundary(to)
    if (dateOnly.test(to)) {
      const nextDate = new Date(new Date(`${to}T00:00:00Z`).getTime() + dayMs).toISOString().slice(0, 10)
      filter.lt = startOfTehranDay(nextDate)
    }
    else filter.lte = end
  }
  if (filter.gte && ((filter.lt && filter.gte >= filter.lt) || (filter.lte && filter.gte > filter.lte))) {
    throw new Error('تاریخ شروع نمی‌تواند پس از تاریخ پایان باشد.')
  }
  return filter
}

export function getRecentReportDateRange(now = new Date(), days = 30) {
  const to = tehranDate(now)
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - (days - 1) * dayMs).toISOString().slice(0, 10)
  return { from, to }
}

export function getDashboardPeriodRange(period: 'today' | 'week', now = new Date()) {
  const { to } = getRecentReportDateRange(now, 1)
  const day = new Date(`${to}T12:00:00Z`)
  // The Iranian calendar week begins on Saturday.
  const elapsedDays = period === 'today' ? 0 : (day.getUTCDay() + 1) % 7
  const from = new Date(day.getTime() - elapsedDays * dayMs).toISOString().slice(0, 10)
  return { from, to }
}
