'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Ban,
  Users,
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
import { PageHeader, StatusBadge } from '@/components/shared'
import { usersService } from '@/services'
import type { UserItem } from '@/types'
import { toPersianNum, formatDate, getDisplayName } from '@/utils/formatters'
import { USER_STATUS_LABELS } from '@/constants'

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
        limit: 20,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت کاربران"
        description="مشاهده، جستجو و مدیریت وضعیت کاربران سامانه"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">تعداد کاربران</p>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">{toPersianNum(total)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full gap-2 md:max-w-sm">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس شماره موبایل، نام یا ایمیل..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchInput)}
                className="pr-10"
              />
            </div>
            <Button onClick={() => handleSearch(searchInput)} variant="secondary" className="shrink-0">
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
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
              <SelectItem value="ACTIVE">فعال</SelectItem>
              <SelectItem value="INACTIVE">غیرفعال</SelectItem>
              <SelectItem value="BLOCKED">مسدود</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b bg-muted/70">
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
