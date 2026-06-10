'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  Clock3,
  Filter,
  type LucideIcon,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, StatCard, StatusBadge } from '@/components/shared'
import { JalaliDateRangeFilter, type JalaliDateRangeValue } from '@/components/shared/jalali-date-range-filter'
import { useToast } from '@/hooks/use-toast'
import { commissionsService, type AdminCommissionSummary } from '@/services'
import type { CommissionItem, CommissionSourceType, CommissionStatus, SettlementStatus } from '@/types'
import {
  COMMISSION_SOURCE_TYPE_LABELS,
  COMMISSION_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from '@/constants'
import { formatJalaliDate, formatJalaliDateRange, formatPriceWithUnit, toPersianNum } from '@/utils/formatters'
import {
  getCurrentJalaliYearMonth,
  gregorianDateToJalaliParts,
  jalaliDatePartsToIsoDate,
} from '@/utils/jalali-date'

type StatusFilter = 'all' | CommissionStatus
type SourceTypeFilter = 'all' | CommissionSourceType

interface CommissionPerson {
  mobile?: string | null
  profile?: {
    firstName?: string | null
    lastName?: string | null
  } | null
  agent?: {
    businessName?: string | null
  } | null
}

type AdminCommissionItem = CommissionItem & {
  sourceType?: CommissionSourceType
  sourceLabel?: string
  agent?: CommissionPerson | null
  userPlan?: CommissionItem['userPlan'] & {
    salesCustomer?: {
      firstName?: string | null
      lastName?: string | null
      mobile?: string | null
    } | null
    user?: CommissionPerson | null
  }
}

function getSafePersonName(person?: CommissionPerson | null) {
  if (!person) return 'نامشخص'

  const firstName = person.profile?.firstName?.trim() ?? ''
  const lastName = person.profile?.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) return fullName
  return person.mobile?.trim() || 'نامشخص'
}

function getSafeCustomerName(
  customer?: {
    firstName?: string | null
    lastName?: string | null
    mobile?: string | null
  } | null
) {
  if (!customer) return 'نامشخص'

  const firstName = customer.firstName?.trim() ?? ''
  const lastName = customer.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) return fullName
  return customer.mobile?.trim() || 'نامشخص'
}

function getCommissionCustomerName(row: AdminCommissionItem) {
  if (row.userPlan?.salesCustomer) return getSafeCustomerName(row.userPlan.salesCustomer)
  return getSafePersonName(row.userPlan?.user)
}

function getCommissionCustomerMobile(row: AdminCommissionItem) {
  return row.userPlan?.salesCustomer?.mobile || row.userPlan?.user?.mobile || '—'
}

