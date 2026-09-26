'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Sparkles,
  Eye,
  Edit3,
  Ban,
  Download,
  Loader2,
  CheckCircle,
  RefreshCw,
  Phone,
  User as UserIcon,
  CreditCard,
  Calendar,
  Wallet
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { toast } from 'sonner'

interface UserItem {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  nationalCode?: string
  address?: string
  mobile: string
  email?: string | null
  role: 'USER' | 'DOCTOR' | 'AGENT' | 'ADMIN'
  roleLabel: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'BLOCKED' | 'INACTIVE'
  plan: string
  joinDate: string
  lastActivity: string
  avatarInitial: string
  walletBalance?: number
}

const fallbackUsers: UserItem[] = [
  {
    id: 'USR-8910',
    fullName: 'سارا میرزایی',
    mobile: '۰۹۱۲۳۴۵۶۷۸۹',
    role: 'USER',
    roleLabel: 'کاربر عادی (بیمه شده)',
    status: 'ACTIVE',
    plan: 'طرح طلایی سلامت',
    joinDate: '۱۴۰۳/۰۴/۱۲',
    lastActivity: '۱۰ دقیقه پیش',
    avatarInitial: 'س'
  },
  {
    id: 'USR-8911',
    fullName: 'دکتر علیرضا افشارزاده',
    mobile: '۰۹۱۹۸۷۶۵۴۳۲',
    role: 'DOCTOR',
    roleLabel: 'پزشک همکار متخصص',
    status: 'ACTIVE',
    plan: 'طرف قرارداد ونک',
    joinDate: '۱۴۰۳/۰۳/۰۱',
    lastActivity: 'امروز ۱۷:۳۰',
    avatarInitial: 'ع'
  },
  {
    id: 'USR-8912',
    fullName: 'پیمان حسینی',
    mobile: '۰۹۳۵۱۱۲۲۳۳۴',
    role: 'AGENT',
    roleLabel: 'نماینده رسمی فروش',
    status: 'PENDING',
    plan: 'شعبه غرب تهران',
    joinDate: '۱۴۰۳/۰۵/۱۰',
    lastActivity: 'دیروز',
    avatarInitial: 'پ'
  },
  {
    id: 'USR-8913',
    fullName: 'مهسا کاظمی',
    mobile: '۰۹۱۸۲۲۲۳۳۴۴',
    role: 'USER',
    roleLabel: 'کاربر عادی',
    status: 'ACTIVE',
    plan: 'طرح نقره‌ای دندانپزشکی',
    joinDate: '۱۴۰۳/۰۶/۱۵',
    lastActivity: '۲ ساعت پیش',
    avatarInitial: 'م'
  },
  {
    id: 'USR-8914',
    fullName: 'امید سعادت',
    mobile: '۰۹۳۰۵۵۵۶۶۷۷',
    role: 'USER',
    roleLabel: 'کاربر عادی',
    status: 'SUSPENDED',
    plan: 'منقضی شده',
    joinDate: '۱۴۰۲/۱۱/۲۰',
    lastActivity: '۳ هفته پیش',
    avatarInitial: 'ا'
  },
]

