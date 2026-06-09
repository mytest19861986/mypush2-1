'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  ShieldCheck,
  FileSearch,
  Search,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  JalaliDateRangeFilter,
  type JalaliDateRangeValue,
} from '@/components/shared/jalali-date-range-filter'
import { apiClient } from '@/lib/api-client'
import { agentsService, rolesService } from '@/services'
import type { AgentItem, RoleItem, SafeRoleItem } from '@/types'
import {
  toPersianNum,
  getDisplayName,
  formatDate,
  formatDateTime,
  formatJalaliDateRange,
  formatPriceWithUnit,
} from '@/utils/formatters'
import {
  getCurrentJalaliYearMonth,
  gregorianDateToJalaliParts,
  jalaliDatePartsToIsoDate,
} from '@/utils/jalali-date'
import { AGENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, COMMISSION_STATUS_LABELS } from '@/constants'

/* ── Status filter options ───────────────────────────────── */

const STATUS_FILTERS = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'UNDER_REVIEW', label: 'در حال بررسی' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'SUSPENDED', label: 'معلق' },
]
const PROTECTED_ROLE_NAMES = new Set(['USER', 'AGENT', 'DOCTOR', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])
const ROLE_SESSION_NOTICE = 'برای اعمال کامل دسترسی‌ها، کاربر باید دوباره وارد حساب شود.'

/* ── Agents Page ─────────────────────────────────────────── */

type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'

interface AgentPerformance {
  range: {
    from: string
    to: string
  }
  customerStats: {
    registeredCustomersCount: number
    paidCustomersCount: number
    finalConfirmedCustomersCount: number
    returnedCustomersCount: number
  }
  commissionStats: {
    totalCommissionAmount: number
    pendingCommissionAmount: number
    approvedCommissionAmount: number
    approvedWithdrawableCommissionAmount: number
    paidCommissionAmount: number
  }
  settlementStats: {
    openSettlementAmount: number
    paidSettlementAmount: number
  }
  commissionRecords: Array<{
    key: string
    amount: number
    percent: number
    status: CommissionStatus
    paidAt: string | null
    createdAt: string
    plan: {
      name: string
      price: number
    }
    salesCustomer: {
      firstName: string | null
      lastName: string | null
      status: string
    } | null
  }>
  settlementRecords: Array<{
    key: string
    amount: number
    status: SettlementStatus
    requestedAt: string
    settledAt: string | null
    createdAt: string
  }>
}

type AgentDetail = AgentItem & {
  financialInfo?: {
    payoutInfoComplete: boolean
  }
}

const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تایید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

function getRecentJalaliRange(days: number): JalaliDateRangeValue {
  const today = startOfLocalDay(new Date())
  return {
    from: gregorianDateToJalaliParts(addLocalDays(today, -(days - 1))),
    to: gregorianDateToJalaliParts(today),
  }
}

function toIsoRange(range: JalaliDateRangeValue) {
  return {
    from: jalaliDatePartsToIsoDate(range.from.year, range.from.month, range.from.day),
    to: jalaliDatePartsToIsoDate(range.to.year, range.to.month, range.to.day),
  }
}

function getDateOrDash(value?: string | null) {
  return value ? formatDateTime(value) : '—'
}

function getCustomerName(customer: AgentPerformance['commissionRecords'][number]['salesCustomer']) {
  if (!customer) return 'مشتری ثبت‌شده'
  const firstName = customer.firstName?.trim() ?? ''
  const lastName = customer.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim() || 'مشتری ثبت‌شده'
}

function isProtectedRole(roleName: string) {
  return PROTECTED_ROLE_NAMES.has(roleName.toUpperCase())
}

