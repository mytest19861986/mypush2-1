'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Send,
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
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, StatusBadge } from '@/components/shared'
import {
  JalaliDateRangeFilter,
  type JalaliDateRangeValue,
} from '@/components/shared/jalali-date-range-filter'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime, formatJalaliDateRange } from '@/utils/formatters'
import {
  getCurrentJalaliYearMonth,
  gregorianDateToJalaliParts,
  jalaliDatePartsToIsoDate,
} from '@/utils/jalali-date'

type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'

interface CommissionItem {
  // Internal, used for React key only.
  id: string
  // Internal identifiers from the API shape; do not render.
  agentId?: string
  userPlanId?: string
  amount: number
  percent: number
  status: CommissionStatus
  paidAt?: string | null
  createdAt: string
  updatedAt?: string
  userPlan?: {
    status?: string
    startDate?: string
    endDate?: string
    plan?: {
      name?: string | null
      price?: number
    } | null
    user?: {
      mobile?: string | null // internal/customer contact; do not render
      profile?: {
        firstName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
}

interface CommissionResponse {
  commissions: CommissionItem[]
  walletSummary: WalletCommissionSummary
  totals: {
    pending: number
    approved: number
    available: number
    paid: number
    total: number
    pendingSettlement?: number
    paidSettlement?: number
    openSettlement?: number
    deductedSettlement?: number
    minimumSettlementAmount?: number
  }
  summary: {
    totalCount: number
    pendingCount: number
    paidCount: number
  }
}

interface SettlementItem {
  // Internal, used for React key only.
  id: string
  amount: number
  status: SettlementStatus
  // Payment/transfer internals from the API shape; do not render in agent UI.
  trackingCode: string | null
  receiptUrl?: string | null
  requestedAt: string
  settledAt: string | null
  createdAt: string
  updatedAt?: string
}

interface WalletCommissionSummary {
  totalCommissionAmount: number
  pendingCommissionAmount: number
  approvedCommissionAmount: number
  availableBalance: number
  pendingSettlementAmount: number
  paidSettlementAmount: number
  minimumSettlementAmount: number
}

const commissionStatusLabels: Record<CommissionStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  CANCELLED: 'لغو شده',
}

const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
}

const statusClasses: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function formatMoney(amount: number | null | undefined) {
  return `${formatNumber(amount ?? 0)} تومان`
}

function normalizeIntegerInput(value: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'

  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/\D/g, '')
    .slice(0, 12)
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const emptyWalletSummary: WalletCommissionSummary = {
  totalCommissionAmount: 0,
  pendingCommissionAmount: 0,
  approvedCommissionAmount: 0,
  availableBalance: 0,
  pendingSettlementAmount: 0,
  paidSettlementAmount: 0,
  minimumSettlementAmount: 0,
}

const duplicateSettlementMessage =
  'یک درخواست تسویه باز برای شما وجود دارد. پس از تعیین تکلیف آن می‌توانید درخواست جدید ثبت کنید.'

function toSafeAmount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeWalletSummary(summary?: Partial<WalletCommissionSummary> | null) {
  return {
    totalCommissionAmount: toSafeAmount(summary?.totalCommissionAmount),
    pendingCommissionAmount: toSafeAmount(summary?.pendingCommissionAmount),
    approvedCommissionAmount: toSafeAmount(summary?.approvedCommissionAmount),
    availableBalance: toSafeAmount(summary?.availableBalance),
    pendingSettlementAmount: toSafeAmount(summary?.pendingSettlementAmount),
    paidSettlementAmount: toSafeAmount(summary?.paidSettlementAmount),
    minimumSettlementAmount: toSafeAmount(summary?.minimumSettlementAmount),
  }
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

function getDateOrDash(value?: string | null) {
  return value ? formatDateTime(value) : '-'
}

function getCustomerName(commission: CommissionItem) {
  const profile = commission.userPlan?.user?.profile
  const firstName = profile?.firstName?.trim() ?? ''
  const lastName = profile?.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim() || 'مشتری طرح'
}

function getPlanName(commission: CommissionItem) {
  return commission.userPlan?.plan?.name?.trim() || 'طرح ثبت‌شده'
}

function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

export default function AgentCommissionsPage() {
  const { toast } = useToast()
  const currentJalaliMonth = useMemo(() => getCurrentJalaliYearMonth(), [])
  const [commissionRange, setCommissionRange] = useState<JalaliDateRangeValue>(() =>
    getRecentJalaliRange(30)
  )
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [walletSummary, setWalletSummary] = useState<WalletCommissionSummary>(emptyWalletSummary)
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementDescription, setSettlementDescription] = useState('')
  const [isRequestingSettlement, setIsRequestingSettlement] = useState(false)

  const pendingSettlementTotal = walletSummary.pendingSettlementAmount
  const availableBalance = walletSummary.availableBalance
  const minimumSettlementAmount = walletSummary.minimumSettlementAmount
  const minimumSettlementMessage = `حداقل مبلغ قابل درخواست تسویه ${formatMoney(minimumSettlementAmount)} است.`

  const settlementRequestBlockMessage = useMemo(() => {
    if (pendingSettlementTotal > 0) return duplicateSettlementMessage
    if (minimumSettlementAmount > 0 && availableBalance < minimumSettlementAmount) {
      return minimumSettlementMessage
    }
    if (availableBalance <= 0) {
      return 'موجودی قابل برداشت از پورسانت تاییدشده وجود ندارد.'
    }
    return null
  }, [availableBalance, minimumSettlementAmount, minimumSettlementMessage, pendingSettlementTotal])

  const commissionYearOptions = useMemo(() => {
    const selectedYears = [commissionRange.from.year, commissionRange.to.year]
    const yearWindow = Array.from({ length: 12 }, (_, index) => currentJalaliMonth.year + 1 - index)
    return Array.from(new Set([...yearWindow, ...selectedYears])).sort((a, b) => b - a)
  }, [commissionRange, currentJalaliMonth.year])

  const selectedCommissionRangeText = useMemo(() => {
    try {
      const range = toIsoRange(commissionRange)
      return formatJalaliDateRange(range.from, range.to)
    } catch {
      return 'بازه تاریخ پورسانت معتبر نیست.'
    }
  }, [commissionRange])

  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const commissionIsoRange = toIsoRange(commissionRange)
      if (commissionIsoRange.from > commissionIsoRange.to) {
        throw new Error('تاریخ شروع باید قبل از تاریخ پایان باشد.')
      }

      const commissionParams = new URLSearchParams(commissionIsoRange)
      const [commissionsRes, settlementsRes] = await Promise.all([
        apiClient.get<CommissionResponse>(`/commissions/my?${commissionParams.toString()}`),
        apiClient.get<SettlementItem[]>('/settlements/my?take=50'),
      ])

      if (!commissionsRes.success) {
        throw new Error(commissionsRes.error?.message || commissionsRes.message || 'خطا در دریافت پورسانت‌ها')
      }
      if (!settlementsRes.success) {
        throw new Error(settlementsRes.error?.message || settlementsRes.message || 'خطا در دریافت تسویه‌ها')
      }

      const commissionData = commissionsRes.data
      setCommissions(Array.isArray(commissionData?.commissions) ? commissionData.commissions : [])
      setWalletSummary(normalizeWalletSummary(commissionData?.walletSummary))
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : [])
    } catch (error) {
      setCommissions([])
      setWalletSummary(emptyWalletSummary)
      setSettlements([])
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت اطلاعات مالی'))
    } finally {
      setIsLoading(false)
    }
  }, [commissionRange])

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

  const handleSettlementRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (settlementRequestBlockMessage) {
      toast({
        title: 'درخواست تسویه',
        description: settlementRequestBlockMessage,
        variant: 'destructive',
      })
      return
    }

    if (pendingSettlementTotal > 0) {
      toast({
        title: 'درخواست تسویه باز',
        description:
          'یک درخواست تسویه در حال بررسی یا تاییدشده دارید. پس از تعیین تکلیف آن می‌توانید درخواست جدید ثبت کنید.',
        variant: 'destructive',
      })
      return
    }

    const normalizedSettlementAmount = normalizeIntegerInput(settlementAmount)
    const amount = Number(normalizedSettlementAmount)
    if (normalizedSettlementAmount === '' || !Number.isInteger(amount) || amount <= 0) {
      toast({
        title: 'خطا',
        description: 'مبلغ تسویه باید عددی بزرگ‌تر از صفر باشد.',
        variant: 'destructive',
      })
      return
    }

    if (amount < minimumSettlementAmount) {
      toast({
        title: 'خطا',
        description: minimumSettlementMessage,
        variant: 'destructive',
      })
      return
    }

    if (amount > availableBalance) {
      toast({
        title: 'خطا',
        description: 'مبلغ تسویه نمی‌تواند بیشتر از موجودی قابل برداشت باشد.',
        variant: 'destructive',
      })
      return
    }

    const description = settlementDescription.trim()
    setIsRequestingSettlement(true)
    try {
      const createdSettlement = await apiClient.post<SettlementItem>('/settlements', {
        amount,
        description: description || undefined,
      })
      setSettlements((currentSettlements) => [createdSettlement, ...currentSettlements])
      setSettlementAmount('')
      setSettlementDescription('')
      setRequestOpen(false)
      await fetchFinancialData()
      toast({
        title: 'موفق',
        description: 'درخواست تسویه با موفقیت ثبت شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت درخواست تسویه'),
        variant: 'destructive',
      })
    } finally {
      setIsRequestingSettlement(false)
    }
  }

  const renderCommissionStatus = (status: CommissionStatus) => (
    <StatusBadge
      status={status}
      label={commissionStatusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )

  const renderSettlementStatus = (status: SettlementStatus) => (
    <StatusBadge
      status={status}
      label={settlementStatusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )

  const walletCards = [
    {
      title: 'موجودی قابل برداشت',
      value: formatMoney(walletSummary.availableBalance),
      icon: Wallet,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'کل پورسانت ثبت‌شده',
      value: formatMoney(walletSummary.totalCommissionAmount),
      icon: Banknote,
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'در انتظار تایید',
      value: formatMoney(walletSummary.pendingCommissionAmount),
      icon: Clock,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'تایید شده',
      value: formatMoney(walletSummary.approvedCommissionAmount),
      icon: CheckCircle2,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'درخواست تسویه در انتظار پرداخت',
      value: formatMoney(walletSummary.pendingSettlementAmount),
      icon: Clock,
      tone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    },
    {
      title: 'تسویه پرداخت‌شده',
      value: formatMoney(walletSummary.paidSettlementAmount),
      icon: CheckCircle2,
      tone: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="پورسانت‌ها و کیف پول"
        description="موجودی کیف پول، پورسانت‌ها و درخواست‌های تسویه خود را مشاهده کنید."
        action={
          <Dialog
            open={requestOpen}
            onOpenChange={(open) => {
              if (open && settlementRequestBlockMessage) {
                toast({
                  title: 'درخواست تسویه',
                  description: settlementRequestBlockMessage,
                  variant: 'destructive',
                })
                return
              }

              if (open && pendingSettlementTotal > 0) {
                toast({
                  title: 'درخواست تسویه باز',
                  description:
                    'یک درخواست تسویه در حال بررسی یا تاییدشده دارید. پس از تعیین تکلیف آن می‌توانید درخواست جدید ثبت کنید.',
                })
                return
              }

              setRequestOpen(open)
              if (open && !settlementAmount && availableBalance > 0) {
                setSettlementAmount(String(availableBalance))
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={isLoading}>
                <Send className="ml-2 size-4" />
                درخواست تسویه
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <form onSubmit={(event) => void handleSettlementRequest(event)}>
                <DialogHeader>
                  <DialogTitle>درخواست تسویه</DialogTitle>
                  <DialogDescription>
                    مبلغ موردنظر را وارد کنید. بررسی و پرداخت نهایی توسط مدیر انجام می‌شود.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    موجودی قابل برداشت:{' '}
                    <span className="font-semibold">{formatMoney(availableBalance)}</span>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    حداقل مبلغ قابل درخواست تسویه:{' '}
                    <span className="font-semibold">{formatMoney(minimumSettlementAmount)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settlement-amount">مبلغ</Label>
                    <Input
                      id="settlement-amount"
                      value={settlementAmount}
                      onChange={(event) =>
                        setSettlementAmount(normalizeIntegerInput(event.target.value))
                      }
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settlement-description">توضیحات</Label>
                    <Textarea
                      id="settlement-description"
                      value={settlementDescription}
                      onChange={(event) => setSettlementDescription(event.target.value)}
                      placeholder="اختیاری"
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRequestingSettlement}
                    onClick={() => setRequestOpen(false)}
                  >
                    انصراف
                  </Button>
                  <Button type="submit" disabled={isRequestingSettlement}>
                    {isRequestingSettlement && <Loader2 className="ml-1 size-4 animate-spin" />}
                    ثبت درخواست
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingDashboard />
      ) : errorMessage ? (
        <Card className="border-0 shadow-sm">
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
          <Card className="border-0 shadow-sm" dir="rtl">
            <CardHeader className="gap-3 pb-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">گزارش پورسانت</CardTitle>
                <p className="text-xs text-muted-foreground">
                  بازه انتخابی: <span className="text-foreground">{selectedCommissionRangeText}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  پورسانت در انتظار تایید قابل تسویه محسوب نمی‌شود؛ قابل تسویه فعلی از پورسانت تاییدشده منهای درخواست‌های تسویه باز یا پرداخت‌شده محاسبه می‌شود.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchFinancialData()}
                disabled={isLoading}
              >
                <RefreshCw className="ml-2 size-4" />
                اعمال فیلتر
              </Button>
            </CardHeader>
            <CardContent>
              <JalaliDateRangeFilter
                value={commissionRange}
                onChange={setCommissionRange}
                yearOptions={commissionYearOptions}
              />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {walletCards.map((card) => (
              <Card key={card.title} className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
                <CardContent className="min-h-28 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary/70">
                      <card.icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 truncate text-3xl font-bold text-foreground">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {pendingSettlementTotal > 0 && (
            <Card className="border-0 bg-amber-50 shadow-sm dark:bg-amber-950/20">
              <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="text-amber-800 dark:text-amber-300">
                  درخواست‌های تسویه در جریان
                </span>
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  {formatMoney(pendingSettlementTotal)}
                </span>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">پورسانت‌ها</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {commissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                    <Banknote className="size-10 text-muted-foreground" />
                    <p className="text-sm font-medium">هنوز پورسانتی برای شما ثبت نشده است.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <Table className="min-w-[1010px] table-fixed w-full">
                        <colgroup>
                          <col className="w-[160px]" />
                          <col className="w-[160px]" />
                          <col className="w-[150px]" />
                          <col className="w-[90px]" />
                          <col className="w-[140px]" />
                          <col className="w-[155px]" />
                          <col className="w-[155px]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                            <TableHead className="px-4 py-3 text-right">مشتری</TableHead>
                            <TableHead className="px-4 py-3 text-right">طرح</TableHead>
                            <TableHead className="px-4 py-3 text-right">مبلغ</TableHead>
                            <TableHead className="px-4 py-3 text-right">درصد</TableHead>
                            <TableHead className="px-4 py-3 text-right">وضعیت</TableHead>
                            <TableHead className="px-4 py-3 text-right">تاریخ ثبت</TableHead>
                            <TableHead className="px-4 py-3 text-right">تاریخ پرداخت</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id}>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="block truncate text-sm font-medium">
                                  {getCustomerName(commission)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="block truncate text-sm">{getPlanName(commission)}</span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                                  {formatMoney(commission.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm tabular-nums">
                                  {formatNumber(commission.percent)}٪
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">{renderCommissionStatus(commission.status)}</TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {formatDateTime(commission.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(commission.paidAt)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-3 p-4 md:hidden">
                      {commissions.map((commission) => (
                        <div key={commission.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{getCustomerName(commission)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{getPlanName(commission)}</p>
                            </div>
                            {renderCommissionStatus(commission.status)}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">مبلغ</p>
                              <p className="mt-1 font-semibold">{formatMoney(commission.amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">پرداخت</p>
                              <p className="mt-1">{getDateOrDash(commission.paidAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">درخواست‌های تسویه</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {settlements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                    <Wallet className="size-10 text-muted-foreground" />
                    <p className="text-sm font-medium">هنوز درخواست تسویه‌ای ثبت نکرده‌اید.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>مبلغ</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>تاریخ درخواست</TableHead>
                            <TableHead>تاریخ پرداخت</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.id}>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-semibold">
                                  {formatMoney(settlement.amount)}
                                </span>
                              </TableCell>
                              <TableCell>{renderSettlementStatus(settlement.status)}</TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(settlement.requestedAt || settlement.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(settlement.settledAt)}
                                </span>
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
                              <p className="text-sm font-semibold">{formatMoney(settlement.amount)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {getDateOrDash(settlement.requestedAt || settlement.createdAt)}
                              </p>
                            </div>
                            {renderSettlementStatus(settlement.status)}
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">پرداخت</p>
                              <p className="mt-1">{getDateOrDash(settlement.settledAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
