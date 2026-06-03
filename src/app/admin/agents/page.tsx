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
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import { PageHeader, StatusBadge } from '@/components/shared'
import { agentsService } from '@/services'
import type { AgentItem } from '@/types'
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
  const [searchInput, setSearchInput] = useState('')
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

  const handleSearchSubmit = () => {
    handleSearch(searchInput)
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

  // ...existing code...

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت همکاران فروش"
        description={
          <>
            بررسی، تأیید و مدیریت همکاران فروش و وضعیت فعالیت آن‌ها —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            نماینده
          </>
        }
      />

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row md:max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام کسب‌وکار یا شماره موبایل..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="w-full border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <Button onClick={handleSearchSubmit} variant="secondary" className="shrink-0">
              جستجو
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full border border-input bg-background shadow-sm focus:ring-1 focus:ring-primary md:w-56">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Manual Table */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">نام</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">موبایل</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">کسب‌وکار</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">وضعیت</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">مدارک</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">تاریخ</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={7} className="px-4 py-4">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  نماینده‌ای یافت نشد
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="group border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-4 text-sm font-medium">{getDisplayName(agent.user)}</td>
                  <td className="px-4 py-4 text-sm font-mono">{agent.user?.mobile || '—'}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{agent.businessName || '—'}</td>
                  <td className="px-4 py-4 text-sm"><StatusBadge status={agent.status} className="font-medium" /></td>
                  <td className="px-4 py-4 text-sm">
                    <Badge variant="outline">
                      <FileSearch className="ml-1 size-3" />
                      {toPersianNum(agent.documentCount ?? agent.documents?.length ?? 0)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(agent.createdAt)}</td>
                  <td className="px-4 py-4 text-left text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="عملیات نماینده"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(agent.id)}>
                          <Eye className="ml-2 size-4" />
                          مشاهده جزئیات
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {agent.status !== 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(agent.id, 'APPROVED')}
                            disabled={changingId === agent.id}
                          >
                            <CheckCircle className="ml-2 size-4 text-emerald-600" />
                            تأیید
                          </DropdownMenuItem>
                        )}
                        {agent.status !== 'REJECTED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(agent.id, 'REJECTED')}
                            disabled={changingId === agent.id}
                          >
                            <XCircle className="ml-2 size-4 text-red-600" />
                            رد
                          </DropdownMenuItem>
                        )}
                        {agent.status !== 'SUSPENDED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(agent.id, 'SUSPENDED')}
                            disabled={changingId === agent.id}
                          >
                            <Ban className="ml-2 size-4 text-orange-600" />
                            تعلیق
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

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
