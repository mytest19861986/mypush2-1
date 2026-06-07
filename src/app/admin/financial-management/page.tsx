'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Banknote,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, StatusBadge } from '@/components/shared'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime, formatPriceWithUnit } from '@/utils/formatters'

type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | string
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'
type SettlementFilter = 'all' | Exclude<SettlementStatus, 'CANCELLED'>
type SettlementAction = 'approve' | 'reject' | 'paid'

interface PersonProfile {
  firstName?: string | null
  lastName?: string | null
}

interface SafePerson {
  profile?: PersonProfile | null
  agent?: {
    businessName?: string | null
  } | null
}

interface WalletItem {
  // Internal identifiers from the API shape; do not render.
  id: string
  userId: string
  balance: number
  pendingBalance: number
  currency: string
  status: WalletStatus
  createdAt: string
  updatedAt: string
  user?: SafePerson | null
  agent?: {
    businessName?: string | null
  } | null
}

interface SettlementItem {
  // Internal identifiers from the API shape; do not render.
  id: string
  walletId: string
  userId: string
  amount: number
  status: SettlementStatus
  trackingCode: string | null
  receiptUrl?: string | null
  requestedAt: string
  approvedAt?: string | null
  paidAt?: string | null
  rejectedAt?: string | null
  settledAt: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
  user?: SafePerson | null
  agent?: {
    businessName?: string | null
  } | null
}

interface FinancialChannelBreakdown {
  key: string
  label: string
  amount: number
  count: number
}

interface FinancialTimeBucket {
  date: string
  amount: number
  count: number
}

interface FinancialReport {
  range: {
    from: string
    to: string
  }
  totalSuccessfulPayments: number | null
  paidUsersCount: number | null
  grossRevenue: number | null
  directRevenue: number | null
  salesPartnerRevenue: number | null
  referralRevenue: number | null
  totalCommissions: number | null
  netRevenue: number | null
  channelBreakdown: FinancialChannelBreakdown[]
  dailyRevenue: FinancialTimeBucket[]
  unsupportedMetrics?: string[]
}

const settlementFilters: { value: SettlementFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'PAID', label: 'پرداخت شده' },
  { value: 'REJECTED', label: 'رد شده' },
]

const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
}

const walletStatusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  SUSPENDED: 'تعلیق شده',
  CLOSED: 'بسته شده',
}

const statusClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAID: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  SUSPENDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return fallback
}

function getPersonName(item: { user?: SafePerson | null; agent?: { businessName?: string | null } | null }) {
  const firstName = item.user?.profile?.firstName?.trim() ?? ''
  const lastName = item.user?.profile?.lastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  return item.agent?.businessName?.trim() || item.user?.agent?.businessName?.trim() || fullName || 'نامشخص'
}

function getDateOrDash(value?: string | null) {
  return value ? formatDateTime(value) : '-'
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDefaultReportRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  }
}

function formatNullableCount(value: number | null) {
  return value === null ? 'داده کافی موجود نیست' : value.toLocaleString('fa-IR')
}

function formatNullableMoney(value: number | null) {
  return value === null ? 'داده کافی موجود نیست' : formatPriceWithUnit(value)
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  })
}

