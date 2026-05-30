'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, Check, Filter, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PageHeader, DataTable, StatusBadge } from '@/components/shared'
import { commissionsService } from '@/services'
import type { Column } from '@/components/shared'
import type { CommissionItem, CommissionStatus, UserProfile } from '@/types'
import { formatDateTime, formatPriceWithUnit, getDisplayName, toPersianNum } from '@/utils/formatters'

type StatusFilter = 'all' | CommissionStatus

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

export default function AdminCommissionsPage() {
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<AdminCommissionItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
  }, [page, statusFilter, toast])

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
    const isPayProcessing = isProcessing && processingAction === 'pay'
    const isCancelProcessing = isProcessing && processingAction === 'cancel'

    if (row.status === 'PENDING') {
      return (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => handleApprove(row)}
          >
            {isProcessing ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Check className="ml-1 size-3.5" />}
            تایید
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
            onClick={() => openCancelDialog(row)}
          >
            <XCircle className="ml-1 size-3.5" />
            لغو
          </Button>
        </div>
      )
    }

    if (row.status === 'APPROVED') {
      return (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => openPayDialog(row)}
          >
            {isPayProcessing ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <Banknote className="ml-1 size-3.5" />}
            پرداخت
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
            onClick={() => openCancelDialog(row)}
          >
            {isCancelProcessing ? <Loader2 className="ml-1 size-3.5 animate-spin" /> : <XCircle className="ml-1 size-3.5" />}
            لغو
          </Button>
        </div>
      )
    }

    return <span className="text-sm text-muted-foreground">—</span>
  }

  const columns: Column<AdminCommissionItem>[] = [
    {
      key: 'amount',
      header: 'مبلغ',
      render: (row) => (
        <span className="whitespace-nowrap text-sm font-medium">
          {formatPriceWithUnit(row.amount)}
        </span>
      ),
    },
    {
      key: 'percent',
      header: 'درصد',
      render: (row) => (
        <span className="whitespace-nowrap text-sm">
          {toPersianNum(row.percent)}٪
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} className="text-xs" />,
    },
    {
      key: 'agent',
      header: 'نماینده',
      render: (row) => (
        <div className="flex min-w-[150px] flex-col">
          <span className="text-sm font-medium">
            {row.agent ? getDisplayName(row.agent) : 'نامشخص'}
          </span>
          {row.agent?.mobile && (
            <span className="font-mono text-xs text-muted-foreground">{row.agent.mobile}</span>
          )}
          {row.agent?.agent?.businessName && (
            <span className="text-xs text-muted-foreground">{row.agent.agent.businessName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'خریدار',
      render: (row) => (
        <div className="flex min-w-[150px] flex-col">
          <span className="text-sm font-medium">
            {row.userPlan?.user ? getDisplayName(row.userPlan.user) : 'نامشخص'}
          </span>
          {row.userPlan?.user?.mobile && (
            <span className="font-mono text-xs text-muted-foreground">
              {row.userPlan.user.mobile}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'طرح',
      render: (row) => (
        <span className="text-sm">
          {row.userPlan?.plan?.name || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ ایجاد',
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'تاریخ پرداخت',
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.paidAt ? formatDateTime(row.paidAt) : '—'}
        </span>
      ),
    },
  ]

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

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Filter className="size-4" />
            <span>فیلترها</span>
          </div>
          <div className="grid max-w-sm grid-cols-1 gap-4">
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
          </div>
        </CardContent>
      </Card>

      <DataTable<AdminCommissionItem>
        columns={columns}
        data={commissions}
        isLoading={isLoading}
        emptyMessage="کمیسیونی یافت نشد"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        actions={renderActions}
        actionsHeader="عملیات"
      />

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
