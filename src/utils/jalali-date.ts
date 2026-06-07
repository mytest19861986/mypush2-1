export interface JalaliYearMonth {
  year: number
  month: number
}

export interface IsoDateRange {
  from: string
  to: string
}

export interface JalaliDateParts {
  year: number
  month: number
  day: number
}

export const JALALI_MONTHS = [
  { value: 1, label: 'فروردین' },
  { value: 2, label: 'اردیبهشت' },
  { value: 3, label: 'خرداد' },
  { value: 4, label: 'تیر' },
  { value: 5, label: 'مرداد' },
  { value: 6, label: 'شهریور' },
  { value: 7, label: 'مهر' },
  { value: 8, label: 'آبان' },
  { value: 9, label: 'آذر' },
  { value: 10, label: 'دی' },
  { value: 11, label: 'بهمن' },
  { value: 12, label: 'اسفند' },
] as const

const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
]

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function div(a: number, b: number) {
  return Math.trunc(a / b)
}

function mod(a: number, b: number) {
  return a - div(a, b) * b
}

function jalCal(jy: number) {
  if (jy < JALALI_BREAKS[0] || jy >= JALALI_BREAKS[JALALI_BREAKS.length - 1]) {
    throw new RangeError('Jalali year is out of supported range')
  }

  const gy = jy + 621
  let leapJ = -14
  let jp = JALALI_BREAKS[0]
  let jump = 0

  for (let i = 1; i < JALALI_BREAKS.length; i += 1) {
    const jm = JALALI_BREAKS[i]
    jump = jm - jp

    if (jy < jm) break

    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)

  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33
  }

  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { gy, march, leap }
}

function gregorianToDayNumber(gy: number, gm: number, gd: number) {
  let day =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408

  day = day - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return day
}

function dayNumberToGregorian(dayNumber: number) {
  let j = 4 * dayNumber + 139361631
  j = j + div(div(4 * dayNumber + 183187720, 146097) * 3, 4) * 4 - 3908

  const i = div(mod(j, 1461), 4) * 5 + 308
  const day = div(mod(i, 153), 5) + 1
  const month = mod(div(i, 153), 12) + 1
  const year = div(j, 1461) - 100100 + div(8 - month, 6)

  return { year, month, day }
}

function jalaliToDayNumber(jy: number, jm: number, jd: number) {
  const { gy, march } = jalCal(jy)
  return gregorianToDayNumber(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function dayNumberToJalali(dayNumber: number) {
  const { year: gy } = dayNumberToGregorian(dayNumber)
  let jy = gy - 621
  const jalaliYear = jalCal(jy)
  const firstFarvardin = gregorianToDayNumber(gy, 3, jalaliYear.march)
  let dayOfYear = dayNumber - firstFarvardin

  if (dayOfYear >= 0) {
    if (dayOfYear <= 185) {
      return {
        year: jy,
        month: 1 + div(dayOfYear, 31),
        day: mod(dayOfYear, 31) + 1,
      }
    }

    dayOfYear -= 186
  } else {
    jy -= 1
    dayOfYear += 179

    if (jalaliYear.leap === 1) {
      dayOfYear += 1
    }
  }

  return {
    year: jy,
    month: 7 + div(dayOfYear, 30),
    day: mod(dayOfYear, 30) + 1,
  }
}

function formatIsoDate(parts: { year: number; month: number; day: number }) {
  const year = String(parts.year).padStart(4, '0')
  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getJalaliMonthLength(jy: number, jm: number): number {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || jm < 1 || jm > 12) {
    throw new RangeError('Invalid Jalali year/month')
  }

  const nextMonth = jm === 12 ? 1 : jm + 1
  const nextYear = jm === 12 ? jy + 1 : jy

  return jalaliToDayNumber(nextYear, nextMonth, 1) - jalaliToDayNumber(jy, jm, 1)
}

export function jalaliDatePartsToGregorianDate(jy: number, jm: number, jd: number): Date {
  const monthLength = getJalaliMonthLength(jy, jm)

  if (!Number.isInteger(jd) || jd < 1 || jd > monthLength) {
    throw new RangeError('Invalid Jalali day')
  }

  const gregorian = dayNumberToGregorian(jalaliToDayNumber(jy, jm, jd))
  return new Date(Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day))
}

export function jalaliDatePartsToIsoDate(jy: number, jm: number, jd: number): string {
  const monthLength = getJalaliMonthLength(jy, jm)

  if (!Number.isInteger(jd) || jd < 1 || jd > monthLength) {
    throw new RangeError('Invalid Jalali day')
  }

  const gregorian = dayNumberToGregorian(jalaliToDayNumber(jy, jm, jd))
  return formatIsoDate(gregorian)
}

function toDisplayDate(value: string | Date): Date {
  if (value instanceof Date) return value
  return dateOnlyPattern.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
}

/**
 * Converts an exact Jalali month to ISO Gregorian date strings.
 * Example by reasoning: Farvardin 1 is calculated from the Jalali leap cycle's March
 * anchor, and the end date is one day before the next Jalali month's first day.
 */
export function jalaliMonthToGregorianRange(jy: number, jm: number): IsoDateRange {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || jm < 1 || jm > 12) {
    throw new RangeError('Invalid Jalali year/month')
  }

  const nextMonth = jm === 12 ? 1 : jm + 1
  const nextYear = jm === 12 ? jy + 1 : jy
  const from = dayNumberToGregorian(jalaliToDayNumber(jy, jm, 1))
  const to = dayNumberToGregorian(jalaliToDayNumber(nextYear, nextMonth, 1) - 1)

  return {
    from: formatIsoDate(from),
    to: formatIsoDate(to),
  }
}

export function getCurrentJalaliYearMonth(date = new Date()): JalaliYearMonth {
  const jalaliDate = dayNumberToJalali(
    gregorianToDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate())
  )

  return {
    year: jalaliDate.year,
    month: jalaliDate.month,
  }
}

export function getCurrentJalaliMonthRange(date = new Date()): IsoDateRange {
  const current = getCurrentJalaliYearMonth(date)
  return jalaliMonthToGregorianRange(current.year, current.month)
}

export function formatJalaliDate(value: string | Date): string {
  return jalaliDateFormatter.format(toDisplayDate(value))
}
