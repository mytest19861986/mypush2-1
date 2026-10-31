'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Ban,
  Eye,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { StatusBadge } from '@/components/shared'
import {
  JalaliDateRangeFilter,
  type JalaliDateRangeValue,
} from '@/components/shared/jalali-date-range-filter'
import { apiClient } from '@/lib/api-client'
import { rolesService, usersService } from '@/services'
import type { RoleItem, SafeRoleItem, UserItem } from '@/types'
import {
  toPersianNum,
  formatDateTime,
  formatJalaliDate,
  formatJalaliDateRange,
  formatPriceWithUnit,
  getDisplayName,
} from '@/utils/formatters'
import {
  getCurrentJalaliYearMonth,
  gregorianDateToJalaliParts,
  jalaliDatePartsToIsoDate,
} from '@/utils/jalali-date'
import {
  COMMISSION_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  USER_PLAN_STATUS_LABELS,
  USER_STATUS_LABELS,
} from '@/constants'

const PAGE_SIZE = 20
const PROTECTED_ROLE_NAMES = new Set(['USER', 'AGENT', 'DOCTOR', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])
const ROLE_SESSION_NOTICE = 'برای اعمال کامل دسترسی‌ها، کاربر باید دوباره وارد حساب شود.'

type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'

interface UserProfileSummary {
  range: {
    from: string
    to: string
  }
  user: {
    mobile: string
    status: string
    isMobileVerified: boolean
    createdAt: string
    profile: {
      firstName: string | null
      lastName: string | null
    } | null
    roles: Array<{
      name: string
      title: string
    }>
  }
  subscription: {
    activeSubscription: UserPlanSummary | null
    purchasedPlansCount: number
    totalPurchaseAmount: number
    purchases: UserPlanSummary[]
  }
  visits: {
    totalVisitsCount: number
    recentVisits: Array<{
      key: string
      status: string
      visitedAt: string | null
      confirmedAt: string | null
      completedAt: string | null
      createdAt: string
      doctor: {
        firstName: string | null
        lastName: string | null
        specialty: string | null
        clinicName: string | null
      }
    }>
  }
  referral: {
    referralCode: string | null
    referralLink: string | null
    totalReferredUsers: number
    successfulPurchasesFromReferrals: number
    commissionStats: {
      totalReferralCommissionAmount: number
      pendingReferralCommissionAmount: number
      approvedReferralCommissionAmount: number
      approvedWithdrawableReferralCommissionAmount: number
      paidReferralCommissionAmount: number
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
      userPlan: {
        status: string
        startDate: string
        endDate: string
        paymentStatus: string | null
      }
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
}

interface UserPlanSummary {
  key?: string
  planName: string
  status: string
  startDate: string
  endDate: string
  remainingUses: number
  totalUses: number
  paymentStatus: string | null
  amount: number
  paidAt: string | null
  createdAt?: string
}

const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تایید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
}

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  SUCCESS: 'موفق',
  FAILED: 'ناموفق',
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

function getFullName(profile?: { firstName: string | null; lastName: string | null } | null) {
  const firstName = profile?.firstName?.trim() ?? ''
  const lastName = profile?.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim() || '—'
}

function getDoctorName(doctor: UserProfileSummary['visits']['recentVisits'][number]['doctor']) {
  const name = getFullName(doctor)
  return name === '—' ? doctor.clinicName || 'پزشک' : name
}

function getPaymentStatusLabel(status?: string | null) {
  if (!status) return '—'
  return paymentStatusLabels[status] || status
}

function getPlanStatusLabel(status: string) {
  return USER_PLAN_STATUS_LABELS[status as keyof typeof USER_PLAN_STATUS_LABELS] || status
}

function getVisitStatusLabel(status: string) {
  return CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS] || status
}