function renderSettlementStatus(status: SettlementStatus) {
  return (
    <StatusBadge
      status={status}
      label={settlementStatusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )
}

function renderWalletStatus(status: string) {
  return (
    <StatusBadge
      status={status}
      label={walletStatusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

export default function FinancialManagementPage() {
  const { toast } = useToast()
  const defaultReportRange = useMemo(() => getDefaultReportRange(), [])
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null)
  const [reportFrom, setReportFrom] = useState(defaultReportRange.from)
  const [reportTo, setReportTo] = useState(defaultReportRange.to)
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isReportLoading, setIsReportLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState<{ id: string; action: SettlementAction } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<SettlementItem | null>(null)
  const [paidTarget, setPaidTarget] = useState<SettlementItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [trackingCode, setTrackingCode] = useState('')

  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const settlementPath =
        settlementFilter === 'all'
          ? '/settlements?take=100'
          : `/settlements?take=100&status=${settlementFilter}`

      const [walletsRes, settlementsRes] = await Promise.all([
        apiClient.get<WalletItem[]>('/wallets?take=100'),
        apiClient.get<SettlementItem[]>(settlementPath),
      ])

      if (!walletsRes.success) {
        throw new Error(walletsRes.error?.message || walletsRes.message || 'خطا در دریافت کیف پول‌ها')
      }
      if (!settlementsRes.success) {
        throw new Error(settlementsRes.error?.message || settlementsRes.message || 'خطا در دریافت درخواست‌های تسویه')
      }

      setWallets(Array.isArray(walletsRes.data) ? walletsRes.data : [])
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : [])
    } catch (error) {
      setWallets([])
      setSettlements([])
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت اطلاعات مالی'))
    } finally {
      setIsLoading(false)
    }
  }, [settlementFilter])

  const fetchFinancialReport = useCallback(async () => {
    if (!reportFrom || !reportTo) return

    setIsReportLoading(true)
    setReportErrorMessage(null)

    try {
      const params = new URLSearchParams({ from: reportFrom, to: reportTo })
      const reportRes = await apiClient.get<FinancialReport>(
        `/admin/financial-reports?${params.toString()}`
      )

      if (!reportRes.success || !reportRes.data) {
        throw new Error(reportRes.error?.message || reportRes.message || 'خطا در دریافت گزارش مالی')
      }

      setFinancialReport(reportRes.data)
    } catch (error) {
      setFinancialReport(null)
      setReportErrorMessage(getErrorMessage(error, 'خطا در دریافت گزارش مالی'))
    } finally {
      setIsReportLoading(false)
    }
  }, [reportFrom, reportTo])

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

  useEffect(() => {
    void fetchFinancialReport()
  }, [fetchFinancialReport])

  const totals = useMemo(
    () => ({
      walletBalance: wallets.reduce((total, wallet) => total + wallet.balance, 0),
      walletPending: wallets.reduce((total, wallet) => total + wallet.pendingBalance, 0),
      pendingSettlements: settlements
        .filter((settlement) => settlement.status === 'PENDING')
        .reduce((total, settlement) => total + settlement.amount, 0),
    }),
    [settlements, wallets]
  )

  const reportKpis = useMemo(
    () => [
      {
        title: 'کاربران پرداخت‌کرده',
        value: formatNullableCount(financialReport?.paidUsersCount ?? null),
        icon: Users,
        tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      },
      {
        title: 'تعداد پرداخت موفق',
        value: formatNullableCount(financialReport?.totalSuccessfulPayments ?? null),
        icon: Check,
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      {
        title: 'درآمد ناخالص',
        value: formatNullableMoney(financialReport?.grossRevenue ?? null),
        icon: Banknote,
        tone: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      },
      {
        title: 'پورسانت‌ها',
        value: formatNullableMoney(financialReport?.totalCommissions ?? null),
        icon: Wallet,
        tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      },
      {
        title: 'درآمد خالص',
        value: formatNullableMoney(financialReport?.netRevenue ?? null),
        icon: TrendingUp,
        tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
    ],
    [financialReport]
  )

  const maxChannelAmount = useMemo(
    () =>
      Math.max(
        1,
        ...(financialReport?.channelBreakdown.map((channel) => channel.amount) ?? [])
      ),
    [financialReport]
  )

  const maxDailyAmount = useMemo(
    () => Math.max(1, ...(financialReport?.dailyRevenue.map((item) => item.amount) ?? [])),
    [financialReport]
  )

  const updateSettlement = (updatedSettlement: SettlementItem) => {
    setSettlements((current) => {
      const next = current.map((settlement) =>
        settlement.id === updatedSettlement.id ? updatedSettlement : settlement
      )
      if (settlementFilter !== 'all' && updatedSettlement.status !== settlementFilter) {
        return next.filter((settlement) => settlement.id !== updatedSettlement.id)
      }
      return next
    })
  }

  const handleApprove = async (settlement: SettlementItem) => {
    if (processing || settlement.status !== 'PENDING') return

    setProcessing({ id: settlement.id, action: 'approve' })
    try {
      const updatedSettlement = await apiClient.patch<SettlementItem>(
        `/settlements/${settlement.id}/approve`
      )
      updateSettlement(updatedSettlement)
      toast({ title: 'موفق', description: 'درخواست تسویه تأیید شد.' })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در تأیید درخواست تسویه'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return

    const reason = rejectReason.trim()
    const body = reason ? { reason } : undefined

    setProcessing({ id: rejectTarget.id, action: 'reject' })
    try {
      const updatedSettlement = await apiClient.patch<SettlementItem>(
        `/settlements/${rejectTarget.id}/reject`,
        body
      )
      updateSettlement(updatedSettlement)
      setRejectTarget(null)
      setRejectReason('')
      toast({ title: 'موفق', description: 'درخواست تسویه رد شد.' })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در رد درخواست تسویه'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleMarkPaid = async () => {
    if (!paidTarget) return

    const trimmedTrackingCode = trackingCode.trim()
    const body = trimmedTrackingCode ? { trackingCode: trimmedTrackingCode } : undefined

    setProcessing({ id: paidTarget.id, action: 'paid' })
    try {
      const updatedSettlement = await apiClient.patch<SettlementItem>(
        `/settlements/${paidTarget.id}/paid`,
        body
      )
      updateSettlement(updatedSettlement)
      setPaidTarget(null)
      setTrackingCode('')
      toast({ title: 'موفق', description: 'پرداخت تسویه ثبت شد.' })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت پرداخت تسویه'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const openRejectDialog = (settlement: SettlementItem) => {
    setRejectTarget(settlement)
    setRejectReason('')
  }

  const openPaidDialog = (settlement: SettlementItem) => {
    setPaidTarget(settlement)
    setTrackingCode(settlement.trackingCode ?? '')
  }

  const renderSettlementActions = (settlement: SettlementItem) => {
    const isProcessing = processing?.id === settlement.id
    const isApproveProcessing = isProcessing && processing.action === 'approve'
    const isRejectProcessing = isProcessing && processing.action === 'reject'
    const isPaidProcessing = isProcessing && processing.action === 'paid'

    if (settlement.status === 'PENDING') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="عملیات تسویه"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-emerald-700 focus:text-emerald-700"
              disabled={isProcessing}
              onClick={() => void handleApprove(settlement)}
            >
              {isApproveProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <Check className="ml-2 size-4" />
              )}
              تایید تسویه
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isProcessing}
              onClick={() => openRejectDialog(settlement)}
            >
              {isRejectProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <XCircle className="ml-2 size-4" />
              )}
              رد تسویه
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    if (settlement.status === 'APPROVED') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="عملیات تسویه"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={isProcessing} onClick={() => openPaidDialog(settlement)}>
              {isPaidProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <Banknote className="ml-2 size-4" />
              )}
              ثبت پرداخت
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return <span className="text-sm text-muted-foreground">—</span>
  }

  const summaryCards = [
    {
      title: 'موجودی کل کیف پول‌ها',
      value: formatPriceWithUnit(totals.walletBalance),
      icon: Wallet,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'موجودی در انتظار',
      value: formatPriceWithUnit(totals.walletPending),
      icon: Clock,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'تسویه در انتظار بررسی',
      value: formatPriceWithUnit(totals.pendingSettlements),
      icon: Banknote,
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت مالی"
        description="مدیریت کیف پول‌ها، درخواست‌های تسویه و وضعیت‌های مالی سامانه"
      />

      <Card className="rounded-2xl border border-border/50 bg-card shadow-sm" dir="rtl">
        <CardHeader className="gap-4 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-emerald-600" />
              گزارش مالی
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              بر اساس پرداخت‌های موفق، فروش‌های تاییدشده و پورسانت‌های ثبت‌شده
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="financial-report-from" className="text-xs">
                از تاریخ
              </Label>
              <Input
                id="financial-report-from"
                type="date"
                value={reportFrom}
                onChange={(event) => setReportFrom(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="financial-report-to" className="text-xs">
                تا تاریخ
              </Label>
              <Input
                id="financial-report-to"
                type="date"
                value={reportTo}
                onChange={(event) => setReportTo(event.target.value)}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void fetchFinancialReport()}
              disabled={isReportLoading}
              aria-label="به‌روزرسانی گزارش مالی"
            >
              {isReportLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {reportErrorMessage ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
              <XCircle className="size-8 text-destructive" />
              <p className="text-sm font-medium">دریافت گزارش مالی ناموفق بود.</p>
              <p className="text-xs text-muted-foreground">{reportErrorMessage}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {reportKpis.map((card) => (
                  <div key={card.title} className="rounded-lg border bg-background/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex size-9 items-center justify-center rounded-lg', card.tone)}>
                        <card.icon className="size-4" />
                      </span>
                      <span className="text-xs text-muted-foreground">{card.title}</span>
                    </div>
                    {isReportLoading ? (
                      <Skeleton className="mt-3 h-5 w-28" />
                    ) : (
                      <p className="mt-3 text-sm font-bold leading-6">{card.value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">تفکیک کانال فروش</h3>
                    <span className="text-xs text-muted-foreground">
                      {financialReport?.channelBreakdown.length ?? 0} کانال
                    </span>
                  </div>
                  {isReportLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : financialReport?.channelBreakdown.length ? (
                    <div className="space-y-4">
                      {financialReport.channelBreakdown.map((channel) => {
                        const width = Math.max(4, Math.round((channel.amount / maxChannelAmount) * 100))
                        return (
                          <div key={channel.key} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-medium">{channel.label}</span>
                              <span className="text-muted-foreground">
                                {formatPriceWithUnit(channel.amount)} / {channel.count.toLocaleString('fa-IR')} پرداخت
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-28 items-center justify-center text-sm text-muted-foreground">
                      داده‌ای برای نمایش وجود ندارد.
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">روند درآمد</h3>
                    <CalendarDays className="size-4 text-muted-foreground" />
                  </div>
                  {isReportLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : financialReport?.dailyRevenue.length ? (
                    <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1">
                      {financialReport.dailyRevenue.map((item) => {
                        const height = Math.max(8, Math.round((item.amount / maxDailyAmount) * 100))
                        return (
                          <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                            <div className="flex h-32 w-full items-end rounded bg-muted/70 px-1">
                              <div
                                className="w-full rounded-t bg-sky-600"
                                style={{ height: `${height}%` }}
                                title={`${formatPriceWithUnit(item.amount)} - ${item.count.toLocaleString('fa-IR')} پرداخت`}
                              />
                            </div>
                            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                              {formatShortDate(item.date)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                      داده‌ای برای نمایش وجود ندارد.
                    </div>
                  )}
                </div>
              </div>

              {!!financialReport?.unsupportedMetrics?.length && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  داده کافی برای انتساب کامل برخی پرداخت‌های آنلاین موجود نیست؛ این موارد در کانال «آنلاین بدون انتساب کافی» آمده‌اند.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">دریافت اطلاعات مالی ناموفق بود.</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => void fetchFinancialData()}>
              <RefreshCw className="ml-2 size-4" />
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.title} className="rounded-2xl border border-border/50 bg-card shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn('flex size-11 items-center justify-center rounded-lg', card.tone)}>
                    <card.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="mt-1 text-base font-bold">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="settlements" className="gap-4" dir="rtl">
            <TabsList className="w-full justify-start sm:w-fit">
              <TabsTrigger value="settlements">درخواست‌های تسویه</TabsTrigger>
              <TabsTrigger value="wallets">کیف پول‌ها</TabsTrigger>
            </TabsList>

            <TabsContent value="wallets" className="mt-0">
              <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">کیف پول‌ها</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {wallets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                    <Wallet className="size-10 text-muted-foreground" />
                    <p className="text-sm font-medium">کیف پولی یافت نشد.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <Table className="min-w-[860px] table-fixed w-full">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[18%]" />
                          <col className="w-[16%]" />
                          <col className="w-[10%]" />
                          <col className="w-[16%]" />
                          <col className="w-[14%]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="border-b bg-transparent hover:bg-transparent">
                            <TableHead className="px-4 py-3 text-right">مالک</TableHead>
                            <TableHead className="px-4 py-3 text-right">موجودی</TableHead>
                            <TableHead className="px-4 py-3 text-right">در انتظار</TableHead>
                            <TableHead className="px-4 py-3 text-right">واحد</TableHead>
                            <TableHead className="px-4 py-3 text-right">وضعیت</TableHead>
                            <TableHead className="px-4 py-3 text-right">آخرین به‌روزرسانی</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wallets.map((wallet) => (
                            <TableRow key={wallet.id}>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="block truncate text-sm font-medium">
                                  {getPersonName(wallet)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                                  {formatPriceWithUnit(wallet.balance)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm tabular-nums">
                                  {formatPriceWithUnit(wallet.pendingBalance)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm">{wallet.currency}</span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">{renderWalletStatus(wallet.status)}</TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(wallet.updatedAt || wallet.createdAt)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-3 p-4 md:hidden">
                      {wallets.map((wallet) => (
                        <div key={wallet.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{getPersonName(wallet)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {getDateOrDash(wallet.updatedAt || wallet.createdAt)}
                              </p>
                            </div>
                            {renderWalletStatus(wallet.status)}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">موجودی</p>
                              <p className="mt-1 font-semibold">{formatPriceWithUnit(wallet.balance)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">در انتظار</p>
                              <p className="mt-1">{formatPriceWithUnit(wallet.pendingBalance)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settlements" className="mt-0">
              <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">درخواست‌های تسویه</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted-foreground">{settlements.length} درخواست</span>
                  <div className="flex flex-wrap gap-2">
                    {settlementFilters.map((filter) => (
                      <Button
                        key={filter.value}
                        size="sm"
                        variant={settlementFilter === filter.value ? 'default' : 'outline'}
                        onClick={() => setSettlementFilter(filter.value)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {settlements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                    <Banknote className="size-10 text-muted-foreground" />
                    <p className="text-sm font-medium">درخواست تسویه‌ای یافت نشد.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <Table className="min-w-[900px] table-fixed w-full">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[18%]" />
                          <col className="w-[16%]" />
                          <col className="w-[18%]" />
                          <col className="w-[14%]" />
                          <col className="w-[8%]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="border-b bg-transparent hover:bg-transparent">
                            <TableHead className="px-4 py-3 text-right">درخواست‌دهنده</TableHead>
                            <TableHead className="px-4 py-3 text-right">مبلغ</TableHead>
                            <TableHead className="px-4 py-3 text-right">وضعیت</TableHead>
                            <TableHead className="px-4 py-3 text-right">تاریخ درخواست</TableHead>
                            <TableHead className="px-4 py-3 text-right">کد پیگیری</TableHead>
                            <TableHead className="w-[80px] px-4 py-3 text-left">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.id}>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="block truncate text-sm font-medium">
                                  {getPersonName(settlement)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                                  {formatPriceWithUnit(settlement.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">{renderSettlementStatus(settlement.status)}</TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(settlement.requestedAt || settlement.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span dir="ltr" className="inline-block max-w-full truncate text-sm text-muted-foreground">
                                  {settlement.trackingCode || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="w-[80px] px-4 py-3 text-left">
                                {renderSettlementActions(settlement)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-3 p-4 md:hidden">
                      {settlements.map((settlement) => (
                        <div key={settlement.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{getPersonName(settlement)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {getDateOrDash(settlement.requestedAt || settlement.createdAt)}
                              </p>
                            </div>
                            {renderSettlementStatus(settlement.status)}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">مبلغ</p>
                              <p className="mt-1 font-semibold">{formatPriceWithUnit(settlement.amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">پرداخت</p>
                              <p className="mt-1">{getDateOrDash(settlement.paidAt || settlement.settledAt)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">کد پیگیری</p>
                              <p className="mt-1">{settlement.trackingCode || '-'}</p>
                            </div>
                            {settlement.rejectionReason && (
                              <div>
                                <p className="text-muted-foreground">دلیل رد</p>
                                <p className="mt-1">{settlement.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex justify-end">
                            {renderSettlementActions(settlement)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open && !processing) setRejectTarget(null)
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد درخواست تسویه</DialogTitle>
            <DialogDescription>
              در صورت نیاز دلیل رد درخواست را ثبت کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">دلیل رد</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="اختیاری"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!!rejectTarget && processing?.id === rejectTarget.id}
              onClick={() => setRejectTarget(null)}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectTarget || processing?.id === rejectTarget.id}
              onClick={() => void handleReject()}
            >
              {rejectTarget && processing?.id === rejectTarget.id && (
                <Loader2 className="ml-1 size-4 animate-spin" />
              )}
              رد درخواست
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!paidTarget}
        onOpenChange={(open) => {
          if (!open && !processing) setPaidTarget(null)
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت پرداخت تسویه</DialogTitle>
            <DialogDescription>
              کد پیگیری پرداخت اختیاری است و در صورت ثبت برای پیگیری نمایش داده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tracking-code">کد پیگیری</Label>
            <Input
              id="tracking-code"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              placeholder="اختیاری"
              maxLength={100}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!!paidTarget && processing?.id === paidTarget.id}
              onClick={() => setPaidTarget(null)}
            >
              انصراف
            </Button>
            <Button
              disabled={!paidTarget || processing?.id === paidTarget.id}
              onClick={() => void handleMarkPaid()}
            >
              {paidTarget && processing?.id === paidTarget.id && (
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
