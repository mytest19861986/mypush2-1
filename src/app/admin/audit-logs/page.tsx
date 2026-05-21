'use client'

import { useEffect, useState, useCallback } from 'react'
import { Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { auditService } from '@/services'
import type { AuditLogItem } from '@/types'
import type { Column } from '@/components/shared'
import { toPersianNum, formatDateTime } from '@/utils/formatters'
import { AUDIT_ACTION_LABELS, ENTITY_LABELS } from '@/constants'

export default function AdminAuditLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: {
        page: number
        limit: number
        action?: string
        entity?: string
        startDate?: string
        endDate?: string
      } = {
        page,
        limit: 20,
      }
      if (actionFilter !== 'ALL') params.action = actionFilter
      if (entityFilter !== 'ALL') params.entity = entityFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await auditService.getLogs(params)
      if (res.success && res.data) {
        setLogs(res.data)
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در دریافت گزارش تغییرات', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [page, actionFilter, entityFilter, startDate, endDate, toast])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const clearFilters = () => {
    setActionFilter('ALL')
    setEntityFilter('ALL')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const actionOptions = Object.entries(AUDIT_ACTION_LABELS)
  const entityOptions = Object.entries(ENTITY_LABELS)

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'user',
      header: 'کاربر',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {row.user?.profile?.firstName || row.user?.profile?.lastName
              ? `${row.user.profile.firstName || ''} ${row.user.profile.lastName || ''}`.trim()
              : 'نامشخص'}
          </span>
          {row.user?.mobile && (
            <span className="text-xs text-muted-foreground font-mono">{row.user.mobile}</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'عملیات',
      render: (row) => (
        <Badge variant="secondary" className="text-xs">
          {AUDIT_ACTION_LABELS[row.action] || row.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'موجودیت',
      render: (row) => (
        <span className="text-sm">
          {row.entity ? (
            <>
              {ENTITY_LABELS[row.entity] || row.entity}
              {row.entityId && (
                <span className="text-xs text-muted-foreground font-mono mr-1">
                  #{row.entityId.slice(0, 8)}
                </span>
              )}
            </>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'آی‌پی',
      render: (row) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.ip || '—'}
        </span>
      ),
    },
    {
      key: 'device',
      header: 'دستگاه',
      hiddenOn: 'md',
      render: (row) => (
        <span className="max-w-[150px] truncate text-xs text-muted-foreground">
          {row.device || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارش تغییرات"
        description={
          <>
            مشاهده تاریخچه تمامی عملیات‌های سامانه — {toPersianNum(total)} رکورد
          </>
        }
      />

      {/* Filter card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Filter className="size-4" />
            <span>فیلترها</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">نوع عملیات</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه</SelectItem>
                  {actionOptions.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع موجودیت</Label>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه</SelectItem>
                  {entityOptions.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">از تاریخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تا تاریخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={clearFilters} variant="ghost" size="sm">
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <DataTable<AuditLogItem>
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="رکوردی یافت نشد"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        rowKey={(row) => row.id}
      />
    </div>
  )
}
