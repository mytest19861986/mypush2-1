'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatPrice, toPersianNum } from '@/utils/formatters'
import {
  CalendarDays,
  ClipboardList,
  FileText,
  RefreshCcw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type DoctorVisit = {
  visitId: string
  status: string
  visitedAt: string | null
  createdAt: string
  discountAmount?: number | null
  plan?: {
    title?: string | null
    endDate?: string | null
  } | null
  planHolder?: {
    firstName?: string | null
    lastName?: string | null
    nationalCode?: string | null
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

function maskNationalCode(value?: string | null) {
  if (!value) return 'ثبت نشده'
  return value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : value
}

function formatDiscountAmount(value?: number | null) {
  return typeof value === 'number' ? `${formatPrice(value)} تومان` : 'ثبت نشده'
}

function getPatientName(visit: DoctorVisit) {
  const name = `${visit.planHolder?.firstName || ''} ${visit.planHolder?.lastName || ''}`.trim()
  return name || 'بیمار'
}

function getVisitDate(visit: DoctorVisit) {
  return visit.visitedAt || visit.createdAt
}

function matchesVisitSearch(visit: DoctorVisit, query: string) {
  if (!query) return true

  const normalizedQuery = normalizePersianDigits(query).toLowerCase()
  const patientName = normalizePersianDigits(getPatientName(visit)).toLowerCase()
  const nationalCode = normalizePersianDigits(visit.planHolder?.nationalCode || '')

  return patientName.includes(normalizedQuery) || nationalCode.includes(normalizedQuery)
}

function getVisitStatusMeta(status: string) {
  const successClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  const warningClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  const mutedDestructiveClass = 'bg-red-100 text-red-700 dark:bg-red-900/25 dark:text-red-300'

  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'فعال', className: successClass },
    COMPLETED: { label: 'ثبت‌شده', className: successClass },
    SUCCESS: { label: 'موفق', className: successClass },
    APPROVED: { label: 'ثبت‌شده', className: successClass },
    PENDING: { label: 'در انتظار', className: warningClass },
    CANCELLED: { label: 'لغو شده', className: mutedDestructiveClass },
    CANCELED: { label: 'لغو شده', className: mutedDestructiveClass },
    FAILED: { label: 'ناموفق', className: mutedDestructiveClass },
    REJECTED: { label: 'ناموفق', className: mutedDestructiveClass },
  }

  return map[status]
}

function VisitStatusBadge({ status }: { status: string }) {
  const meta = getVisitStatusMeta(status)

  return (
    <StatusBadge
      status={status}
      label={meta?.label}
      className={meta?.className}
    />
  )
}

function DoctorKpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: LucideIcon
}) {
  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardContent className="flex min-h-28 flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-4 truncate text-3xl font-bold text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function VisitSkeleton() {
  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
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
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredVisits = useMemo(
    () => visits.filter((visit) => matchesVisitSearch(visit, searchQuery)),
    [visits, searchQuery]
  )

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
        description="مشاهده و پیگیری ویزیت‌های ثبت‌شده برای بیماران حامی‌کارت"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DoctorKpiCard
          title="کل ویزیت‌ها"
          value={toPersianNum(stats.total)}
          icon={ClipboardList}
        />
        <DoctorKpiCard
          title="ویزیت‌های تکمیل‌شده"
          value={toPersianNum(stats.completed)}
          icon={Stethoscope}
        />
        <DoctorKpiCard
          title="در انتظار"
          value={toPersianNum(stats.pending)}
          icon={CalendarDays}
        />
      </div>

      <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-primary" />
            جستجو و فیلتر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xl space-y-2">
            <Label htmlFor="visitSearch">جستجو</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="visitSearch"
                type="search"
                placeholder="جستجو بر اساس نام بیمار یا کد ملی"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-xl pr-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto_auto] sm:items-end">
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
                className="h-11 rounded-xl"
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
                className="h-11 rounded-xl"
              />
            </div>
            <Button onClick={applyFilters} disabled={Boolean(filterError)} className="h-11 rounded-xl">
              اعمال فیلتر
            </Button>
            <Button
              variant="outline"
              onClick={resetFilters}
              disabled={!fromDate && !toDate && !appliedFromDate && !appliedToDate}
              className="h-11 rounded-xl"
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
        <Card className="rounded-2xl border border-destructive/30 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
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
        <EmptyState
          icon={<ClipboardList />}
          title="هنوز ویزیتی ثبت نشده است"
          description="برای ثبت ویزیت، ابتدا بیمار را از صفحه جستجوی بیمار بررسی کنید."
          action={
            <Button asChild>
              <Link href="/doctor/patients">جستجوی بیمار و ثبت ویزیت</Link>
            </Button>
          }
          className="border-dashed py-12 shadow-none"
        />
      ) : filteredVisits.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="نتیجه‌ای یافت نشد"
          description="عبارت جستجو را تغییر دهید یا فیلترهای تاریخ را پاک کنید."
          className="border-dashed py-12 shadow-none"
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              لیست ویزیت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100/70 bg-background dark:border-slate-800/70 md:block">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-slate-100/70 bg-muted/20 text-muted-foreground dark:border-slate-800/70">
                    <th className="w-[26%] px-4 py-3 text-right font-medium">نام بیمار</th>
                    <th className="w-[17%] px-4 py-3 text-right font-medium">کد ملی</th>
                    <th className="w-[22%] px-4 py-3 text-right font-medium">تاریخ ویزیت</th>
                    <th className="w-[19%] px-4 py-3 text-right font-medium">تخفیف اعمال‌شده</th>
                    <th className="w-[16%] px-4 py-3 text-right font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((visit) => (
                    <tr key={visit.visitId} className="border-b border-slate-100/70 last:border-0 dark:border-slate-800/70">
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="size-4" />
                          </div>
                          <span className="truncate font-medium">{getPatientName(visit)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground" dir="ltr">
                        {maskNationalCode(visit.planHolder?.nationalCode)}
                      </td>
                      <td className="px-4 py-4">{formatOptionalDate(getVisitDate(visit))}</td>
                      <td className="px-4 py-4">{formatDiscountAmount(visit.discountAmount)}</td>
                      <td className="px-4 py-4">
                        <VisitStatusBadge status={visit.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredVisits.map((visit) => (
                <div key={visit.visitId} className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{getPatientName(visit)}</p>
                      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                        {maskNationalCode(visit.planHolder?.nationalCode)}
                      </p>
                    </div>
                    <VisitStatusBadge status={visit.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span>تاریخ ویزیت</span>
                      <span className="font-medium text-foreground">{formatOptionalDate(getVisitDate(visit))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>تخفیف اعمال‌شده</span>
                      <span className="font-medium text-foreground">{formatDiscountAmount(visit.discountAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
