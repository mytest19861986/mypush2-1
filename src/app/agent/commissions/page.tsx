'use client'

import { useEffect, useState, useCallback } from 'react'
import { commissionsService } from '@/services/commissions.service'
import { PageHeader, DataTable, StatCard, StatusBadge, SearchFilterBar } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Inbox,
} from 'lucide-react'
import { formatPrice, toPersianNum, formatDate } from '@/utils/formatters'
import { COMMISSION_STATUS_LABELS } from '@/constants'
import { usePagination } from '@/hooks/shared'
import type { CommissionItem } from '@/types'
import type { Column } from '@/components/shared/data-table'

// ---------- Types ----------

interface CommissionStats {
  totalCommission: number
  paidCommission: number
  pendingCommission: number
  cancelledCommission: number
  totalReferrals: number
  activePlans: number
}

// ---------- Commissions Page ----------

export default function AgentCommissionsPage() {
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const pagination = usePagination({ initialPageSize: 10 })

  const fetchCommissions = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth-storage')
      let accessToken = ''
      if (token) {
        try {
          const parsed = JSON.parse(token)
          accessToken = parsed?.state?.accessToken || ''
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
      })
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch(`/api/v1/agents/commissions?${params.toString()}`, { headers })
      const data = await res.json()
      if (data.success && data.data) {
        setCommissions(data.data)
        if (data.pagination) {
          pagination.setTotalPages(data.pagination.totalPages)
          pagination.setTotal(data.pagination.total)
        }
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, statusFilter, pagination])

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-storage')
      let accessToken = ''
      if (token) {
        try {
          const parsed = JSON.parse(token)
          accessToken = parsed?.state?.accessToken || ''
        } catch {
          // ignore
        }
      }

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch('/api/v1/agents/commissions?stats=true', { headers })
      const data = await res.json()
      if (data.success && data.data) {
        setStats(data.data)
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset page when filter changes
  useEffect(() => {
    pagination.setPage(1)
  }, [statusFilter])

  // ---------- Table Columns ----------

  const columns: Column<CommissionItem>[] = [
    {
      key: 'userPlan',
      header: 'کاربر',
      render: (row) => {
        const userName = row.userPlan?.user?.profile
          ? `${row.userPlan.user.profile.firstName || ''} ${row.userPlan.user.profile.lastName || ''}`.trim() || 'بدون نام'
          : 'بدون نام'
        return <span className="font-medium">{userName}</span>
      },
      hiddenOn: 'sm',
    },
    {
      key: 'planName',
      header: 'طرح',
      render: (row) => (
        <span className="text-sm">{row.userPlan?.plan?.name || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'مبلغ پورسانت',
      render: (row) => (
        <span className="text-sm font-semibold">{formatPrice(row.amount)} ت</span>
      ),
    },
    {
      key: 'percent',
      header: 'درصد',
      render: (row) => (
        <span className="text-sm">{toPersianNum(row.percent)}٪</span>
      ),
      hiddenOn: 'md',
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
      hiddenOn: 'sm',
    },
  ]

  // ---------- Filter Options ----------

  const filterOptions = [
    { value: 'all', label: 'همه وضعیت‌ها' },
    { value: 'PENDING', label: COMMISSION_STATUS_LABELS.PENDING },
    { value: 'APPROVED', label: COMMISSION_STATUS_LABELS.APPROVED },
    { value: 'PAID', label: COMMISSION_STATUS_LABELS.PAID },
    { value: 'CANCELLED', label: COMMISSION_STATUS_LABELS.CANCELLED },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="پورسانت‌ها"
        description="مشاهده و مدیریت پورسانت‌های حاصل از معرفی کاربران"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="مجموع پورسانت"
          value={stats ? `${formatPrice(stats.totalCommission)} ت` : '—'}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          className="border border-emerald-200 dark:border-emerald-900"
        />

        <StatCard
          title="پرداخت شده"
          value={stats ? `${formatPrice(stats.paidCommission)} ت` : '—'}
          icon={CheckCircle}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          className="border border-emerald-200 dark:border-emerald-900"
        />

        <StatCard
          title="در انتظار پرداخت"
          value={stats ? `${formatPrice(stats.pendingCommission)} ت` : '—'}
          icon={Clock}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          className="border border-amber-200 dark:border-amber-900"
        />

        <StatCard
          title="لغو شده"
          value={stats ? `${formatPrice(stats.cancelledCommission)} ت` : '—'}
          icon={XCircle}
          iconClassName="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          className="border border-red-200 dark:border-red-900"
        />
      </div>

      {/* Filter + Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 pb-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 gap-2 sm:max-w-xs">
              <div className="relative flex-1">
                <SearchFilterBar
                  searchPlaceholder="جستجو..."
                  onSearch={() => {}}
                  filterOptions={filterOptions}
                  filterValue={statusFilter}
                  onFilterChange={(val) => {
                    setStatusFilter(val)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <DataTable
            columns={columns}
            data={commissions}
            isLoading={loading}
            rowKey={(row) => row.id}
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={pagination.setPage}
            emptyMessage="پورسانتی یافت نشد"
            emptyIcon={<Inbox className="size-12 text-muted-foreground/40" />}
          />
        </div>
      </div>
    </div>
  )
}
