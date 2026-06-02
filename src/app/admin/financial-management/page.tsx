'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Check,
  Clock,
  Loader2,
  RefreshCw,
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
  APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
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
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

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

    if (settlement.status === 'PENDING') {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => void handleApprove(settlement)}
          >
            {isProcessing && processing.action === 'approve' ? (
              <Loader2 className="ml-1 size-3.5 animate-spin" />
            ) : (
              <Check className="ml-1 size-3.5" />
            )}
            تأیید
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isProcessing}
            onClick={() => openRejectDialog(settlement)}
          >
            {isProcessing && processing.action === 'reject' ? (
              <Loader2 className="ml-1 size-3.5 animate-spin" />
            ) : (
              <XCircle className="ml-1 size-3.5" />
            )}
            رد
          </Button>
        </div>
      )
    }

    if (settlement.status === 'APPROVED') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={isProcessing}
          onClick={() => openPaidDialog(settlement)}
        >
          {isProcessing && processing.action === 'paid' ? (
            <Loader2 className="ml-1 size-3.5 animate-spin" />
          ) : (
            <Banknote className="ml-1 size-3.5" />
          )}
          ثبت پرداخت
        </Button>
      )
    }

    return <span className="text-sm text-muted-foreground">-</span>
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
        description="کیف پول‌ها و درخواست‌های تسویه همکاران فروش را مدیریت کنید."
      />

      {isLoading ? (
        <LoadingState />
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
          <div className="grid gap-3 md:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.title} className="border-0 shadow-sm">
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

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-0 shadow-sm">
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
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>مالک</TableHead>
                            <TableHead>موجودی</TableHead>
                            <TableHead>در انتظار</TableHead>
                            <TableHead>واحد</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>آخرین به‌روزرسانی</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wallets.map((wallet) => (
                            <TableRow key={wallet.id}>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-medium">
                                  {getPersonName(wallet)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-semibold">
                                  {formatPriceWithUnit(wallet.balance)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm">
                                  {formatPriceWithUnit(wallet.pendingBalance)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm">{wallet.currency}</span>
                              </TableCell>
                              <TableCell>{renderWalletStatus(wallet.status)}</TableCell>
                              <TableCell>
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

            <Card className="border-0 shadow-sm">
              <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">درخواست‌های تسویه</CardTitle>
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
              </CardHeader>
              <CardContent className="p-0">
                {settlements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                    <Banknote className="size-10 text-muted-foreground" />
                    <p className="text-sm font-medium">درخواست تسویه‌ای یافت نشد.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>درخواست‌دهنده</TableHead>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>درخواست</TableHead>
                            <TableHead>تأیید</TableHead>
                            <TableHead>پرداخت</TableHead>
                            <TableHead>رد</TableHead>
                            <TableHead>کد پیگیری</TableHead>
                            <TableHead className="text-left">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.id}>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-medium">
                                  {getPersonName(settlement)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm font-semibold">
                                  {formatPriceWithUnit(settlement.amount)}
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
                                  {getDateOrDash(settlement.approvedAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(settlement.paidAt || settlement.settledAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {getDateOrDash(settlement.rejectedAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap text-sm text-muted-foreground">
                                  {settlement.trackingCode || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-left">
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
          </div>
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
