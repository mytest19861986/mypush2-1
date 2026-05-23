'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { PageHeader, SearchFilterBar, StatusBadge } from '@/components/shared'
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
        description={
          <>
            مشاهده و مدیریت تمامی کاربران سامانه —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            کاربر
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="جستجو بر اساس شماره موبایل، نام یا ایمیل..."
        onSearch={handleSearch}
        filterOptions={[
          { value: 'ALL', label: 'همه وضعیت‌ها' },
          { value: 'ACTIVE', label: 'فعال' },
          { value: 'INACTIVE', label: 'غیرفعال' },
          { value: 'BLOCKED', label: 'مسدود' },
        ]}
        filterValue={statusFilter}
        onFilterChange={(v) => {
          setStatusFilter(v)
          setPage(1)
        }}
      />

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-sm">موبایل</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">نام</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">ایمیل</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">وضعیت</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">نقش‌ها</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">تاریخ</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  کاربری یافت نشد
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/30 group transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{user.mobile}</td>
                  <td className="px-4 py-3 font-medium text-sm">{getDisplayName(user)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email || '—'}</td>
                  <td className="px-4 py-3 text-sm"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        کاربر عادی
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
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