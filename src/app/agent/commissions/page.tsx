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
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/utils/formatters'

type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'

interface WalletInfo {
  // Internal identifiers from the API shape; do not render.
  id: string
  userId: string
  balance: number
  pendingBalance: number
  currency: string
  status: string
  createdAt: string
  updatedAt: string
}

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
  totals: {
    pending: number
    paid: number
    total: number
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
  // Internal identifiers from the API shape; do not render.
  walletId?: string
  userId?: string
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
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [commissionTotals, setCommissionTotals] = useState<CommissionResponse['totals']>({
    pending: 0,
    paid: 0,
    total: 0,
  })
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementDescription, setSettlementDescription] = useState('')
  const [isRequestingSettlement, setIsRequestingSettlement] = useState(false)

  const paidSettlementTotal = useMemo(
    () =>
      settlements
        .filter((settlement) => settlement.status === 'PAID')
        .reduce((total, settlement) => total + settlement.amount, 0),
    [settlements]
  )

  const pendingSettlementTotal = useMemo(
    () =>
      settlements
        .filter((settlement) => settlement.status === 'PENDING' || settlement.status === 'APPROVED')
        .reduce((total, settlement) => total + settlement.amount, 0),
    [settlements]
  )

  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [walletRes, commissionsRes, settlementsRes] = await Promise.all([
        apiClient.get<WalletInfo>('/wallets/my?take=20'),
        apiClient.get<CommissionResponse>('/commissions/my'),
        apiClient.get<SettlementItem[]>('/settlements/my?take=50'),
      ])

      if (!walletRes.success) {
        throw new Error(walletRes.error?.message || walletRes.message || 'خطا در دریافت کیف پول')
      }
      if (!commissionsRes.success) {
        throw new Error(commissionsRes.error?.message || commissionsRes.message || 'خطا در دریافت پورسانت‌ها')
      }
      if (!settlementsRes.success) {
        throw new Error(settlementsRes.error?.message || settlementsRes.message || 'خطا در دریافت تسویه‌ها')
      }

      setWallet(walletRes.data ?? null)
      setCommissions(commissionsRes.data?.commissions ?? [])
      setCommissionTotals(commissionsRes.data?.totals ?? { pending: 0, paid: 0, total: 0 })
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : [])
    } catch (error) {
      setWallet(null)
      setCommissions([])
      setCommissionTotals({ pending: 0, paid: 0, total: 0 })
      setSettlements([])
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت اطلاعات مالی'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

  const handleSettlementRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const amount = Number(settlementAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast({
        title: 'خطا',
        description: 'مبلغ تسویه باید عددی بزرگ‌تر از صفر باشد.',
        variant: 'destructive',
      })
      return
    }

    if (wallet && amount > wallet.balance) {
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
      setWallet((current) =>
        current ? { ...current, balance: Math.max(0, current.balance - amount) } : current
      )
      setSettlementAmount('')
      setSettlementDescription('')
      setRequestOpen(false)
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
      value: formatMoney(wallet?.balance ?? 0),
      icon: Wallet,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'کل پورسانت ثبت‌شده',
      value: formatMoney(commissionTotals.total),
      icon: Banknote,
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'در انتظار پرداخت',
      value: formatMoney(wallet?.pendingBalance ?? 0),
      icon: Clock,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'تسویه پرداخت‌شده',
      value: formatMoney(paidSettlementTotal),
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
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button disabled={!wallet || wallet.balance <= 0}>
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
                    <span className="font-semibold">{formatMoney(wallet?.balance ?? 0)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settlement-amount">مبلغ</Label>
                    <Input
                      id="settlement-amount"
                      value={settlementAmount}
                      onChange={(event) =>
                        setSettlementAmount(event.target.value.replace(/\D/g, '').slice(0, 12))
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
          {!wallet ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Wallet className="size-10 text-muted-foreground" />
                <p className="text-sm font-medium">کیف پولی برای شما ثبت نشده است.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          )}

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
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>مشتری</TableHead>
                            <TableHead>طرح</TableHead>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>درصد</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>تاریخ ثبت</TableHead>
                            <TableHead>تاریخ پرداخت</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id}>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-medium">
                                  {getCustomerName(commission)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm">{getPlanName(commission)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-semibold">
                                  {formatMoney(commission.amount)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm">
                                  {formatNumber(commission.percent)}٪
                                </span>
                              </TableCell>
                              <TableCell>{renderCommissionStatus(commission.status)}</TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {formatDateTime(commission.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell>
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
