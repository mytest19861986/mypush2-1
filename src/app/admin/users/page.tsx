'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { usersService } from '@/services'
import type { UserItem } from '@/types'
import { toPersianNum, formatDate, getDisplayName } from '@/utils/formatters'
import { USER_STATUS_LABELS } from '@/constants'

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const { toast } = useToast()
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

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
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
          <table className="w-full min-w-[760px]">
            <thead className="bg-transparent border-b">
              <tr>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">موبایل</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">نام</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">ایمیل</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">وضعیت</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">نقش‌ها</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-foreground">تاریخ</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td colSpan={7} className="px-4 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="border-border/70 bg-background text-xs font-medium">
                          کاربر عادی
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-4 text-left text-sm">
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف کاربر{' '}
              <strong>{deleteTarget?.mobile}</strong> اطمینان دارید؟ این عمل
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
