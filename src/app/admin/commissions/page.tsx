'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, Check, Filter, Inbox, Loader2, MoreHorizontal, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatusBadge } from '@/components/shared'
import { commissionsService } from '@/services'
import type { Column } from '@/components/shared'
import type { CommissionItem, CommissionStatus, UserProfile } from '@/types'
import { formatDateTime, formatPriceWithUnit, getDisplayName, toPersianNum } from '@/utils/formatters'

type StatusFilter = 'all' | CommissionStatus
type SourceTypeFilter = 'all' | 'SALES_PARTNER' | 'USER_REFERRAL'

interface CommissionUser {
  id: string
  mobile?: string
  email?: string | null
  status?: string
  profile?: UserProfile | null
  agent?: {
    businessName?: string | null
    status?: string
  } | null
}

type AdminCommissionItem = CommissionItem & {
  sourceType?: 'SALES_PARTNER' | 'USER_REFERRAL'
  sourceLabel?: string
  agent?: CommissionUser | null
  userPlan?: CommissionItem['userPlan'] & {
    user?: CommissionUser | null
  }
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'APPROVED', label: 'تایید شده' },
  { value: 'PAID', label: 'پرداخت شده' },
  { value: 'CANCELLED', label: 'لغو شده' },
]

const sourceTypeOptions: { value: SourceTypeFilter; label: string }[] = [
  { value: 'all', label: 'همه نوع‌ها' },
  { value: 'SALES_PARTNER', label: 'همکار فروش' },
  { value: 'USER_REFERRAL', label: 'رفرال کاربر' },
]

const commissionStatusClasses: Record<CommissionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAID: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export default function AdminCommissionsPage() {
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<AdminCommissionItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>('all')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<'approve' | 'cancel' | 'pay' | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminCommissionItem | null>(null)
  const [payTarget, setPayTarget] = useState<AdminCommissionItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [payRefId, setPayRefId] = useState('')
  const [payDescription, setPayDescription] = useState('')

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await commissionsService.getAll({
        page,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sourceType: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
        ownerSearch: ownerSearch.trim() || undefined,
      })

      if (res.success && res.data) {
        setCommissions(res.data as AdminCommissionItem[])
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
      } else {
        toast({
          title: 'خطا',
          description: res.error?.message || res.message || 'خطا در دریافت لیست کمیسیون‌ها',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت لیست کمیسیون‌ها',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [ownerSearch, page, sourceTypeFilter, statusFilter, toast])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  const handleApprove = async (commission: AdminCommissionItem) => {
    setProcessingId(commission.id)
    setProcessingAction('approve')
    try {
      await commissionsService.approve(commission.id)
      toast({ title: 'موفق', description: 'پورسانت با موفقیت تایید شد' })
      await fetchCommissions()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تایید پورسانت',
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
    setPayRefId('')
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
      await fetchCommissions()
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

    const refId = payRefId.trim()
    const description = payDescription.trim()
    const data = refId || description
      ? { refId: refId || undefined, description: description || undefined }
      : undefined

    setProcessingId(payTarget.id)
    setProcessingAction('pay')
    try {
      await commissionsService.pay(payTarget.id, data)
      toast({ title: 'موفق', description: 'پورسانت با موفقیت پرداخت شد' })
      setPayTarget(null)
      await fetchCommissions()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در پرداخت پورسانت',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

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
              onClick={() => handleApprove(row)}
            >
              {isApproveProcessing ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <Check className="ml-2 size-4" />
              )}
              تایید پورسانت
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

  const columns: Column<AdminCommissionItem>[] = [
    {
      key: 'amount',
      header: 'مبلغ',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <span className="whitespace-nowrap text-sm font-medium tabular-nums">
          {formatPriceWithUnit(row.amount)}
        </span>
      ),
    },
    {
      key: 'percent',
      header: 'درصد',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {toPersianNum(row.percent)}٪
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <StatusBadge
          status={row.status}
          className={`text-xs ${commissionStatusClasses[row.status] ?? ''}`}
        />
      ),
    },
    {
      key: 'sourceType',
      header: 'نوع',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <Badge variant="outline" className="w-fit whitespace-nowrap">
          {row.sourceLabel ||
            (row.sourceType === 'SALES_PARTNER' ? 'همکار فروش' : 'رفرال کاربر')}
        </Badge>
      ),
    },
    {
      key: 'agent',
      header: 'نماینده',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {row.agent ? getDisplayName(row.agent) : 'نامشخص'}
          </span>
          {row.agent?.agent?.businessName && (
            <span className="truncate text-xs text-muted-foreground">{row.agent.agent.businessName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'خریدار',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {row.userPlan?.user ? getDisplayName(row.userPlan.user) : 'نامشخص'}
          </span>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'طرح',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <span className="block truncate text-sm">
          {row.userPlan?.plan?.name || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ ایجاد',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'تاریخ پرداخت',
      className: 'px-4 py-3 text-right',
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.paidAt ? formatDateTime(row.paidAt) : '—'}
        </span>
      ),
    },
  ]

  const commissionColumnWidths = [
    'w-[140px]',
    'w-[90px]',
    'w-[130px]',
    'w-[130px]',
    'w-[190px]',
    'w-[190px]',
    'w-[160px]',
    'w-[170px]',
    'w-[170px]',
  ]

  const getCommissionColumnClassName = (col: Column<AdminCommissionItem>) =>
    col.hiddenOn ? `hidden ${col.hiddenOn}:table-cell ${col.className ?? ''}` : col.className

  const renderCommissionsTable = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )
    }

    if (commissions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
          <Inbox className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">کمیسیونی یافت نشد</p>
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <Table className="min-w-[1450px] table-fixed w-full">
          <colgroup>
            {commissionColumnWidths.map((width, index) => (
              <col key={`${width}-${index}`} className={width} />
            ))}
            <col className="w-[80px]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-b bg-transparent hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={getCommissionColumnClassName(col)}
                >
                  {col.header}
                </TableHead>
              ))}
              <TableHead className="w-[80px] px-4 py-3 text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((row, index) => (
              <TableRow key={row.id} className="group">
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={getCommissionColumnClassName(col)}
                  >
                    {col.render
                      ? col.render(row, index)
                      : (row as unknown as Record<string, unknown>)[col.key] != null
                        ? String((row as unknown as Record<string, unknown>)[col.key])
                        : '—'}
                  </TableCell>
                ))}
                <TableCell className="w-[80px] px-4 py-3 text-left">
                  {renderActions(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت کمیسیون‌ها"
        description={
          <>
            مشاهده لیست کمیسیون‌های ثبت‌شده —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            مورد
          </>
        }
      />

      <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Filter className="size-4" />
            <span>فیلترها</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">وضعیت</Label>
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
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
                  {sourceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commission-owner-search" className="text-xs">
                جستجوی دریافت‌کننده
              </Label>
              <Input
                id="commission-owner-search"
                value={ownerSearch}
                onChange={(event) => {
                  setOwnerSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="نام، نام خانوادگی یا نام کسب‌وکار"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {renderCommissionsTable()}

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
              onClick={handleCancel}
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
            <DialogTitle>پرداخت پورسانت</DialogTitle>
            <DialogDescription>
              شناسه پیگیری و توضیحات پرداخت اختیاری هستند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-ref-id">شناسه پیگیری</Label>
              <Input
                id="pay-ref-id"
                value={payRefId}
                onChange={(event) => setPayRefId(event.target.value)}
                placeholder="اختیاری"
                maxLength={100}
              />
            </div>
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
              onClick={handlePay}
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
