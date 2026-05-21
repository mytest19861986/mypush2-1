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
import { PageHeader, SearchFilterBar, DataTable, StatusBadge } from '@/components/shared'
import { usersService } from '@/services'
import type { UserItem } from '@/types'
import type { Column } from '@/components/shared'
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

  const columns: Column<UserItem>[] = [
    {
      key: 'mobile',
      header: 'موبایل',
      render: (row) => (
        <span className="font-mono text-sm">{row.mobile}</span>
      ),
    },
    {
      key: 'profile',
      header: 'نام',
      render: (row) => {
        const name = getDisplayName(row as unknown as { profile: { firstName: string | null; lastName: string | null } | null; mobile: string })
        return <span className="font-medium">{name !== 'کاربر' ? name : '—'}</span>
      },
    },
    {
      key: 'email',
      header: 'ایمیل',
      hiddenOn: 'md',
      render: (row) => (
        <span className="max-w-[180px] truncate text-sm text-muted-foreground">
          {row.email || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'roles',
      header: 'نقش‌ها',
      hiddenOn: 'lg',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role.id} variant="outline" className="text-xs">
              {role.title}
            </Badge>
          ))}
          {row.roles.length === 0 && (
            <span className="text-xs text-muted-foreground">بدون نقش</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      hiddenOn: 'sm',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
  ]

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

      <DataTable<UserItem>
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="کاربری یافت نشد"
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
              <DropdownMenuItem
                onClick={() => handleStatusChange(row.id, 'ACTIVE')}
                disabled={changingId === row.id || row.status === 'ACTIVE'}
              >
                <UserCheck className="ml-2 size-4 text-emerald-600" />
                فعال‌سازی
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(row.id, 'INACTIVE')}
                disabled={changingId === row.id || row.status === 'INACTIVE'}
              >
                <UserX className="ml-2 size-4 text-amber-600" />
                غیرفعال‌سازی
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(row.id, 'BLOCKED')}
                disabled={changingId === row.id || row.status === 'BLOCKED'}
              >
                <Ban className="ml-2 size-4 text-red-600" />
                مسدود کردن
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 className="ml-2 size-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Delete confirmation */}
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