function isProtectedRole(roleName: string) {
  return PROTECTED_ROLE_NAMES.has(roleName.toUpperCase())
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background p-3">
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-7">{value}</p>
    </div>
  )
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const currentJalaliMonth = useMemo(() => getCurrentJalaliYearMonth(), [])
  const [users, setUsers] = useState<UserItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [summary, setSummary] = useState<UserProfileSummary | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryRange, setSummaryRange] = useState<JalaliDateRangeValue>(() =>
    getRecentJalaliRange(30)
  )
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([])
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([])
  const [isRolesLoading, setIsRolesLoading] = useState(false)
  const [isRolesSaving, setIsRolesSaving] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSavedNotice, setRolesSavedNotice] = useState(false)

  const summaryYearOptions = useMemo(() => {
    const selectedYears = [summaryRange.from.year, summaryRange.to.year]
    const yearWindow = Array.from({ length: 12 }, (_, index) => currentJalaliMonth.year + 1 - index)
    return Array.from(new Set([...yearWindow, ...selectedYears])).sort((a, b) => b - a)
  }, [currentJalaliMonth.year, summaryRange])

  const selectedSummaryRangeText = useMemo(() => {
    try {
      const range = toIsoRange(summaryRange)
      return formatJalaliDateRange(range.from, range.to)
    } catch {
      return 'بازه تاریخ نامعتبر است'
    }
  }, [summaryRange])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: { page: number; limit: number; search?: string; status?: string } = {
        page,
        limit: PAGE_SIZE,
      }
      if (search) params.search = search
      if (statusFilter !== 'ALL') params.status = statusFilter

      const res = await usersService.getList(params)
      if (res.success && res.data) {
        setUsers(res.data)
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت لیست کاربران',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const fetchProfileSummary = useCallback(async (userId: string) => {
    setIsSummaryLoading(true)
    setSummaryError(null)
    try {
      const isoRange = toIsoRange(summaryRange)
      if (isoRange.from > isoRange.to) {
        throw new Error('تاریخ شروع باید قبل از تاریخ پایان باشد.')
      }

      const params = new URLSearchParams(isoRange)
      const res = await apiClient.get<UserProfileSummary>(
        `/admin/users/${userId}/profile-summary?${params.toString()}`
      )
      if (res.success && res.data) {
        setSummary(res.data)
      } else {
        throw new Error(res.error?.message || res.message || 'خطا در دریافت جزئیات کاربر')
      }
    } catch (error) {
      setSummary(null)
      setSummaryError(error instanceof Error ? error.message : 'خطا در دریافت جزئیات کاربر')
    } finally {
      setIsSummaryLoading(false)
    }
  }, [summaryRange])

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

  useEffect(() => {
    if (!selectedUser?.id) return
    void fetchProfileSummary(selectedUser.id)
  }, [fetchProfileSummary, selectedUser?.id])

  useEffect(() => {
    if (!selectedUser?.id) return
    void fetchAvailableRoles()
  }, [fetchAvailableRoles, selectedUser?.id])

  useEffect(() => {
    if (!summary) {
      setSelectedRoleNames([])
      return
    }
    setSelectedRoleNames(summary.user.roles.map((role) => role.name))
  }, [summary])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleViewDetail = (user: UserItem) => {
    setSummaryRange(getRecentJalaliRange(30))
    setSelectedUser(user)
    setSummary(null)
    setSummaryError(null)
    setRolesError(null)
    setRolesSavedNotice(false)
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
    if (!selectedUser?.id) return
    setIsRolesSaving(true)
    try {
      const result = await rolesService.updateUserRoles(selectedUser.id, selectedRoleNames)
      const updatedRoles: SafeRoleItem[] = result.roles
      setSelectedRoleNames(updatedRoles.map((role) => role.name))
      setSummary((current) =>
        current ? { ...current, user: { ...current.user, roles: updatedRoles } } : current
      )
      setRolesSavedNotice(true)
      toast({ title: 'موفق', description: `نقش‌های کاربر با موفقیت ذخیره شد. ${ROLE_SESSION_NOTICE}` })
      await Promise.all([fetchUsers(), fetchProfileSummary(selectedUser.id)])
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

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setChangingId(userId)
    try {
      await usersService.changeStatus(userId, newStatus)
      toast({
        title: 'موفق',
        description: `وضعیت کاربر به «${USER_STATUS_LABELS[newStatus as keyof typeof USER_STATUS_LABELS] || newStatus}» تغییر یافت`,
      })
      fetchUsers()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تغییر وضعیت کاربر',
        variant: 'destructive',
      })
    } finally {
      setChangingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await usersService.delete(deleteTarget.id)
      toast({ title: 'موفق', description: 'کاربر با موفقیت حذف شد' })
      setDeleteTarget(null)
      fetchUsers()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در حذف کاربر',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const visibleStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const visibleEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">مدیریت کاربران</h1>
            <Badge variant="secondary">{toPersianNum(total)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            مشاهده، جستجو و مدیریت وضعیت کاربران سامانه
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5">
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch(searchInput)
          }}
        >
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجو بر اساس شماره موبایل، نام یا ایمیل..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
              <SelectItem value="ACTIVE">فعال</SelectItem>
              <SelectItem value="INACTIVE">غیرفعال</SelectItem>
              <SelectItem value="BLOCKED">مسدود</SelectItem>
            </SelectContent>
          </Select>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="border-b bg-transparent">
              <tr>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">موبایل</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">نام</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">ایمیل</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">وضعیت</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">طرح فعال</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">نقش‌ها</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">تاریخ</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td colSpan={8} className="px-4 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    کاربری یافت نشد
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="group border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-4 font-mono text-sm text-foreground">{user.mobile}</td>
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{getDisplayName(user)}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{user.email || '—'}</td>
                    <td className="px-4 py-4 text-sm"><StatusBadge status={user.status} className="font-medium" /></td>
                    <td className="px-4 py-4 text-sm">
                      {user.activePlanName ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.activePlanName}</p>
                          {user.activePlanEndDate && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              تا {formatJalaliDate(user.activePlanEndDate)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">بدون طرح فعال</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className="border-border/70 bg-background text-xs font-medium"
                            >
                              {role.title || role.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="border-border/70 bg-background text-xs font-medium">
                            کاربر
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{formatJalaliDate(user.createdAt)}</td>
                    <td className="px-4 py-4 text-left text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(user)}
                          disabled={isSummaryLoading}
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
                              className="size-8 hover:bg-background"
                              aria-label="عملیات کاربر"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(user)}>
                              <Eye className="ml-2 size-4" />
                              مشاهده جزئیات
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                              disabled={changingId === user.id || user.status === 'ACTIVE'}
                            >
                              <UserCheck className="ml-2 size-4 text-emerald-600" />
                              فعال‌سازی
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'INACTIVE')}
                              disabled={changingId === user.id || user.status === 'INACTIVE'}
                            >
                              <UserX className="ml-2 size-4 text-amber-600" />
                              غیرفعال‌سازی
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'BLOCKED')}
                              disabled={changingId === user.id || user.status === 'BLOCKED'}
                            >
                              <Ban className="ml-2 size-4 text-red-600" />
                              مسدود کردن
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="ml-2 size-4" />
                              حذف
                            </DropdownMenuItem>
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
        <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            نمایش {toPersianNum(visibleStart)} تا {toPersianNum(visibleEnd)} از {toPersianNum(total)} کاربر
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              قبلی
            </Button>
            <span className="min-w-16 text-center">
              {toPersianNum(page)} / {toPersianNum(totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!selectedUser || isSummaryLoading}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null)
            setSummary(null)
            setSummaryError(null)
            setSelectedRoleNames([])
            setRolesError(null)
            setRolesSavedNotice(false)
          }
        }}
      >
        <DialogContent className="max-h-[86vh] max-w-6xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>جزئیات کاربر</DialogTitle>
          </DialogHeader>

          {isSummaryLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : summaryError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {summaryError}
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">نام و نام خانوادگی: </span>
                    <span>{getFullName(summary.user.profile)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">موبایل: </span>
                    <span className="font-mono">{summary.user.mobile}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">وضعیت حساب: </span>
                    <StatusBadge status={summary.user.status} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاریخ ثبت‌نام: </span>
                    <span>{formatJalaliDate(summary.user.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تأیید موبایل: </span>
                    <Badge variant={summary.user.isMobileVerified ? 'default' : 'outline'}>
                      {summary.user.isMobileVerified ? 'تأیید شده' : 'تأیید نشده'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نقش‌ها: </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {summary.user.roles.length > 0 ? (
                        summary.user.roles.map((role) => (
                          <Badge
                            key={`${role.name}-${role.title}`}
                            variant="outline"
                            className="h-auto max-w-full whitespace-normal text-xs leading-6"
                          >
                            {role.title || role.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <h3 className="font-semibold">مدیریت نقش‌ها</h3>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      فقط نقش‌های دسترسی قابل تغییر هستند و نقش‌های پایه محافظت می‌شوند.
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {summary.user.roles.length > 0 ? (
                    summary.user.roles.map((role) => (
                      <Badge
                        key={`${role.name}-${role.title}`}
                        variant="outline"
                        className="h-auto max-w-full whitespace-normal text-xs leading-6"
                      >
                        {role.title || role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">نقشی برای این کاربر ثبت نشده است.</span>
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
                    disabled={isRolesSaving || isRolesLoading || Boolean(rolesError) || availableRoles.length === 0}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {isRolesSaving ? 'در حال ذخیره...' : 'ذخیره نقش‌ها'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">خلاصه کاربر و همکار معرفی / رفرال</h3>
                    <p className="text-xs leading-6 text-muted-foreground">
                      بازه انتخابی: {selectedSummaryRangeText}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSummaryRange(getRecentJalaliRange(30))}
                      disabled={isSummaryLoading}
                    >
                      بازنشانی بازه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectedUser?.id && void fetchProfileSummary(selectedUser.id)}
                      disabled={isSummaryLoading}
                    >
                      <RefreshCw className="ml-1.5 size-4" />
                      به‌روزرسانی
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3">
                  <JalaliDateRangeFilter
                    value={summaryRange}
                    onChange={setSummaryRange}
                    yearOptions={summaryYearOptions}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryStat
                    label="طرح‌های خریداری‌شده"
                    value={toPersianNum(summary.subscription.purchasedPlansCount)}
                  />
                  <SummaryStat
                    label="جمع خریدهای موفق"
                    value={formatPriceWithUnit(summary.subscription.totalPurchaseAmount)}
                  />
                  <SummaryStat
                    label="کل ویزیت‌ها"
                    value={toPersianNum(summary.visits.totalVisitsCount)}
                  />
                  <SummaryStat
                    label="کاربران معرفی‌شده"
                    value={toPersianNum(summary.referral.totalReferredUsers)}
                  />
                  <SummaryStat
                    label="خریدهای موفق از رفرال"
                    value={toPersianNum(summary.referral.successfulPurchasesFromReferrals)}
                  />
                  <SummaryStat
                    label="کل پورسانت رفرال در بازه"
                    value={formatPriceWithUnit(
                      summary.referral.commissionStats.totalReferralCommissionAmount
                    )}
                  />
                  <SummaryStat
                    label="پورسانت در انتظار"
                    value={formatPriceWithUnit(
                      summary.referral.commissionStats.pendingReferralCommissionAmount
                    )}
                  />
                  <SummaryStat
                    label="پورسانت قابل برداشت"
                    value={formatPriceWithUnit(
                      summary.referral.commissionStats.approvedWithdrawableReferralCommissionAmount
                    )}
                  />
                  <SummaryStat
                    label="پورسانت پرداخت‌شده"
                    value={formatPriceWithUnit(
                      summary.referral.commissionStats.paidReferralCommissionAmount
                    )}
                  />
                  <SummaryStat
                    label="درخواست تسویه باز"
                    value={formatPriceWithUnit(summary.referral.settlementStats.openSettlementAmount)}
                  />
                  <SummaryStat
                    label="تسویه پرداخت‌شده"
                    value={formatPriceWithUnit(summary.referral.settlementStats.paidSettlementAmount)}
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">اشتراک و خریدها</h3>
                  <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                    {summary.subscription.activeSubscription ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">طرح فعال: </span>
                          <span>{summary.subscription.activeSubscription.planName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">پایان اعتبار: </span>
                          <span>{formatJalaliDate(summary.subscription.activeSubscription.endDate)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">وضعیت پرداخت: </span>
                          <span>{getPaymentStatusLabel(summary.subscription.activeSubscription.paymentStatus)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">مبلغ: </span>
                          <span>{formatPriceWithUnit(summary.subscription.activeSubscription.amount)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">طرح فعالی برای این کاربر ثبت نشده است.</p>
                    )}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    {summary.subscription.purchases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">خریدی برای این کاربر ثبت نشده است.</p>
                    ) : (
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-right font-medium">طرح</th>
                            <th className="px-3 py-2 text-right font-medium">وضعیت طرح</th>
                            <th className="px-3 py-2 text-right font-medium">وضعیت پرداخت</th>
                            <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                            <th className="px-3 py-2 text-right font-medium">شروع</th>
                            <th className="px-3 py-2 text-right font-medium">پایان</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.subscription.purchases.map((purchase) => (
                            <tr key={purchase.key} className="border-t">
                              <td className="px-3 py-2">{purchase.planName}</td>
                              <td className="px-3 py-2">{getPlanStatusLabel(purchase.status)}</td>
                              <td className="px-3 py-2">{getPaymentStatusLabel(purchase.paymentStatus)}</td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {formatPriceWithUnit(purchase.amount)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {formatJalaliDate(purchase.startDate)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {formatJalaliDate(purchase.endDate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">ویزیت‌ها</h3>
                  <div className="mt-4 overflow-x-auto">
                    {summary.visits.recentVisits.length === 0 ? (
                      <p className="text-sm text-muted-foreground">در این بازه ویزیتی برای این کاربر ثبت نشده است.</p>
                    ) : (
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-right font-medium">پزشک</th>
                            <th className="px-3 py-2 text-right font-medium">تخصص</th>
                            <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                            <th className="px-3 py-2 text-right font-medium">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.visits.recentVisits.map((visit) => (
                            <tr key={visit.key} className="border-t">
                              <td className="px-3 py-2">{getDoctorName(visit.doctor)}</td>
                              <td className="px-3 py-2">{visit.doctor.specialty || '—'}</td>
                              <td className="px-3 py-2">{getVisitStatusLabel(visit.status)}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {getDateOrDash(
                                  visit.visitedAt ||
                                    visit.completedAt ||
                                    visit.confirmedAt ||
                                    visit.createdAt
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">همکار معرفی / رفرال</h3>
                <div className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">کد معرفی: </span>
                    <span className="font-mono">{summary.referral.referralCode || '—'}</span>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">لینک معرفی: </span>
                    <span className="break-all font-mono">{summary.referral.referralLink || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="min-w-0 rounded-lg border">
                  <div className="border-b p-3">
                    <h4 className="text-sm font-semibold">سوابق پورسانت رفرال</h4>
                  </div>
                  {summary.referral.commissionRecords.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      در این بازه پورسانت رفرالی برای این کاربر ثبت نشده است.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-right font-medium">طرح</th>
                            <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                            <th className="px-3 py-2 text-right font-medium">درصد</th>
                            <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                            <th className="px-3 py-2 text-right font-medium">تاریخ ثبت</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.referral.commissionRecords.map((commission) => (
                            <tr key={commission.key} className="border-t">
                              <td className="px-3 py-2">{commission.plan.name}</td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {formatPriceWithUnit(commission.amount)}
                              </td>
                              <td className="px-3 py-2">{toPersianNum(commission.percent)}٪</td>
                              <td className="px-3 py-2">
                                <StatusBadge
                                  status={commission.status}
                                  label={COMMISSION_STATUS_LABELS[commission.status] || commission.status}
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
                  {summary.referral.settlementRecords.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      در این بازه درخواست تسویه‌ای برای این کاربر ثبت نشده است.
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
                          {summary.referral.settlementRecords.map((settlement) => (
                            <tr key={settlement.key} className="border-t">
                              <td className="whitespace-nowrap px-3 py-2">
                                {formatPriceWithUnit(settlement.amount)}
                              </td>
                              <td className="px-3 py-2">
                                <StatusBadge
                                  status={settlement.status}
                                  label={settlementStatusLabels[settlement.status] || settlement.status}
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

              <Separator />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف کاربر <strong>{deleteTarget?.mobile}</strong> اطمینان دارید؟ این عمل
              قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-start">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'در حال حذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
