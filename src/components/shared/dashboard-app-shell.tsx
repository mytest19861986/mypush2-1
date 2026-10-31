'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Briefcase,
  CreditCard,
  Wallet,
  ShoppingBag,
  MessageSquareText,
  Shield,
  BarChart3,
  Building2,
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldPlus,
  Menu,
  X,
  LogOut,
  CheckCheck,
  Check,
  RefreshCw,
  AlertCircle,
  RotateCw,
  Info,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { getAdminDashboardNavForUser } from '@/config/dashboard-nav'
import { AdminRoute } from '@/components/guards/AdminRoute'
import { TehranClock } from '@/components/shared/tehran-clock'

interface DashboardAppShellProps {
  children: React.ReactNode
  activeMenu?: string
  requireAdmin?: boolean
}

export function DashboardAppShell({
  children,
  activeMenu = 'dashboard',
  requireAdmin = true,
}: DashboardAppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAll,
    error: notifError,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    reset: resetNotifications,
  } = useNotificationStore()

  // Initial unread count fetch when authenticated
  React.useEffect(() => {
    if (user?.id) {
      void fetchUnreadCount()
    }
  }, [user?.id, fetchUnreadCount])

  // Fetch full notifications whenever popover opens
  const handlePopoverChange = (open: boolean) => {
    setPopoverOpen(open)
    if (open) {
      void fetchNotifications(1, 20)
      void fetchUnreadCount()
    }
  }

  const displayName = user?.profile?.firstName && user?.profile?.lastName
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : (user?.profile?.firstName || 'مدیر کل سیستم')

  const roleTitle = (user as any)?.roles?.[0] || 'SUPER_ADMIN'

  const profileHref = ((user as any)?.roles?.includes('SUPER_ADMIN') || (user as any)?.roles?.includes('ADMIN') || (user as any)?.role === 'SUPER_ADMIN' || (user as any)?.role === 'ADMIN')
    ? '/admin-profile-premium-preview'
    : ((user as any)?.roles?.includes('DOCTOR') || (user as any)?.role === 'DOCTOR')
      ? '/doctor/profile'
      : ((user as any)?.roles?.includes('SALES_PARTNER') || (user as any)?.roles?.includes('AGENT') || (user as any)?.role === 'SALES_PARTNER' || (user as any)?.role === 'AGENT')
        ? '/agent/profile'
        : '/user/profile'

  const userInitials = user?.profile?.firstName
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2) || 'م‌س'

  const handleLogout = async () => {
    resetNotifications()
    try {
      await logout({ redirectTo: '/auth/login', callApi: true })
    } catch {
      // Fallback in case of timeout or unhandled exception
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        document.cookie = 'accessToken=; path=/; max-age=0'
        document.cookie = 'refreshToken=; path=/; max-age=0'
        window.location.href = '/auth/login'
      }
    }
  }

  const navItems = getAdminDashboardNavForUser(user)

  // Rule 5: Exactly ONE single item active per route
  const activeNavItem = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => {
      const demoAlias = item.href.replace('/admin', '') || '/dashboard'
      return (
        pathname === item.href ||
        pathname?.startsWith(item.href + '/') ||
        pathname === demoAlias ||
        pathname?.startsWith(demoAlias + '/')
      )
    })

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-5 space-y-6">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#0D5C58] to-[#12827B] text-white flex items-center justify-center shadow-sm">
              <ShieldPlus className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">حامی‌کارت</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none">همراه سلامت، برای همه</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="بستن منو"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation Items - Production Contract 12 items with Premium Style */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNavItem?.href === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0D5C58] to-[#12827B] text-white shadow-sm ring-1 ring-[#0D5C58]/30 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`size-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0D5C58]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Bottom User & Logout Controls (Mission 551-Demo-B4-FIX2) */}
      <div className="p-3 m-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center gap-3 px-1">
          <div className="size-9 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs font-bold text-slate-800 truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-[10px] text-emerald-600 font-mono font-medium truncate">
              {roleTitle}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false)
            void handleLogout()
          }}
          className="w-full justify-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50/80 border-red-200/80 rounded-xl py-2 transition-all cursor-pointer shadow-2xs"
          data-testid="sidebar-logout-button"
        >
          <LogOut className="size-3.5" />
          <span>خروج از حساب</span>
        </Button>
      </div>
    </div>
  )

  const shellContent = (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex overflow-x-hidden w-full max-w-full" dir="rtl">
        {/* ─── Mobile Drawer Overlay & Sidebar ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* ─── Desktop Sidebar (Hidden on mobile <768px) ─── */}
      <aside className="w-64 bg-white border-l border-slate-200/80 hidden md:flex flex-col justify-between shrink-0 shadow-xs z-20 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Mobile Menu Button & Search Toggle */}
          <div className="flex items-center gap-2.5">
            {pathname?.startsWith('/admin/') && pathname !== '/admin/dashboard' && (
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/admin/dashboard" aria-label="بازگشت به داشبورد مدیریت">
                  <ArrowRight className="size-4" />
                  <span className="hidden sm:inline">بازگشت</span>
                </Link>
              </Button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden size-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="باز کردن منو"
            >
              <Menu className="size-5" />
            </button>

            {/* Right: Search Capsule (Hidden on small mobile, visible on desktop) */}
            <div className="relative w-full max-w-xs lg:max-w-md hidden md:block">
              <Search className="size-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در کاربران، مراکز، درخواست‌ها ..."
                className="w-full h-10 pe-10 ps-4 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58] transition-all"
              />
            </div>

            {/* Mobile Brand Name on top header */}
            <div className="md:hidden flex items-center gap-1.5">
              <div className="size-8 rounded-xl bg-[#0D5C58] text-white flex items-center justify-center shadow-2xs">
                <ShieldPlus className="size-4.5" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">حامی‌کارت</span>
            </div>
          </div>

          {/* Left: Alerts, Date, and User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-6 ms-auto">
            {/* Live Jalali Date & Time (Desktop only) */}
            <div className="hidden lg:flex flex-col text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-[#0D5C58]" />
                <TehranClock />
              </div>
            </div>

            {/* Notification Bell with Real Backend Integration (CMD-HAMI-115 Wave 3C) */}
            <Popover open={popoverOpen} onOpenChange={handlePopoverChange}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="size-9 sm:size-10 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative shrink-0 outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5C58]/20"
                  aria-label="اعلان‌ها"
                  data-testid="header-notification-bell"
                >
                  <Bell className="size-4 sm:size-4.5" />
                  {unreadCount > 0 && (
                    <span
                      data-testid="header-notification-badge"
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0D5C58] text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-84 sm:w-96 p-0 rounded-2xl shadow-xl border border-slate-200 bg-white text-right overflow-hidden"
                dir="rtl"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-[#0D5C58]" />
                    <span className="font-extrabold text-xs text-slate-900">اعلان‌ها و رویدادها</span>
                    {unreadCount > 0 && (
                      <Badge className="bg-[#EAF5F2] text-[#0D5C58] border-[#0D5C58]/20 text-[10px] font-bold px-1.5 py-0">
                        {unreadCount} خوانده نشده
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isMarkingAll}
                      onClick={() => void markAllAsRead()}
                      className="text-[11px] h-7 px-2 text-[#0D5C58] hover:text-[#0a4845] hover:bg-[#EAF5F2] font-semibold"
                    >
                      <CheckCheck className="size-3.5 me-1" />
                      خوانده شدن همه
                    </Button>
                  )}
                </div>

                {/* Body Content */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {isLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                      <RefreshCw className="size-5 animate-spin text-[#0D5C58]" />
                      <span className="text-xs font-medium">در حال دریافت اعلان‌ها...</span>
                    </div>
                  ) : notifError ? (
                    <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-2">
                      <AlertCircle className="size-5 text-rose-500" />
                      <span className="text-xs text-rose-600 font-medium">{notifError}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void fetchNotifications(1, 20)}
                        className="text-xs h-7 px-2 mt-1"
                      >
                        تلاش مجدد
                      </Button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Bell className="size-5 opacity-70" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">اعلانی وجود ندارد</p>
                        <p className="text-[11px] text-slate-400">پیام‌ها و رویدادهای جدید اینجا نمایش داده می‌شوند.</p>
                      </div>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 transition-colors flex items-start justify-between gap-3 ${
                          !item.read ? 'bg-[#EAF5F2]/25 hover:bg-[#EAF5F2]/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!item.read && (
                              <span className="size-2 rounded-full bg-[#0D5C58] shrink-0" />
                            )}
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                            {item.message}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => void markAsRead(item.id)}
                            className="size-7 rounded-lg text-slate-400 hover:text-[#0D5C58] hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
                            title="علامت‌گذاری به عنوان خوانده‌شده"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile Capsule Dropdown (Mission 551-Demo-B4-FIX2) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 sm:gap-3 ps-1.5 sm:ps-4 border-s border-slate-200/80 hover:opacity-90 transition-opacity cursor-pointer shrink-0 outline-none"
                  aria-label="منوی کاربر"
                >
                  <div className="size-9 sm:size-10 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-800">{displayName}</span>
                      <ChevronDown className="size-3.5 text-slate-400" />
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">{roleTitle}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border border-slate-200">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-900">{displayName}</span>
                    <span className="text-[11px] text-emerald-600 font-medium">{roleTitle}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem asChild>
                  <Link href={profileHref} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <Users className="size-4 text-slate-500" />
                    <span>پروفایل من</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>خروج از حساب</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page View Body */}
        <main className="p-4 sm:p-6 lg:p-10 flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="px-4 sm:px-8 py-5 border-t border-slate-200/70 bg-white/70 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">حامی‌کارت</span>
            <span>•</span>
            <span>همراه سلامت، برای همه</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-5">
            <a href="#" className="hover:text-slate-600 transition-colors">قوانین و مقررات</a>
            <a href="#" className="hover:text-slate-600 transition-colors">حریم خصوصی</a>
            <a href="#" className="hover:text-slate-600 transition-colors">تماس با ما</a>
            <span>© ۱۴۰۵ تمامی حقوق محفوظ است.</span>
          </div>
        </footer>
      </div>
    </div>
  )

  if (requireAdmin) {
    return <AdminRoute>{shellContent}</AdminRoute>
  }

  return shellContent
}
