'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  ShieldCheck,
  FileSearch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, SearchFilterBar, DataTable, StatusBadge } from '@/components/shared'
import { agentsService } from '@/services'
import type { AgentItem } from '@/types'
import type { Column } from '@/components/shared'
import { toPersianNum, getDisplayName, formatDate } from '@/utils/formatters'
import { AGENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/constants'

/* ── Status filter options ───────────────────────────────── */

const STATUS_FILTERS = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'UNDER_REVIEW', label: 'در حال بررسی' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'SUSPENDED', label: 'معلق' },
]

/* ── Agents Page ─────────────────────────────────────────── */

export default function AdminAgentsPage() {
  const { toast } = useToast()
  const [agents, setAgents] = useState<AgentItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const fetchAgents = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: { page: number; limit: number; search?: string; status?: string } = {
        page,
        limit: 20,
      }
      if (search) params.search = search
      if (statusFilter !== 'ALL') params.status = statusFilter

      const res = await agentsService.getList(params)
      if (res.success && res.data) {
        setAgents(res.data)
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت لیست نمایندگان',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    setChangingId(agentId)
    try {
      await agentsService.changeStatus(agentId, newStatus)
      toast({
        title: 'موفق',
        description: `وضعیت نماینده به «${AGENT_STATUS_LABELS[newStatus as keyof typeof AGENT_STATUS_LABELS] || newStatus}» تغییر یافت`,
      })
      fetchAgents()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تغییر وضعیت',
        variant: 'destructive',
      })
    } finally {
      setChangingId(null)
    }
  }

  const handleViewDetail = async (agentId: string) => {
    setIsDetailLoading(true)
    setSelectedAgent(null)
    try {
      const res = await agentsService.getById(agentId)
      if (res.success && res.data) {
        setSelectedAgent(res.data)
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت جزئیات',
        variant: 'destructive',
      })
    } finally {
      setIsDetailLoading(false)
    }
  }

  const columns: Column<AgentItem>[] = [
    {
      key: 'name',
      header: 'نام',
      render: (row) => (
        <span className="font-medium">
          {getDisplayName(row.user)}
        </span>
      ),
    },
    {
      key: 'mobile',
      header: 'موبایل',
      render: (row) => (
        <span className="font-mono text-sm">{row.user?.mobile || '—'}</span>
      ),
    },
    {
      key: 'businessName',
      header: 'کسب‌وکار',
      hiddenOn: 'md',
      render: (row) => (
        <span className="max-w-[180px] truncate text-sm text-muted-foreground">
          {row.businessName || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'documents',
      header: 'مدارک',
      hiddenOn: 'sm',
      render: (row) => (
        <Badge variant="outline">
          <FileSearch className="ml-1 size-3" />
          {toPersianNum(row.documentCount ?? row.documents?.length ?? 0)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      hiddenOn: 'lg',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نمایندگان"
        description={
          <>
            مشاهده و مدیریت درخواست‌های نمایندگی —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            نماینده
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="جستجو بر اساس نام کسب‌وکار یا شماره موبایل..."
        onSearch={handleSearch}
        filterOptions={STATUS_FILTERS}
        filterValue={statusFilter}
        onFilterChange={(v) => {
          setStatusFilter(v)
          setPage(1)
        }}
      />

      <DataTable<AgentItem>
        columns={columns}
        data={agents}
        isLoading={isLoading}
        emptyMessage="نماینده‌ای یافت نشد"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        actions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetail(row.id)}>
                <Eye className="ml-2 size-4" />
                مشاهده جزئیات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status !== 'APPROVED' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(row.id, 'APPROVED')}
                  disabled={changingId === row.id}
                >
                  <CheckCircle className="ml-2 size-4 text-emerald-600" />
                  تأیید
                </DropdownMenuItem>
              )}
              {row.status !== 'REJECTED' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(row.id, 'REJECTED')}
                  disabled={changingId === row.id}
                >
                  <XCircle className="ml-2 size-4 text-red-600" />
                  رد
                </DropdownMenuItem>
              )}
              {row.status !== 'SUSPENDED' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(row.id, 'SUSPENDED')}
                  disabled={changingId === row.id}
                >
                  <Ban className="ml-2 size-4 text-orange-600" />
                  تعلیق
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Agent detail dialog */}
      <Dialog
        open={!!selectedAgent || isDetailLoading}
        onOpenChange={() => setSelectedAgent(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>جزئیات نماینده</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : selectedAgent ? (
            <div className="space-y-4">
              {/* Business info */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <h3 className="font-semibold">اطلاعات کسب‌وکار</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">نام کسب‌وکار: </span>
                    <span>{selectedAgent.businessName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">وضعیت: </span>
                    <StatusBadge status={selectedAgent.status} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">امتیاز: </span>
                    <span className="font-semibold text-emerald-600">
                      {toPersianNum(selectedAgent.score)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاریخ ثبت‌نام: </span>
                    <span>{formatDate(selectedAgent.createdAt)}</span>
                  </div>
                  {selectedAgent.verifiedAt && (
                    <div>
                      <span className="text-muted-foreground">تاریخ تأیید: </span>
                      <span>{formatDate(selectedAgent.verifiedAt)}</span>
                    </div>
                  )}
                  {selectedAgent.description && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">توضیحات: </span>
                      <span>{selectedAgent.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* User info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold">اطلاعات کاربر</h3>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">موبایل: </span>
                    <span className="font-mono">
                      {selectedAgent.user?.mobile || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نام: </span>
                    <span>{getDisplayName(selectedAgent.user) !== 'کاربر' ? getDisplayName(selectedAgent.user) : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ایمیل: </span>
                    <span>{selectedAgent.user?.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نقش‌ها: </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {selectedAgent.user?.roles?.map((r) => (
                        <Badge key={r.id} variant="outline" className="text-xs">
                          {r.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedAgent.documents && selectedAgent.documents.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">مدارک</h3>
                  <div className="space-y-2">
                    {selectedAgent.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type}
                          </span>
                          <span className="mx-2 text-muted-foreground">—</span>
                          <span className="text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {selectedAgent.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      handleStatusChange(selectedAgent.id, 'APPROVED')
                      setSelectedAgent(null)
                    }}
                    disabled={changingId === selectedAgent.id}
                  >
                    <CheckCircle className="ml-1.5 size-4" />
                    تأیید
                  </Button>
                )}
                {selectedAgent.status !== 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      handleStatusChange(selectedAgent.id, 'REJECTED')
                      setSelectedAgent(null)
                    }}
                    disabled={changingId === selectedAgent.id}
                  >
                    <XCircle className="ml-1.5 size-4" />
                    رد
                  </Button>
                )}
                {selectedAgent.status !== 'SUSPENDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(selectedAgent.id, 'SUSPENDED')
                      setSelectedAgent(null)
                    }}
                    disabled={changingId === selectedAgent.id}
                  >
                    <Ban className="ml-1.5 size-4" />
                    تعلیق
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