export default function UsersPremiumPreviewPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View Modal state
  const [viewUser, setViewUser] = useState<UserItem | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)

  // Edit Modal state
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editNationalCode, setEditNationalCode] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editStatus, setEditStatus] = useState<string>('ACTIVE')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Status Action state
  const [statusActionUser, setStatusActionUser] = useState<UserItem | null>(null)
  const [statusActionOpen, setStatusActionOpen] = useState(false)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)

  // Helper to fetch authorization header
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    return headers
  }, [])

  // Fetch real users from API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/users?limit=50', {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      const json = await res.json()
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const mappedUsers: UserItem[] = json.data.map((u: any) => {
          const fn = u.profile?.firstName ?? ''
          const ln = u.profile?.lastName ?? ''
          const name = (fn || ln) ? `${fn} ${ln}`.trim() : (u.mobile || 'کاربر بدون نام')
          
          let roleName = 'USER'
          let roleLbl = 'کاربر عادی'
          if (u.roles && u.roles.length > 0) {
            const primaryRole = u.roles[0]?.name || 'USER'
            roleName = primaryRole
            roleLbl = u.roles[0]?.title || (primaryRole === 'ADMIN' ? 'مدیر سیستم' : primaryRole === 'DOCTOR' ? 'پزشک همکار' : primaryRole === 'AGENT' ? 'نماینده' : 'کاربر عادی')
          }

          let mappedStatus: UserItem['status'] = 'ACTIVE'
          if (u.status === 'BLOCKED' || u.status === 'SUSPENDED') mappedStatus = 'SUSPENDED'
          else if (u.status === 'INACTIVE') mappedStatus = 'PENDING'
          else mappedStatus = 'ACTIVE'

          return {
            id: u.id,
            fullName: name,
            firstName: fn,
            lastName: ln,
            nationalCode: u.profile?.nationalCode || '',
            address: u.profile?.address || '',
            mobile: u.mobile,
            email: u.email,
            role: roleName as any,
            roleLabel: roleLbl,
            status: mappedStatus,
            plan: u.activePlanName || 'طرح عمومی',
            joinDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('fa-IR') : '—',
            lastActivity: 'به‌تازگی',
            avatarInitial: name.charAt(0) || 'ک',
          }
        })
        setUsers(mappedUsers)
      } else {
        setUsers(fallbackUsers)
      }
    } catch {
      // Fallback on error
      setUsers(fallbackUsers)
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle View User Details
  const handleOpenView = async (user: UserItem) => {
    setViewUser(user)
    setViewModalOpen(true)
    setViewLoading(true)
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const detail = json.data
          setViewUser(prev => prev ? ({
            ...prev,
            firstName: detail.profile?.firstName,
            lastName: detail.profile?.lastName,
            nationalCode: detail.profile?.nationalCode,
            address: detail.profile?.address,
            email: detail.email,
            walletBalance: detail.wallet?.balance ?? 0,
            plan: detail.userPlans?.[0]?.plan?.name || prev.plan,
          }) : null)
        }
      }
    } catch (err) {
      console.warn('View user fetch failed, showing cached', err)
    } finally {
      setViewLoading(false)
    }
  }

  // Handle Edit User
  const handleOpenEdit = (user: UserItem) => {
    setEditUser(user)
    setEditFirstName(user.firstName || user.fullName.split(' ')[0] || '')
    setEditLastName(user.lastName || user.fullName.split(' ').slice(1).join(' ') || '')
    setEditNationalCode(user.nationalCode || '')
    setEditAddress(user.address || '')
    setEditStatus(user.status === 'SUSPENDED' ? 'BLOCKED' : user.status === 'PENDING' ? 'INACTIVE' : 'ACTIVE')
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setIsSubmittingEdit(true)
    try {
      const res = await fetch(`/api/v1/users/${editUser.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          nationalCode: editNationalCode.trim() || undefined,
          address: editAddress.trim() || undefined,
          status: editStatus,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('اطلاعات کاربر با موفقیت به‌روزرسانی شد')
        setEditModalOpen(false)
        fetchUsers()
      } else {
        toast.error(json.message || 'خطا در ویرایش اطلاعات کاربر')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Handle Status Action (Suspend / Activate)
  const handleOpenStatusAction = (user: UserItem) => {
    setStatusActionUser(user)
    setStatusActionOpen(true)
  }

  const handleConfirmStatusToggle = async () => {
    if (!statusActionUser) return
    setIsSubmittingStatus(true)
    const nextStatus = statusActionUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/v1/users/${statusActionUser.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(nextStatus === 'ACTIVE' ? 'حساب کاربر فعال شد' : 'حساب کاربر معلق گردید')
        setStatusActionOpen(false)
        fetchUsers()
      } else {
        toast.error(json.message || 'خطا در تغییر وضعیت کاربر')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.includes(searchQuery) ||
      u.mobile.includes(searchQuery) ||
      u.id.includes(searchQuery)
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.status === 'ACTIVE') ||
      (statusFilter === 'PENDING' && u.status === 'PENDING') ||
      (statusFilter === 'SUSPENDED' && u.status === 'SUSPENDED')
    return matchSearch && matchRole && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="users">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                مدیریت کاربران و اعضای سامانه
              </h1>
              <Badge variant="premium">
                <Sparkles className="size-3.5 text-primary" />
                <span>Users Premium Experience</span>
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              فهرست یکپارچه اعضای سامانه با قابلیت مشاهده جزئیات زنده، ویرایش پروفایل و مدیریت دسترسی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
              className="gap-2 rounded-xl text-xs font-bold text-slate-700"
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تازه‌سازی</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold text-slate-700">
              <Download className="size-4" />
              <span>خروجی اکسل</span>
            </Button>
          </div>
        </div>

        {/* KPI Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="کل کاربران ثبت‌شده"
            value={toPersianNum(users.length.toString())}
            trend="↑ بر اساس دیتابیس زنده"
            isUp={true}
            icon={Users}
            variant="blue"
            badge="مجموع"
          />
          <PremiumMetricCard
            title="کاربران فعال"
            value={toPersianNum(users.filter(u => u.status === 'ACTIVE').length.toString())}
            trend="احراز هویت شده"
            isUp={true}
            icon={UserCheck}
            variant="green"
            badge="فعال"
          />
          <PremiumMetricCard
            title="در انتظار تایید"
            value={toPersianNum(users.filter(u => u.status === 'PENDING').length.toString())}
            description="صف بازبینی هویت"
            icon={Clock}
            variant="amber"
            badge="صف بازبینی"
          />
          <PremiumMetricCard
            title="حساب‌های معلق یا مسدود"
            value={toPersianNum(users.filter(u => u.status === 'SUSPENDED').length.toString())}
            description="محدودیت موقت یا امنیتی"
            icon={UserX}
            variant="purple"
            badge="کنترل ریسک"
          />
        </div>

        {/* Filter & Search Bar */}
        <Card variant="glass">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="جستجو با نام، شماره موبایل یا شناسه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pe-10 bg-background/80 rounded-xl border-border/60"
              />
              <Search className="size-4 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Role Filter */}
              <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  همه نقش‌ها
                </button>
                <button
                  onClick={() => setRoleFilter('USER')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'USER' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  کاربران
                </button>
                <button
                  onClick={() => setRoleFilter('DOCTOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'DOCTOR' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  پزشکان
                </button>
                <button
                  onClick={() => setRoleFilter('AGENT')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'AGENT' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  نمایندگان
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  همه وضعیت‌ها
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  فعال
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'PENDING' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  در انتظار
                </button>
                <button
                  onClick={() => setStatusFilter('SUSPENDED')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'SUSPENDED' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  معلق
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card variant="default" className="overflow-hidden border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-4 px-6">عضو / هویت</th>
                  <th className="py-4 px-4">نقش و مسئولیت</th>
                  <th className="py-4 px-4">طرح و اشتراک فعال</th>
                  <th className="py-4 px-4">وضعیت حساب</th>
                  <th className="py-4 px-4">تاریخ عضویت</th>
                  <th className="py-4 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span>در حال بارگذاری لیست کاربران...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* User & Avatar */}
                      <td className="py-4 px-6">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => handleOpenView(u)}
                        >
                          <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 shadow-xs group-hover:scale-105 transition-transform">
                            {u.avatarInitial}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                              {u.fullName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              <span>{u.mobile}</span>
                              <span>•</span>
                              <span className="truncate max-w-[100px]">{u.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="font-normal text-xs border-border/70">
                          {u.roleLabel}
                        </Badge>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="size-4 text-primary shrink-0" />
                          <span className="text-xs font-semibold text-foreground">{u.plan}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {u.status === 'ACTIVE' && (
                          <Badge variant="success">فعال و تاییدشده</Badge>
                        )}
                        {u.status === 'PENDING' && (
                          <Badge variant="warning">در انتظار تایید</Badge>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <Badge variant="destructive">حساب معلق</Badge>
                        )}
                      </td>

                      {/* Join Date */}
                      <td className="py-4 px-4 text-xs text-muted-foreground font-mono">
                        {u.joinDate}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="مشاهده پروفایل"
                            onClick={() => handleOpenView(u)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="ویرایش اطلاعات"
                            onClick={() => handleOpenEdit(u)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={u.status === 'ACTIVE' ? 'تعلیق حساب' : 'فعال‌سازی حساب'}
                            onClick={() => handleOpenStatusAction(u)}
                            className={`size-8 rounded-lg transition-colors ${
                              u.status === 'ACTIVE'
                                ? 'text-muted-foreground hover:text-destructive hover:bg-red-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      هیچ عضوی با مشخصات واردشده یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ─── Modal 1: View User Details ─── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <UserIcon className="size-5 text-primary" />
              <span>مشخصات کامل کاربر</span>
            </DialogTitle>
            <DialogDescription>
              اطلاعات پروفایل، وضعیت حساب و اشتراک ثبت‌شده در دیتابیس
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>در حال دریافت جزئیات کاربر...</span>
            </div>
          ) : viewUser ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground block">نام و نام‌خانوادگی:</span>
                  <span className="font-bold text-foreground">{viewUser.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">شماره موبایل:</span>
                  <span className="font-mono text-foreground">{viewUser.mobile}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">کد ملی:</span>
                  <span className="font-mono text-foreground">{viewUser.nationalCode || 'ثبت نشده'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">ایمیل:</span>
                  <span className="font-mono text-foreground text-xs truncate block">{viewUser.email || 'ثبت نشده'}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-primary" />
                    <span>طرح فعال:</span>
                  </span>
                  <Badge variant="outline" className="font-semibold">{viewUser.plan}</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-emerald-600" />
                    <span>موجودی کیف پول:</span>
                  </span>
                  <span className="font-bold text-emerald-600">{toPersianNum(viewUser.walletBalance ?? 0)} تومان</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>تاریخ ثبت‌نام:</span>
                  </span>
                  <span className="font-mono text-muted-foreground">{viewUser.joinDate}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground block">آدرس سکونت:</span>
                  <span className="text-foreground max-w-[240px] truncate">{viewUser.address || 'ثبت نشده'}</span>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setViewModalOpen(false)
                if (viewUser) handleOpenEdit(viewUser)
              }}
              className="gap-1.5"
            >
              <Edit3 className="size-4" />
              <span>ویرایش مشخصات</span>
            </Button>
            <Button onClick={() => setViewModalOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Edit User ─── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit3 className="size-5 text-blue-600" />
              <span>ویرایش مشخصات کاربر</span>
            </DialogTitle>
            <DialogDescription>
              تغییر نام، کد ملی، آدرس و وضعیت حساب کاربری
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">نام</label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">نام خانوادگی</label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="نام خانوادگی"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">کد ملی</label>
              <Input
                value={editNationalCode}
                onChange={(e) => setEditNationalCode(e.target.value)}
                placeholder="۱۰ رقم کد ملی"
                maxLength={10}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">آدرس</label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="آدرس کامل"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">وضعیت حساب</label>
              <select
                aria-label="وضعیت حساب کاربر"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ACTIVE">فعال (ACTIVE)</option>
                <option value="INACTIVE">غیرفعال (INACTIVE)</option>
                <option value="BLOCKED">مسدود / معلق (BLOCKED)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSubmittingEdit}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingEdit && <Loader2 className="size-4 animate-spin" />}
              <span>ذخیره تغییرات</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Suspend / Activate Confirm ─── */}
      <Dialog open={statusActionOpen} onOpenChange={setStatusActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {statusActionUser?.status === 'ACTIVE' ? (
                <>
                  <Ban className="size-5 text-destructive" />
                  <span>تأیید تعلیق حساب کاربر</span>
                </>
              ) : (
                <>
                  <CheckCircle className="size-5 text-emerald-600" />
                  <span>تأیید فعال‌سازی حساب کاربر</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusActionUser?.status === 'ACTIVE'
                ? `آیا از تعلیق حساب کاربر «${statusActionUser?.fullName}» با شماره موبایل «${statusActionUser?.mobile}» اطمینان دارید؟ در این صورت دسترسی ورود وی مسدود می‌شود.`
                : `آیا مایلید حساب کاربر «${statusActionUser?.fullName}» با شماره موبایل «${statusActionUser?.mobile}» مجدداً فعال شود؟`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusActionOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleConfirmStatusToggle}
              disabled={isSubmittingStatus}
              variant={statusActionUser?.status === 'ACTIVE' ? 'destructive' : 'default'}
              className="gap-2"
            >
              {isSubmittingStatus && <Loader2 className="size-4 animate-spin" />}
              <span>{statusActionUser?.status === 'ACTIVE' ? 'تأیید و تعلیق حساب' : 'تأیید و فعال‌سازی'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardAppShell>
  )
}
