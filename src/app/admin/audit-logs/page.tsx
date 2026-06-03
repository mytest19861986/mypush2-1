'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared'
import { auditService } from '@/services'
import type { AuditLogItem } from '@/types'
import { toPersianNum, formatDateTime } from '@/utils/formatters'
import { AUDIT_ACTION_LABELS, ENTITY_LABELS } from '@/constants'
import { cn } from '@/lib/utils'

function getActionBadgeClass(action: string) {
  if (action.includes('DELETED') || action.includes('REJECTED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
  }

  if (action.includes('CREATED') || action.includes('UPLOADED')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
  }

  if (action.includes('UPDATED') || action.includes('STATUS') || action.includes('REVIEWED')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
  }

  if (action.includes('LOGIN')) {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300'
}

function getEntityBadgeClass(entity?: string | null) {
  const toneMap: Record<string, string> = {
    User: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300',
    Agent: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
    Doctor: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300',
    Plan: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300',
    Contract: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300',
    Commission: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-300',
    Role: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300',
    Permission: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/40 dark:bg-pink-950/30 dark:text-pink-300',
    Document: 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-300',
  }

  return entity
    ? toneMap[entity] || 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300'
}

function getAuditUserName(row: AuditLogItem) {
  const firstName = row.user?.profile?.firstName || ''
  const lastName = row.user?.profile?.lastName || ''

  return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'نامشخص'
}

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

  const renderAuditRows = () => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={6} className="px-4 py-4">
            <Skeleton className="h-7 w-full" />
          </TableCell>
        </TableRow>
      ))
    }

    if (logs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
            رکوردی یافت نشد
          </TableCell>
        </TableRow>
      )
    }

    return logs.map((row) => (
      <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
        <TableCell className="px-4 py-4">
          <div className="flex min-w-36 flex-col">
            <span className="text-sm font-medium">{getAuditUserName(row)}</span>
            {row.user?.mobile && (
              <span className="font-mono text-xs text-muted-foreground">{row.user.mobile}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="px-4 py-4">
          <Badge
            variant="outline"
            className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', getActionBadgeClass(row.action))}
          >
            {AUDIT_ACTION_LABELS[row.action] || row.action}
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-4">
          {row.entity ? (
            <div className="flex max-w-48 flex-col items-start gap-1">
              <Badge
                variant="outline"
                className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', getEntityBadgeClass(row.entity))}
              >
                {ENTITY_LABELS[row.entity] || row.entity}
              </Badge>
              {row.entityId && (
                <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
                  #{row.entityId.slice(0, 8)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="px-4 py-4">
          <span className="font-mono text-sm text-muted-foreground">{row.ip || '—'}</span>
        </TableCell>
        <TableCell className="hidden px-4 py-4 md:table-cell">
          <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
            {row.device || '—'}
          </span>
        </TableCell>
        <TableCell className="px-4 py-4">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDateTime(row.createdAt)}
          </span>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارش فعالیت‌ها"
        description={
          <>
            مشاهده و پایش رویدادهای مهم سامانه
            <span className="mr-1 font-semibold text-emerald-600">
              {toPersianNum(total)} رکورد
            </span>
          </>
        }
      />

      {/* Filter card */}
      <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Filter className="size-4" />
            <span>فیلترها</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">نوع عملیات</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
                <SelectTrigger className="bg-background">
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
                <SelectTrigger className="bg-background">
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
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تا تاریخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="bg-background"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-start">
            <Button onClick={clearFilters} variant="ghost" size="sm">
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">کاربر</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">عملیات</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">موجودیت</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">آی‌پی</TableHead>
              <TableHead className="hidden px-4 py-3 text-right text-sm font-semibold text-muted-foreground md:table-cell">دستگاه</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderAuditRows()}</TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {toPersianNum(total)} مورد
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                صفحه {toPersianNum(page)} از {toPersianNum(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronRight className="ml-1 size-4" />
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                بعدی
                <ChevronLeft className="mr-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
