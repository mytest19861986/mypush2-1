'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { PageHeader, StatusBadge, StatCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, toPersianNum } from '@/utils/formatters'
import {
  CalendarDays,
  ClipboardList,
  FileText,
  RefreshCcw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react'

type DoctorVisit = {
  visitId: string
  status: string
  visitedAt: string | null
  createdAt: string
  doctorNote?: string | null
  notes?: string | null
  plan?: {
    title?: string | null
    endDate?: string | null
  } | null
  planHolder?: {
    firstName?: string | null
    lastName?: string | null
  } | null
}

type ParsedJalaliDate = {
  isoStart: string
  isoEnd: string
  timestamp: number
}

function normalizePersianDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .trim()
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function jalaliToGregorian(jy: number, jm: number, jd: number) {
  let days =
    -355668 +
    365 * (jy + 1595) +
    Math.floor((jy + 1595) / 33) * 8 +
    Math.floor((((jy + 1595) % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)

  let gy = 400 * Math.floor(days / 146097)
  days %= 146097

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }

  gy += 4 * Math.floor(days / 1461)
  days %= 1461

  if (days > 365) {
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }

  let gd = days + 1
  const monthDays = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  let gm = 1

  while (gm <= 12 && gd > monthDays[gm]) {
    gd -= monthDays[gm]
    gm++
  }

  return { gy, gm, gd }
}

function gregorianToJalali(gy: number, gm: number, gd: number) {
  const gregorianMonthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    gregorianMonthDays[gm - 1]

  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461

  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }

  if (days < 186) {
    return {
      jy,
      jm: 1 + Math.floor(days / 31),
      jd: 1 + (days % 31),
    }
  }

  return {
    jy,
    jm: 7 + Math.floor((days - 186) / 30),
    jd: 1 + ((days - 186) % 30),
  }
}

function parseJalaliDateInput(value: string): ParsedJalaliDate | null {
  const normalized = normalizePersianDigits(value)
  if (!normalized) return null

  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) return null

  const jy = Number(match[1])
  const jm = Number(match[2])
  const jd = Number(match[3])

  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null

  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd)
  const roundTrip = gregorianToJalali(gy, gm, gd)
  if (roundTrip.jy !== jy || roundTrip.jm !== jm || roundTrip.jd !== jd) return null

  const start = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0, 0))
  const end = new Date(Date.UTC(gy, gm - 1, gd, 23, 59, 59, 999))

  return {
    isoStart: start.toISOString(),
    isoEnd: end.toISOString(),
    timestamp: start.getTime(),
  }
}

function formatOptionalDate(date?: string | null) {
  return date ? formatDate(date) : 'ثبت نشده'
}

function getPatientName(visit: DoctorVisit) {
  const name = `${visit.planHolder?.firstName || ''} ${visit.planHolder?.lastName || ''}`.trim()
  return name || 'بیمار'
}

function getVisitNote(visit: DoctorVisit) {
  return visit.doctorNote || visit.notes || null
}

function VisitSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function DoctorContractsPage() {
  const [visits, setVisits] = useState<DoctorVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [appliedToDate, setAppliedToDate] = useState('')

  const parsedFromDate = fromDate ? parseJalaliDateInput(fromDate) : null
  const parsedToDate = toDate ? parseJalaliDateInput(toDate) : null
  const dateFormatError =
    (fromDate && !parsedFromDate) || (toDate && !parsedToDate)
      ? 'تاریخ را به فرمت ۱۴۰۳/۰۱/۰۱ وارد کنید.'
      : null
  const dateRangeError =
    parsedFromDate && parsedToDate && parsedToDate.timestamp < parsedFromDate.timestamp
      ? 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.'
      : null
  const filterError = dateFormatError || dateRangeError

  const fetchVisits = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('take', '50')
      if (appliedFromDate) params.set('from', appliedFromDate)
      if (appliedToDate) params.set('to', appliedToDate)

      const query = params.toString()
      const res = await apiClient.get<DoctorVisit[]>(
        `/visits/doctor${query ? `?${query}` : ''}`
      )

      if (res.success && res.data) {
        setVisits(Array.isArray(res.data) ? res.data : [])
        return
      }

      setVisits([])
      setError('خطا در دریافت سوابق ویزیت‌ها')
    } catch {
      setVisits([])
      setError('خطا در دریافت سوابق ویزیت‌ها')
    } finally {
      setIsLoading(false)
    }
  }, [appliedFromDate, appliedToDate])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  const stats = useMemo(() => {
    const completed = visits.filter((visit) => visit.status === 'COMPLETED').length
    const pending = visits.filter((visit) => visit.status === 'PENDING').length

    return {
      total: visits.length,
      completed,
      pending,
    }
  }, [visits])

  const resetFilters = () => {
    setFromDate('')
    setToDate('')
    setAppliedFromDate('')
    setAppliedToDate('')
  }

  const applyFilters = () => {
    if (filterError) return
    setAppliedFromDate(parsedFromDate?.isoStart ?? '')
    setAppliedToDate(parsedToDate?.isoEnd ?? '')
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سوابق ویزیت‌ها"
        description="لیست ویزیت‌های ثبت‌شده توسط شما در سامانه حامی کارت."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="کل ویزیت‌ها"
          value={toPersianNum(stats.total)}
          icon={ClipboardList}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="ویزیت‌های تکمیل‌شده"
          value={toPersianNum(stats.completed)}
          icon={Stethoscope}
          iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        />
        <StatCard
          title="در انتظار"
          value={toPersianNum(stats.pending)}
          icon={CalendarDays}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-primary" />
            فیلتر تاریخ ویزیت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="fromDate">از تاریخ</Label>
              <Input
                id="fromDate"
                type="text"
                inputMode="numeric"
                placeholder="۱۴۰۳/۰۱/۰۱"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">تا تاریخ</Label>
              <Input
                id="toDate"
                type="text"
                inputMode="numeric"
                placeholder="۱۴۰۳/۰۱/۰۱"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                dir="ltr"
              />
            </div>
            <Button onClick={applyFilters} disabled={Boolean(filterError)}>
              اعمال فیلتر
            </Button>
            <Button
              variant="outline"
              onClick={resetFilters}
              disabled={!fromDate && !toDate && !appliedFromDate && !appliedToDate}
            >
              پاک کردن فیلتر
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            تاریخ‌ها را به صورت شمسی وارد کنید.
          </p>
          {filterError && (
            <p className="mt-2 text-sm text-destructive">{filterError}</p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <VisitSkeleton />
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto mb-3 size-12 text-destructive" />
            <p className="font-medium text-destructive">{error}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={fetchVisits}>
              <RefreshCcw className="size-4" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="size-7" />
            </div>
            <div>
              <h2 className="font-semibold">هنوز ویزیتی ثبت نکرده‌اید.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                برای ثبت ویزیت، ابتدا بیمار را از صفحه جستجوی بیمار بررسی کنید.
              </p>
            </div>
            <Button asChild>
              <Link href="/doctor/patients">جستجوی بیمار و ثبت ویزیت</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              لیست ویزیت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-3 text-right font-medium">بیمار</th>
                    <th className="py-3 text-right font-medium">طرح</th>
                    <th className="py-3 text-right font-medium">وضعیت</th>
                    <th className="py-3 text-right font-medium">تاریخ ویزیت</th>
                    <th className="py-3 text-right font-medium">ثبت در سامانه</th>
                    <th className="py-3 text-right font-medium">پایان طرح</th>
                    <th className="py-3 text-right font-medium">یادداشت پزشک</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => {
                    const note = getVisitNote(visit)

                    return (
                      <tr key={visit.visitId} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="size-4" />
                            </div>
                            <span className="font-medium">{getPatientName(visit)}</span>
                          </div>
                        </td>
                        <td className="py-4">{visit.plan?.title || 'ثبت نشده'}</td>
                        <td className="py-4">
                          <StatusBadge status={visit.status} />
                        </td>
                        <td className="py-4">{formatOptionalDate(visit.visitedAt)}</td>
                        <td className="py-4">{formatOptionalDate(visit.createdAt)}</td>
                        <td className="py-4">{formatOptionalDate(visit.plan?.endDate)}</td>
                        <td className="max-w-[220px] py-4">
                          <span className="line-clamp-2 text-muted-foreground">
                            {note || 'ثبت نشده'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {visits.map((visit) => {
                const note = getVisitNote(visit)

                return (
                  <div key={visit.visitId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{getPatientName(visit)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {visit.plan?.title || 'طرح ثبت نشده'}
                        </p>
                      </div>
                      <StatusBadge status={visit.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        <span>تاریخ ویزیت: {formatOptionalDate(visit.visitedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        <span>ثبت در سامانه: {formatOptionalDate(visit.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        <span>پایان طرح: {formatOptionalDate(visit.plan?.endDate)}</span>
                      </div>
                    </div>

                    {note && (
                      <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm leading-6">
                        {note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
