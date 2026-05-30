'use client'

import { useCallback, useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      />
    </div>
  )
}