function getSafeDate(value?: string | null) {
  return value ? formatJalaliDate(value) : '—'
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

function getRecentJalaliRange(days: number): JalaliDateRangeValue {
  const today = startOfLocalDay(new Date())
  return {
    from: gregorianDateToJalaliParts(addLocalDays(today, -(days - 1))),
    to: gregorianDateToJalaliParts(today),
  }
}

function toIsoRange(range: JalaliDateRangeValue) {
  return {
    from: jalaliDatePartsToIsoDate(range.from.year, range.from.month, range.from.day),
    to: jalaliDatePartsToIsoDate(range.to.year, range.to.month, range.to.day),
  }
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 py-16 text-center">
      <Icon className="mb-3 size-12 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

export default function AdminCommissionsPage() {
  const { toast } = useToast()
  const defaultJalaliMonth = useMemo(() => getCurrentJalaliYearMonth(), [])
  const [commissions, setCommissions] = useState<AdminCommissionItem[]>([])
  const [summary, setSummary] = useState<AdminCommissionSummary | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [dateRange, setDateRange] = useState<JalaliDateRangeValue>(() => getRecentJalaliRange(30))
  const [isListLoading, setIsListLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null)
  const [summaryErrorMessage, setSummaryErrorMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<'approve' | 'cancel' | 'pay' | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminCommissionItem | null>(null)
  const [payTarget, setPayTarget] = useState<AdminCommissionItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [payDescription, setPayDescription] = useState('')

  const isoRange = useMemo(() => {
    try {
      return toIsoRange(dateRange)
    } catch {
      return null
    }
  }, [dateRange])

  const rangeLabel = useMemo(() => {
    if (!isoRange) return 'بازه تاریخ نامعتبر است'
    return formatJalaliDateRange(isoRange.from, isoRange.to)
  }, [isoRange])

  const loadCommissions = useCallback(async () => {
    setIsListLoading(true)
    setListErrorMessage(null)

    if (!isoRange) {
      setListErrorMessage('بازه تاریخ نامعتبر است')
      setCommissions([])
      setTotalPages(1)
      setTotal(0)
      setIsListLoading(false)
      return
    }

    try {
      const res = await commissionsService.getAll({
        page,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sourceType: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
        ownerSearch: ownerSearch.trim() || undefined,
        from: isoRange?.from,
        to: isoRange?.to,
      })

      if (res.success && res.data) {
        setCommissions(res.data as AdminCommissionItem[])
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
        return
      }

      setListErrorMessage(res.error?.message || res.message || 'خطا در دریافت فهرست پورسانت‌ها')
      setCommissions([])
      setTotalPages(1)
      setTotal(0)
    } catch {
      setListErrorMessage('خطا در دریافت فهرست پورسانت‌ها')
      setCommissions([])
      setTotalPages(1)
      setTotal(0)
    } finally {
      setIsListLoading(false)
    }
  }, [isoRange, ownerSearch, page, sourceTypeFilter, statusFilter])

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    setSummaryErrorMessage(null)

    if (!isoRange) {
      setSummaryErrorMessage('بازه تاریخ نامعتبر است')
      setSummary(null)
      setIsSummaryLoading(false)
      return
    }

    try {
      const res = await commissionsService.getAdminSummary({
        status: statusFilter === 'all' ? undefined : statusFilter,
        sourceType: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
        ownerSearch: ownerSearch.trim() || undefined,
        from: isoRange?.from,
        to: isoRange?.to,
      })

      if (res.success && res.data) {
        setSummary(res.data)
        return
      }

      setSummaryErrorMessage(res.error?.message || res.message || 'خطا در دریافت خلاصه پورسانت‌ها')
      setSummary(null)
    } catch {
      setSummaryErrorMessage('خطا در دریافت خلاصه پورسانت‌ها')
      setSummary(null)
    } finally {
      setIsSummaryLoading(false)
    }
  }, [isoRange, ownerSearch, sourceTypeFilter, statusFilter])

  useEffect(() => {
    void loadCommissions()
  }, [loadCommissions])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const handleSearchSubmit = () => {
    setPage(1)
    setOwnerSearch(searchInput.trim())
  }

  const handleApprove = async (commission: AdminCommissionItem) => {
    setProcessingId(commission.id)
    setProcessingAction('approve')

    try {
      await commissionsService.approve(commission.id)
      toast({ title: 'موفق', description: 'پورسانت با موفقیت تأیید شد' })
      await Promise.all([loadCommissions(), loadSummary()])
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تأیید پورسانت',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  const openCancelDialog = (commission: AdminCommissionItem) => {
    setCancelTarget(commission)
    setCancelReason('')
  }

  const openPayDialog = (commission: AdminCommissionItem) => {
    setPayTarget(commission)
    setPayDescription('')
  }

  const handleCancel = async () => {
    if (!cancelTarget) return

    setProcessingId(cancelTarget.id)
    setProcessingAction('cancel')

    try {
      const reason = cancelReason.trim() || undefined
      await commissionsService.cancel(cancelTarget.id, reason)
      toast({ title: 'موفق', description: 'پورسانت با موفقیت لغو شد' })
      setCancelTarget(null)
      await Promise.all([loadCommissions(), loadSummary()])
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در لغو پورسانت',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  const handlePay = async () => {
    if (!payTarget) return

    const description = payDescription.trim()
    const payload = description ? { description } : undefined

    setProcessingId(payTarget.id)
    setProcessingAction('pay')

    try {
      await commissionsService.pay(payTarget.id, payload)
      toast({ title: 'موفق', description: 'پرداخت پورسانت ثبت شد' })
      setPayTarget(null)
      await Promise.all([loadCommissions(), loadSummary()])
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در ثبت پرداخت پورسانت',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  const summaryTotals = summary?.totals
  const sourceBreakdown = summary?.sourceBreakdown
  const settlementBreakdown = summary?.settlementBreakdown

  const columns = [
    {
      key: 'amount',
      header: 'مبلغ',
      render: (row: AdminCommissionItem) => (
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
          {formatPriceWithUnit(row.amount)}
        </span>
      ),
    },
    {
      key: 'percent',
      header: 'درصد',
      render: (row: AdminCommissionItem) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {toPersianNum(row.percent)}%
        </span>
      ),
    },
    {
      key: 'source',
      header: 'نوع',
      render: (row: AdminCommissionItem) => (
        <Badge variant="outline" className="w-fit whitespace-nowrap">
          {row.sourceLabel || COMMISSION_SOURCE_TYPE_LABELS[row.sourceType || 'USER_REFERRAL']}
        </Badge>
      ),
    },
    {
      key: 'counterparty',
      header: 'همکار فروش / معرف کاربر',
      render: (row: AdminCommissionItem) => {
        const person = row.agent
        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {getSafePersonName(person)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {row.sourceType === 'SALES_PARTNER' ? 'همکار فروش' : 'رفرال کاربر'}
              {' '}
              {person?.mobile ? `• ${person.mobile}` : ''}
            </span>
          </div>
        )
      },
    },
    {
      key: 'customer',
      header: 'مشتری',
      render: (row: AdminCommissionItem) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {getCommissionCustomerName(row)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {getCommissionCustomerMobile(row)}
          </span>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'طرح',
      render: (row: AdminCommissionItem) => (
        <span className="block truncate text-sm">
          {row.userPlan?.plan?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row: AdminCommissionItem) => (
        <StatusBadge
          status={row.status}
          label={COMMISSION_STATUS_LABELS[row.status]}
          className="text-xs"
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ ثبت',
      render: (row: AdminCommissionItem) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {getSafeDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'تاریخ پرداخت',
      render: (row: AdminCommissionItem) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.paidAt ? getSafeDate(row.paidAt) : '—'}
        </span>
      ),
    },
  ]

  const renderActions = (row: AdminCommissionItem) => {
    const isProcessing = processingId === row.id
    const isApproveProcessing = isProcessing && processingAction === 'approve'
    const isPayProcessing = isProcessing && processingAction === 'pay'
    const isCancelProcessing = isProcessing && processingAction === 'cancel'

    if (row.status === 'PENDING') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="عملیات پورسانت"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-emerald-700 focus:text-emerald-700"
              disabled={isProcessing}
              onClick={() => void handleApprove(row)}
            >
              {isApproveProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <BadgeCheck className="ml-2 size-4" />
              )}
              تأیید پورسانت
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isProcessing}
              onClick={() => openCancelDialog(row)}
            >
              {isCancelProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <XCircle className="ml-2 size-4" />
              )}
              لغو پورسانت
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    if (row.status === 'APPROVED') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="عملیات پورسانت"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-primary focus:text-primary"
              disabled={isProcessing}
              onClick={() => openPayDialog(row)}
            >
              {isPayProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <Banknote className="ml-2 size-4" />
              )}
              ثبت پرداخت
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isProcessing}
              onClick={() => openCancelDialog(row)}
            >
              {isCancelProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <XCircle className="ml-2 size-4" />
              )}
              لغو پورسانت
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مدیریت پورسانت‌ها"
        description={
          <>
            بررسی پورسانت‌ها، وضعیت تسویه‌ها و تفکیک همکار فروش و رفرال کاربر در بازه{' '}
            <span className="font-semibold text-emerald-600">{rangeLabel}</span>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="کل پورسانت"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.totalCommissionAmount) : '—'}
          icon={Wallet}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="پورسانت در انتظار تأیید"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.pendingCommissionAmount) : '—'}
          icon={Clock3}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="پورسانت تأییدشده"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.approvedCommissionAmount) : '—'}
          icon={BadgeCheck}
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
        />
        <StatCard
          title="قابل برداشت"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.withdrawableCommissionAmount) : '—'}
          icon={Banknote}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="پرداخت‌شده"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.paidCommissionAmount) : '—'}
          icon={Wallet}
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
        />
        <StatCard
          title="تسویه باز"
          value={summaryTotals ? formatPriceWithUnit(summaryTotals.openSettlementAmount) : '—'}
          icon={Banknote}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" />
            <span>تفکیک منبع پورسانت</span>
          </div>
          {isSummaryLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : summaryErrorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {summaryErrorMessage}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(['SALES_PARTNER', 'USER_REFERRAL'] as const).map((sourceType) => {
                const item = sourceBreakdown?.[sourceType] || { amount: 0, count: 0 }
                return (
                  <div key={sourceType} className="rounded-xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {COMMISSION_SOURCE_TYPE_LABELS[sourceType]}
                    </p>
                    <p className="mt-2 text-base font-semibold">
                      {formatPriceWithUnit(item.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {toPersianNum(item.count)} پورسانت
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Banknote className="size-4" />
            <span>وضعیت تسویه</span>
          </div>
          {isSummaryLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : summaryErrorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {summaryErrorMessage}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">تسویه باز</p>
                  <p className="mt-2 text-base font-semibold">
                    {formatPriceWithUnit(settlementBreakdown?.openAmount ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toPersianNum(settlementBreakdown?.openCount ?? 0)} درخواست
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">پرداخت‌شده</p>
                  <p className="mt-2 text-base font-semibold">
                    {formatPriceWithUnit(settlementBreakdown?.paidAmount ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toPersianNum(settlementBreakdown?.paidCount ?? 0)} درخواست
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(settlementBreakdown?.statusBreakdown || []).map((item) => (
                  <div key={item.status} className="rounded-xl border bg-background p-3">
                    <StatusBadge
                      status={item.status}
                      label={SETTLEMENT_STATUS_LABELS[item.status as SettlementStatus]}
                      className="text-xs"
                    />
                    <p className="mt-2 text-sm font-semibold">{formatPriceWithUnit(item.amount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {toPersianNum(item.count)} درخواست
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4" />
          <span>فیلترها</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="commission-search" className="text-xs">
              جستجو در نام یا موبایل
            </Label>
            <div className="flex gap-2">
              <Input
                id="commission-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearchSubmit()
                  }
                }}
                placeholder="همکار فروش، رفرال کاربر یا مشتری"
              />
              <Button type="button" variant="secondary" onClick={handleSearchSubmit}>
                <Search className="ml-1 size-4" />
                جستجو
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">وضعیت پورسانت</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="PENDING">{COMMISSION_STATUS_LABELS.PENDING}</SelectItem>
                <SelectItem value="APPROVED">{COMMISSION_STATUS_LABELS.APPROVED}</SelectItem>
                <SelectItem value="PAID">{COMMISSION_STATUS_LABELS.PAID}</SelectItem>
                <SelectItem value="CANCELLED">{COMMISSION_STATUS_LABELS.CANCELLED}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">نوع پورسانت</Label>
            <Select
              value={sourceTypeFilter}
              onValueChange={(value) => {
                setSourceTypeFilter(value as SourceTypeFilter)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه نوع‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نوع‌ها</SelectItem>
                <SelectItem value="SALES_PARTNER">همکار فروش</SelectItem>
                <SelectItem value="USER_REFERRAL">رفرال کاربر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-muted/10 p-4">
          <JalaliDateRangeFilter
            value={dateRange}
            onChange={(next) => {
              setDateRange(next)
              setPage(1)
            }}
            yearOptions={[defaultJalaliMonth.year, defaultJalaliMonth.year - 1, defaultJalaliMonth.year - 2]}
            fromLabel="از تاریخ"
            toLabel="تا تاریخ"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
          <span>
            {toPersianNum(total)} مورد در این بازه
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchInput('')
              setOwnerSearch('')
              setStatusFilter('all')
              setSourceTypeFilter('all')
              setDateRange(getRecentJalaliRange(30))
              setPage(1)
            }}
          >
            <RefreshCw className="ml-1 size-4" />
            بازنشانی
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">فهرست پورسانت‌ها</h2>
            <p className="text-xs text-muted-foreground">
              {rangeLabel}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {toPersianNum(total)} مورد
          </div>
        </div>

        {listErrorMessage ? (
          <div className="px-4 py-10">
            <EmptyState
              icon={Banknote}
              title="فهرست پورسانت‌ها بارگذاری نشد"
              description={listErrorMessage}
            />
          </div>
        ) : isListLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyState
              icon={Banknote}
              title="پورسانتی یافت نشد"
              description="برای این فیلترها پورسانتی ثبت نشده است."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <Table className="min-w-[1500px] table-fixed w-full">
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[90px]" />
                  <col className="w-[130px]" />
                  <col className="w-[220px]" />
                  <col className="w-[220px]" />
                  <col className="w-[180px]" />
                  <col className="w-[130px]" />
                  <col className="w-[150px]" />
                  <col className="w-[150px]" />
                  <col className="w-[90px]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-b bg-transparent hover:bg-transparent">
                    {columns.map((column) => (
                      <TableHead key={column.key} className="px-4 py-3 text-right">
                        {column.header}
                      </TableHead>
                    ))}
                    <TableHead className="w-[90px] px-4 py-3 text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className="px-4 py-3 text-right">
                          {column.render(row)}
                        </TableCell>
                      ))}
                      <TableCell className="w-[90px] px-4 py-3 text-left">
                        {renderActions(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 xl:hidden">
              {commissions.map((row) => (
                <div key={row.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatPriceWithUnit(row.amount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.userPlan?.plan?.name || '—'}
                      </p>
                    </div>
                    <StatusBadge
                      status={row.status}
                      label={COMMISSION_STATUS_LABELS[row.status]}
                      className="text-xs"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">نوع</p>
                      <p className="mt-1 font-medium">
                        {row.sourceLabel || COMMISSION_SOURCE_TYPE_LABELS[row.sourceType || 'USER_REFERRAL']}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">درصد</p>
                      <p className="mt-1 font-medium">{toPersianNum(row.percent)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">همکار فروش / معرف کاربر</p>
                      <p className="mt-1 font-medium">{getSafePersonName(row.agent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">مشتری</p>
                      <p className="mt-1 font-medium">{getCommissionCustomerName(row)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">تاریخ ثبت</p>
                      <p className="mt-1 font-medium">{getSafeDate(row.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">تاریخ پرداخت</p>
                      <p className="mt-1 font-medium">{row.paidAt ? getSafeDate(row.paidAt) : '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">{renderActions(row)}</div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{toPersianNum(total)} مورد</span>
                <div className="flex items-center gap-2">
                  <span>
                    صفحه {toPersianNum(page)} از {toPersianNum(totalPages)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    قبلی
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    بعدی
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>لغو پورسانت</DialogTitle>
            <DialogDescription>
              در صورت نیاز دلیل لغو را ثبت کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">دلیل لغو</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="اختیاری"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={!!cancelTarget && processingId === cancelTarget.id}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={!cancelTarget || processingId === cancelTarget.id}
            >
              {cancelTarget && processingId === cancelTarget.id && (
                <Loader2 className="ml-1 size-4 animate-spin" />
              )}
              لغو پورسانت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null)
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت پرداخت پورسانت</DialogTitle>
            <DialogDescription>
              این فرم فقط برای ثبت وضعیت پرداخت پورسانت تأییدشده استفاده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pay-description">توضیحات</Label>
            <Textarea
              id="pay-description"
              value={payDescription}
              onChange={(event) => setPayDescription(event.target.value)}
              placeholder="اختیاری"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayTarget(null)}
              disabled={!!payTarget && processingId === payTarget.id}
            >
              انصراف
            </Button>
            <Button
              onClick={() => void handlePay()}
              disabled={!payTarget || processingId === payTarget.id}
            >
              {payTarget && processingId === payTarget.id && (
                <Loader2 className="ml-1 size-4 animate-spin" />
              )}
              ثبت پرداخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
