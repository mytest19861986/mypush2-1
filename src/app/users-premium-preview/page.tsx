'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  MoreVertical,
  ShieldCheck,
  Sparkles,
  Phone,
  Calendar,
  CreditCard,
  Eye,
  Edit3,
  Ban,
  ArrowUpDown,
  Download
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'

interface UserItemMock {
  id: string
  fullName: string
  mobile: string
  role: 'USER' | 'DOCTOR' | 'AGENT' | 'ADMIN'
  roleLabel: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  plan: string
  joinDate: string
  lastActivity: string
  avatarInitial: string
}

export default function UsersPremiumPreviewPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const users: UserItemMock[] = [
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

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.fullName.includes(searchQuery) || u.mobile.includes(searchQuery) || u.id.includes(searchQuery)
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="users">
      <div className="space-y-8">
        {/* ─── Header ─── */}
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
              فهرست یکپارچه کاربران، پزشکان و نمایندگان به همراه تله‌متری اشتراک‌ها و وضعیت اعتبارسنجی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold text-slate-700">
              <Download className="size-4" />
              <span>خروجی اکسل</span>
            </Button>
            <Button variant="premium" size="sm" className="gap-2 rounded-xl text-xs font-bold shadow-xs">
              <ShieldCheck className="size-4" />
              <span>ثبت کاربر جدید</span>
            </Button>
          </div>
        </div>

        {/* ─── KPI Stats Section ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PremiumMetricCard
            title="کل کاربران ثبت‌شده"
            value="۲,۸۴۵"
            trend="↑ ۱۲.۴٪ رشد ماهانه"
            isUp={true}
            icon={Users}
            variant="blue"
            badge="مجموع"
          />
          <PremiumMetricCard
            title="کاربران فعال با اشتراک"
            value="۲,۱۹۰"
            trend="۷۶.۹٪ نرخ فعال"
            isUp={true}
            icon={UserCheck}
            variant="green"
            badge="احراز شده"
          />
          <PremiumMetricCard
            title="در انتظار تکمیل مدارک"
            value="۵۱۲"
            description="صف بازبینی اپراتور"
            icon={Clock}
            variant="amber"
            badge="صف بازبینی"
          />
          <PremiumMetricCard
            title="حساب‌های معلق یا مسدود"
            value="۱۴۳"
            description="محدودیت موقت"
            icon={UserX}
            variant="purple"
            badge="کنترل ریسک"
          />
        </div>

      {/* ─── Filter & Search Bar ─── */}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Premium Users Table ─── */}
      <Card variant="default" className="overflow-hidden border border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-4 px-6">عضو / هویت</th>
                <th className="py-4 px-4">نقش و مسئولیت</th>
                <th className="py-4 px-4">طرح و اشتراک فعال</th>
                <th className="py-4 px-4">وضعیت حساب</th>
                <th className="py-4 px-4">آخرین فعالیت</th>
                <th className="py-4 px-6 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    {/* User & Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                          {u.avatarInitial}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">{u.fullName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{u.mobile}</span>
                            <span>•</span>
                            <span>{u.id}</span>
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

                    {/* Last Activity */}
                    <td className="py-4 px-4 text-xs text-muted-foreground font-mono">
                      {u.lastActivity}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground">
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground">
                          <Edit3 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-destructive">
                          <Ban className="size-4" />
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
    </DashboardAppShell>
  )
}