export default function AdminAgentsPage() {
  const { toast } = useToast()
  const currentJalaliMonth = useMemo(() => getCurrentJalaliYearMonth(), [])
  const [agents, setAgents] = useState<AgentItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [performanceRange, setPerformanceRange] = useState<JalaliDateRangeValue>(() =>
    getRecentJalaliRange(30)
  )
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance | null>(null)
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([])
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([])
  const [isRolesLoading, setIsRolesLoading] = useState(false)
  const [isRolesSaving, setIsRolesSaving] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSavedNotice, setRolesSavedNotice] = useState(false)

  const performanceYearOptions = useMemo(() => {
    const selectedYears = [performanceRange.from.year, performanceRange.to.year]
    const yearWindow = Array.from({ length: 12 }, (_, index) => currentJalaliMonth.year + 1 - index)
    return Array.from(new Set([...yearWindow, ...selectedYears])).sort((a, b) => b - a)
  }, [currentJalaliMonth.year, performanceRange])

  const selectedPerformanceRangeText = useMemo(() => {
    try {
      const range = toIsoRange(performanceRange)
      return formatJalaliDateRange(range.from, range.to)
    } catch {
      return 'بازه تاریخ نامعتبر است'
    }
  }, [performanceRange])

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
        description: 'خطا در دریافت لیست همکاران فروش',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const fetchAvailableRoles = useCallback(async () => {
    setIsRolesLoading(true)
    setRolesError(null)
    try {
      const res = await rolesService.getList()
      if (res.success && res.data) {
        setAvailableRoles(res.data)
      } else {
        throw new Error(res.error?.message || res.message || 'خطا در دریافت نقش‌ها')
      }
    } catch (error) {
      setAvailableRoles([])
      setRolesError(error instanceof Error ? error.message : 'خطا در دریافت نقش‌ها')
    } finally {
      setIsRolesLoading(false)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleSearchSubmit = () => {
    handleSearch(searchInput)
  }

  const fetchAgentPerformance = useCallback(async (agentId: string) => {
    setIsPerformanceLoading(true)
    setPerformanceError(null)
    try {
      const isoRange = toIsoRange(performanceRange)
      if (isoRange.from > isoRange.to) {
        throw new Error('تاریخ شروع باید قبل از تاریخ پایان باشد.')
      }

      const params = new URLSearchParams(isoRange)
      const res = await apiClient.get<AgentPerformance>(
        `/admin/agents/${agentId}/performance?${params.toString()}`
      )
      if (res.success && res.data) {
        setAgentPerformance(res.data)
      } else {
        throw new Error(res.error?.message || res.message || 'خطا در دریافت عملکرد همکار فروش')
      }
    } catch (error) {
      setAgentPerformance(null)
      setPerformanceError(
        error instanceof Error ? error.message : 'خطا در دریافت عملکرد همکار فروش'
      )
    } finally {
      setIsPerformanceLoading(false)
    }
  }, [performanceRange])

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    setChangingId(agentId)
    try {
      await agentsService.changeStatus(agentId, newStatus)
      toast({
        title: 'موفق',
        description: `وضعیت همکار فروش به «${AGENT_STATUS_LABELS[newStatus as keyof typeof AGENT_STATUS_LABELS] || newStatus}» تغییر یافت`,
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
    setAgentPerformance(null)
    setPerformanceError(null)
    setRolesError(null)
    setRolesSavedNotice(false)
    try {
      const res = await agentsService.getById(agentId)
      if (res.success && res.data) {
        setSelectedAgent(res.data as AgentDetail)
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

  const handleRoleToggle = (roleName: string, checked: boolean) => {
    if (isProtectedRole(roleName)) return
    setRolesSavedNotice(false)
    setSelectedRoleNames((current) => {
      if (checked) return Array.from(new Set([...current, roleName]))
      return current.filter((name) => name !== roleName)
    })
  }

  const handleSaveRoles = async () => {
    if (!selectedAgent?.id || !selectedAgent.userId) return
    setIsRolesSaving(true)
    try {
      const result = await rolesService.updateUserRoles(selectedAgent.userId, selectedRoleNames)
      const updatedRoles: SafeRoleItem[] = result.roles
      setSelectedRoleNames(updatedRoles.map((role) => role.name))
      setSelectedAgent((current) =>
        current
          ? {
              ...current,
              user: current.user ? { ...current.user, roles: updatedRoles } : current.user,
            }
          : current
      )
      setRolesSavedNotice(true)
      toast({ title: 'موفق', description: `نقش‌های حساب کاربری همکار فروش ذخیره شد. ${ROLE_SESSION_NOTICE}` })

      const [detailRes] = await Promise.all([
        agentsService.getById(selectedAgent.id),
        fetchAgents(),
      ])
      if (detailRes.success && detailRes.data) {
        setSelectedAgent(detailRes.data as AgentDetail)
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در ذخیره نقش‌ها',
        variant: 'destructive',
      })
    } finally {
      setIsRolesSaving(false)
    }
  }

  useEffect(() => {
    if (!selectedAgent?.id) return
    void fetchAgentPerformance(selectedAgent.id)
  }, [fetchAgentPerformance, selectedAgent?.id])

  useEffect(() => {
    if (!selectedAgent?.id) return
    void fetchAvailableRoles()
  }, [fetchAvailableRoles, selectedAgent?.id])

  useEffect(() => {
    if (!selectedAgent) {
      setSelectedRoleNames([])
      return
    }
    setSelectedRoleNames(selectedAgent.user?.roles?.map((role) => role.name) ?? [])
  }, [selectedAgent])

  // ...existing code...

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت همکاران فروش"
        description={
          <>
            بررسی، تأیید و مدیریت همکاران فروش و وضعیت فعالیت آن‌ها —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            همکار فروش
          </>
        }
      />

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row md:max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس عنوان همکاری یا شماره موبایل..."
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
              <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">عنوان همکاری</th>
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
                  همکار فروشی یافت نشد
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
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(agent.id)}
                        disabled={isDetailLoading}
                        className="whitespace-nowrap"
                      >
                        <Eye className="ml-1.5 size-4" />
                        مشاهده جزئیات
                      </Button>
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="عملیات همکار فروش"
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Sales partner detail dialog */}
      <Dialog
        open={!!selectedAgent || isDetailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgent(null)
            setAgentPerformance(null)
            setPerformanceError(null)
            setSelectedRoleNames([])
            setRolesError(null)
            setRolesSavedNotice(false)
          }
        }}
      >
        <DialogContent className="max-h-[86vh] max-w-6xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>جزئیات همکار فروش</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : selectedAgent ? (
            <div className="space-y-4">
              {/* Sales partnership info */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <h3 className="font-semibold">اطلاعات همکاری فروش</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">عنوان/توضیح همکاری: </span>
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
                    <span className="text-muted-foreground">کد ملی: </span>
                    <span className="font-mono">{selectedAgent.user?.profile?.nationalCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">وضعیت اطلاعات مالی: </span>
                    <Badge
                      variant={selectedAgent.financialInfo?.payoutInfoComplete ? 'default' : 'outline'}
                      className="font-medium"
                    >
                      {selectedAgent.financialInfo?.payoutInfoComplete ? 'تکمیل شده' : 'تکمیل نشده'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نقش‌ها: </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {selectedAgent.user?.roles?.map((r) => (
                        <Badge
                          key={`${r.name}-${r.title}`}
                          variant="outline"
                          className="h-auto max-w-full whitespace-normal text-xs leading-6"
                        >
                          {r.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <h3 className="font-semibold">مدیریت نقش‌ها</h3>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      این نقش‌ها برای حساب کاربری این همکار فروش اعمال می‌شوند.
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.user?.roles && selectedAgent.user.roles.length > 0 ? (
                    selectedAgent.user.roles.map((role) => (
                      <Badge
                        key={`${role.name}-${role.title}`}
                        variant="outline"
                        className="h-auto max-w-full whitespace-normal text-xs leading-6"
                      >
                        {role.title || role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">نقشی برای این حساب کاربری ثبت نشده است.</span>
                  )}
                </div>

                {isRolesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : rolesError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {rolesError}
                  </div>
                ) : availableRoles.length === 0 ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    نقشی برای نمایش وجود ندارد.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {availableRoles.map((role) => {
                      const protectedRole = isProtectedRole(role.name)
                      const checked = selectedRoleNames.includes(role.name)
                      return (
                        <label
                          key={role.name}
                          className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-3 text-sm sm:flex-row sm:items-start sm:p-4"
                        >
                          <Checkbox
                            className="mt-1 shrink-0"
                            checked={checked}
                            disabled={protectedRole || isRolesSaving}
                            onCheckedChange={(value) => handleRoleToggle(role.name, value === true)}
                          />
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block whitespace-normal break-words font-medium leading-6">
                              {role.title || role.name}
                            </span>
                            {role.title && role.title !== role.name ? (
                              <span className="block break-all text-xs leading-5 text-muted-foreground">
                                {role.name}
                              </span>
                            ) : null}
                          </span>
                          {protectedRole && (
                            <Badge variant="secondary" className="h-auto shrink-0 self-start whitespace-nowrap text-[10px] leading-5">
                              محافظت‌شده
                            </Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {rolesSavedNotice ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                      {ROLE_SESSION_NOTICE}
                    </p>
                  ) : (
                    <p className="text-xs leading-6 text-muted-foreground">
                      پس از انتخاب نقش‌ها، تغییرات را ذخیره کنید.
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveRoles}
                    disabled={
                      isRolesSaving ||
                      isRolesLoading ||
                      Boolean(rolesError) ||
                      availableRoles.length === 0 ||
                      !selectedAgent.userId
                    }
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {isRolesSaving ? 'در حال ذخیره...' : 'ذخیره نقش‌ها'}
                  </Button>
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

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">عملکرد همکار فروش</h3>
                    <p className="text-xs leading-6 text-muted-foreground">
                      بازه انتخابی: {selectedPerformanceRangeText}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPerformanceRange(getRecentJalaliRange(30))}
                      disabled={isPerformanceLoading}
                    >
                      بازنشانی بازه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchAgentPerformance(selectedAgent.id)}
                      disabled={isPerformanceLoading}
                    >
                      <RefreshCw className="ml-1.5 size-4" />
                      به‌روزرسانی
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3">
                  <JalaliDateRangeFilter
                    value={performanceRange}
                    onChange={setPerformanceRange}
                    yearOptions={performanceYearOptions}
                  />
                </div>

                {isPerformanceLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : performanceError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {performanceError}
                  </div>
                ) : agentPerformance ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        {
                          label: 'مشتریان ثبت‌شده',
                          value: toPersianNum(agentPerformance.customerStats.registeredCustomersCount),
                        },
                        {
                          label: 'پرداخت‌شده',
                          value: toPersianNum(agentPerformance.customerStats.paidCustomersCount),
                        },
                        {
                          label: 'تایید نهایی‌شده',
                          value: toPersianNum(agentPerformance.customerStats.finalConfirmedCustomersCount),
                        },
                        {
                          label: 'برگشتی',
                          value: toPersianNum(agentPerformance.customerStats.returnedCustomersCount),
                        },
                        {
                          label: 'کل پورسانت',
                          value: formatPriceWithUnit(agentPerformance.commissionStats.totalCommissionAmount),
                        },
                        {
                          label: 'پورسانت در انتظار تایید',
                          value: formatPriceWithUnit(agentPerformance.commissionStats.pendingCommissionAmount),
                        },
                        {
                          label: 'پورسانت تاییدشده / قابل برداشت',
                          value: formatPriceWithUnit(
                            agentPerformance.commissionStats.approvedWithdrawableCommissionAmount
                          ),
                        },
                        {
                          label: 'پورسانت پرداخت‌شده',
                          value: formatPriceWithUnit(agentPerformance.commissionStats.paidCommissionAmount),
                        },
                        {
                          label: 'درخواست تسویه باز',
                          value: formatPriceWithUnit(agentPerformance.settlementStats.openSettlementAmount),
                        },
                        {
                          label: 'تسویه پرداخت‌شده',
                          value: formatPriceWithUnit(agentPerformance.settlementStats.paidSettlementAmount),
                        },
                      ].map((stat) => (
                        <div key={stat.label} className="min-w-0 rounded-lg border bg-background p-3">
                          <p className="text-xs leading-5 text-muted-foreground">{stat.label}</p>
                          <p className="mt-2 break-words text-sm font-semibold leading-7">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="min-w-0 rounded-lg border">
                        <div className="border-b p-3">
                          <h4 className="text-sm font-semibold">سوابق پورسانت</h4>
                        </div>
                        {agentPerformance.commissionRecords.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">
                            در این بازه پورسانتی برای این همکار فروش ثبت نشده است.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-right font-medium">مشتری</th>
                                  <th className="px-3 py-2 text-right font-medium">طرح</th>
                                  <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                                  <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                                  <th className="px-3 py-2 text-right font-medium">تاریخ ثبت</th>
                                </tr>
                              </thead>
                              <tbody>
                                {agentPerformance.commissionRecords.map((commission) => (
                                  <tr key={commission.key} className="border-t">
                                    <td className="px-3 py-2">{getCustomerName(commission.salesCustomer)}</td>
                                    <td className="px-3 py-2">{commission.plan.name}</td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                      {formatPriceWithUnit(commission.amount)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <StatusBadge
                                        status={commission.status}
                                        label={
                                          COMMISSION_STATUS_LABELS[commission.status] ||
                                          commission.status
                                        }
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {getDateOrDash(commission.createdAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 rounded-lg border">
                        <div className="border-b p-3">
                          <h4 className="text-sm font-semibold">سوابق تسویه</h4>
                        </div>
                        {agentPerformance.settlementRecords.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">
                            در این بازه درخواست تسویه‌ای برای این همکار فروش ثبت نشده است.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[460px] text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                                  <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                                  <th className="px-3 py-2 text-right font-medium">تاریخ درخواست</th>
                                  <th className="px-3 py-2 text-right font-medium">تاریخ پرداخت</th>
                                </tr>
                              </thead>
                              <tbody>
                                {agentPerformance.settlementRecords.map((settlement) => (
                                  <tr key={settlement.key} className="border-t">
                                    <td className="whitespace-nowrap px-3 py-2">
                                      {formatPriceWithUnit(settlement.amount)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <StatusBadge
                                        status={settlement.status}
                                        label={
                                          settlementStatusLabels[settlement.status] ||
                                          settlement.status
                                        }
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {getDateOrDash(settlement.requestedAt)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {getDateOrDash(settlement.settledAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    برای مشاهده عملکرد، همکار فروش را انتخاب کنید.
                  </p>
                )}
              </div>

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
